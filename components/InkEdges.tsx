"use client";

/**
 * Ink edges — components/InkEdges.tsx
 * ============================================================================
 * Draws thin lines where the surface folds (a crease: wall meets floor, the
 * edge of a table) or where one object stands in front of another (a
 * silhouette). This is most of what makes an architectural render look crisp
 * rather than soft, and it hides low-poly or slightly blurry edges.
 *
 * Idea after Pascal's viewer (github.com/pascalorg/editor, MIT), which does
 * this on WebGPU. This is a WebGL version as a `postprocessing` Effect:
 *
 *   - Depth: the SECOND difference of 1/depth across neighbouring pixels.
 *     Under perspective 1/depth changes linearly across any flat surface, even
 *     one seen at a steep angle, so planes give 0; a crease or silhouette does
 *     not. A first difference would ink every floor seen at a grazing angle.
 *   - Normals: from the composer's normal pass (enableNormalPass). Catches
 *     creases where depth is continuous, e.g. a wall meeting the floor.
 *
 * Lines fade out with distance so far geometry does not turn into hatching.
 */

import { forwardRef, useContext, useEffect, useMemo } from "react";
import * as THREE from "three";
import { BlendFunction, Effect, EffectAttribute } from "postprocessing";
import { EffectComposerContext } from "@react-three/postprocessing";

const fragmentShader = /* glsl */ `
uniform sampler2D normalBuffer;
uniform vec3 inkColor;
uniform float inkOpacity;
uniform float depthThreshold;
uniform float normalThreshold;
uniform float fadeStart;
uniform float fadeEnd;

float inkLinearZ(const in vec2 uv) {
  float d = readDepth(uv);
#ifdef PERSPECTIVE_CAMERA
  return -perspectiveDepthToViewZ(d, cameraNear, cameraFar);
#else
  return d * (cameraFar - cameraNear) + cameraNear;
#endif
}

vec3 inkNormal(const in vec2 uv) {
  return unpackRGBToNormal(texture2D(normalBuffer, uv).rgb);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  // background: no geometry, no ink
  if (depth >= 0.99999) { outputColor = inputColor; return; }

  vec2 t = texelSize;
  float zc = inkLinearZ(uv);
  float zl = inkLinearZ(uv - vec2(t.x, 0.0));
  float zr = inkLinearZ(uv + vec2(t.x, 0.0));
  float zd = inkLinearZ(uv - vec2(0.0, t.y));
  float zu = inkLinearZ(uv + vec2(0.0, t.y));

  // Second difference of 1/z, relative to 1/z. Under perspective, 1/z (not z)
  // is what varies linearly across a flat surface on screen, so any plane —
  // a floor at a grazing angle included — gives exactly 0 here. Creases and
  // silhouettes do not. Dividing by the centre value makes it scale-free.
  float ic = 1.0 / max(zc, 1e-4);
  float il = 1.0 / max(zl, 1e-4), ir = 1.0 / max(zr, 1e-4);
  float id = 1.0 / max(zd, 1e-4), iu = 1.0 / max(zu, 1e-4);
  float dd = (abs(il + ir - 2.0 * ic) + abs(id + iu - 2.0 * ic)) / ic;
  float depthEdge = smoothstep(depthThreshold, depthThreshold * 2.5, dd);

  vec3 nc = inkNormal(uv);
  float nd = (1.0 - dot(nc, inkNormal(uv + vec2(t.x, 0.0))))
           + (1.0 - dot(nc, inkNormal(uv + vec2(0.0, t.y))));
  float normalEdge = smoothstep(normalThreshold, normalThreshold * 2.5, nd);

  float edge = max(depthEdge, normalEdge);
  edge *= 1.0 - smoothstep(fadeStart, fadeEnd, zc);

  outputColor = vec4(mix(inputColor.rgb, inkColor, edge * inkOpacity), inputColor.a);
}
`;

class InkEdgesEffect extends Effect {
  constructor(normalBuffer: THREE.Texture | null) {
    super("InkEdgesEffect", fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ["normalBuffer", new THREE.Uniform(normalBuffer)],
        ["inkColor", new THREE.Uniform(new THREE.Color("#2b2622"))],
        ["inkOpacity", new THREE.Uniform(0.45)],
        // Tuned for room-scale scenes in metres. Raise to see fewer lines.
        ["depthThreshold", new THREE.Uniform(0.02)],
        ["normalThreshold", new THREE.Uniform(0.25)],
        // metres from the camera
        ["fadeStart", new THREE.Uniform(18)],
        ["fadeEnd", new THREE.Uniform(45)],
      ]),
    });
  }
}

export interface InkEdgesProps {
  color?: THREE.ColorRepresentation;
  /** 0 = off, 1 = solid lines. */
  opacity?: number;
}

const InkEdges = forwardRef<InkEdgesEffect, InkEdgesProps>(function InkEdges(
  { color = "#2b2622", opacity = 0.45 },
  ref,
) {
  const { normalPass } = useContext(EffectComposerContext);
  const normalTexture = normalPass?.texture ?? null;

  const effect = useMemo(() => new InkEdgesEffect(normalTexture), [normalTexture]);
  useEffect(() => () => effect.dispose(), [effect]);

  useEffect(() => {
    (effect.uniforms.get("inkColor")!.value as THREE.Color).set(color);
    effect.uniforms.get("inkOpacity")!.value = opacity;
  }, [effect, color, opacity]);

  // Without a normal pass the shader would sample an empty texture and ink
  // every pixel — render nothing rather than that.
  if (!normalTexture) return null;
  return <primitive ref={ref} object={effect} dispose={null} />;
});

export default InkEdges;
