"use client";

/**
 * WebGPU finishing pipeline — components/webgpu/WebGPUPostFx.tsx
 * ============================================================================
 * Replaces the WebGL EffectComposer chain when the canvas runs on WebGPU.
 * Same recipe, better parts (pipeline shape after Pascal's viewer,
 * github.com/pascalorg/editor, MIT):
 *
 *   scene pass  — colour + depth + view normals + albedo in ONE draw (MRT),
 *                 so AO and ink cost no extra geometry passes
 *   SSGI → AO   — three's screen-space GI node, used for its ambient
 *                 occlusion, then an edge-aware denoise. Smoother and more
 *                 stable than N8AO on WebGL.
 *   GI          — optional one-bounce indirect light from the same node
 *                 (WEBGPU_FX.giIntensity), denoised like the AO
 *   ink lines   — creases and silhouettes, see inkEdges.ts
 *   grade       — mild contrast around mid-grey + saturation, in scene
 *                 space, before tone mapping
 *   output      — the renderer's ACES tone map + sRGB, applied ONCE at the
 *                 end by the pipeline (outputColorTransform)
 *
 * Mounting this takes over R3F's render loop (useFrame priority 1); when it
 * unmounts R3F's own render resumes, so turning AO off just unmounts it.
 */

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RenderPipeline, type WebGPURenderer } from "three/webgpu";
import {
  diffuseColor, float, mix, mrt, normalView, output, packNormalToRGB, pass,
  sample, saturation, screenUV, smoothstep, uniform, unpackRGBToNormal, vec3, vec4,
} from "three/tsl";
import { ssgi } from "three/addons/tsl/display/SSGINode.js";
import { denoise } from "three/addons/tsl/display/DenoiseNode.js";
import { createEdgeDepthSampler, inkedEdges } from "./inkEdges";
import { markWebGPUFailed } from "@/lib/three/rendererBackend";

/* See inkEdges.ts — TSL typings lag the runtime. */
/* eslint-disable @typescript-eslint/no-explicit-any */

/** Every tunable in one place. Pipeline is rebuilt on mount, so a change
 *  here needs a reload. */
export const WEBGPU_FX = {
  ao: {
    sliceCount: 1,
    stepCount: 4,
    radius: 1,          // metres
    expFactor: 1.5,
    thickness: 0.5,
    backfaceLighting: 0.5,
    intensity: 1.5,
  },
  /** One-bounce indirect light: shadowed faces pick up a little of the colour
   *  of what faces them, which is most of the "soft, real room" look. Denoised
   *  like the AO. Kept modest because there is no temporal filtering: set to 0
   *  if it shimmers while the camera moves on a given machine. */
  giIntensity: 0.8,
  grade: { contrast: 1.05, saturation: 1.1 },
  ink: { color: "#2b2622", opacity: 0.35, radius: 1 },
};

export default function WebGPUPostFx() {
  const gl = useThree(s => s.gl);
  const scene = useThree(s => s.scene);
  const camera = useThree(s => s.camera);
  const hasSize = useThree(s => s.size.width >= 1 && s.size.height >= 1);
  const pipelineRef = useRef<RenderPipeline | null>(null);

  useEffect(() => {
    const renderer = gl as unknown as WebGPURenderer;
    if (!(renderer as any).isWebGPURenderer || !hasSize) return;

    const disposables: Array<{ dispose(): void }> = [];
    const giIntensity = WEBGPU_FX.giIntensity;
    let pipeline: RenderPipeline | null = null;

    try {
      const scenePass = pass(scene, camera);
      disposables.push(scenePass);
      scenePass.setMRT(mrt({
        output,
        diffuseColor,
        normal: packNormalToRGB(normalView),
      }));
      // 8 bits is plenty for normals and albedo and halves their bandwidth
      scenePass.getTexture("normal").type = THREE.UnsignedByteType;
      scenePass.getTexture("diffuseColor").type = THREE.UnsignedByteType;

      const color: any = scenePass.getTextureNode("output");
      const depth: any = scenePass.getTextureNode("depth");
      const normalTex: any = scenePass.getTextureNode("normal");
      const albedo: any = scenePass.getTextureNode("diffuseColor");
      const sceneNormal = sample((uv: any) => (unpackRGBToNormal as any)(normalTex.sample(uv)));
      const sampleDepth = createEdgeDepthSampler(depth, camera);

      // ── AO (+ optional GI) ──
      const giPass: any = ssgi(color, depth, sceneNormal, camera as any);
      disposables.push(giPass);
      const p = WEBGPU_FX.ao;
      giPass.sliceCount.value = p.sliceCount;
      giPass.stepCount.value = p.stepCount;
      giPass.radius.value = p.radius;
      giPass.expFactor.value = p.expFactor;
      giPass.thickness.value = p.thickness;
      giPass.backfaceLighting.value = p.backfaceLighting;
      giPass.aoIntensity.value = p.intensity;
      giPass.giIntensity.value = giIntensity;
      giPass.useLinearThickness.value = false;
      giPass.useScreenSpaceSampling.value = true;
      giPass.useTemporalFiltering = false;

      const aoRaw = giPass.getAONode();
      const aoDenoised: any = denoise(
        vec4(aoRaw.r, aoRaw.r, aoRaw.r, float(1)), depth, sceneNormal, camera,
      );
      disposables.push(aoDenoised);
      aoDenoised.index.value = 0;
      aoDenoised.radius.value = 4;
      // no AO on the far background
      const ao = mix(aoDenoised.r, float(1), smoothstep(float(0.9994), float(0.9998), sampleDepth(screenUV)));

      let rgb: any = color.rgb.mul(ao);
      if (giIntensity > 0) {
        // One bounce of indirect light, tinted by the surface it lands on.
        // Raw SSGI at one slice is speckled, so it goes through the same
        // edge-aware denoise as the AO before it is added.
        const giRaw = giPass.getGINode();
        const giDenoised: any = denoise(vec4(giRaw.rgb, float(1)), depth, sceneNormal, camera);
        disposables.push(giDenoised);
        giDenoised.radius.value = 6;
        rgb = rgb.add(albedo.rgb.mul(giDenoised.rgb));
      }

      // ── ink ──
      rgb = inkedEdges({
        sceneRgb: rgb,
        sampleDepth,
        normalTex,
        inkColor: uniform(new THREE.Color(WEBGPU_FX.ink.color)),
        radius: WEBGPU_FX.ink.radius,
        opacity: float(WEBGPU_FX.ink.opacity),
      });

      // ── grade (scene-referred, before the tone map) ──
      const g = WEBGPU_FX.grade;
      rgb = (saturation as any)(rgb.div(0.18).pow(vec3(g.contrast)).mul(0.18), g.saturation);

      pipeline = new RenderPipeline(renderer);
      pipeline.outputColorTransform = true;
      pipeline.outputNode = vec4(rgb, color.a);
      pipelineRef.current = pipeline;
    } catch (error) {
      // Render without post-FX rather than not at all.
      console.error("[webgpu] post-processing setup failed; rendering without it.", error);
      pipelineRef.current = null;
    }

    return () => {
      pipelineRef.current = null;
      pipeline?.dispose();
      for (const d of disposables) d.dispose();
    };
  }, [gl, scene, camera, hasSize]);

  // Priority 1: R3F stops its own render and this draws the frame.
  //
  // A frame that throws would otherwise throw again every frame and leave a
  // blank canvas. A few in a row means this browser's WebGPU cannot run the
  // scene: hand over to WebGL.
  const failures = useRef(0);
  useFrame(() => {
    try {
      const pipeline = pipelineRef.current;
      if (pipeline) pipeline.render();
      else gl.render(scene, camera);
      failures.current = 0;
    } catch (error) {
      failures.current += 1;
      if (failures.current === 1) console.error("[webgpu] frame failed", error);
      if (failures.current >= 3) markWebGPUFailed(error);
    }
  }, 1);

  return null;
}
