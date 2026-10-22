"use client";

/**
 * Path-traced rendering — components/PathTracerLayer.tsx
 * ============================================================================
 * PROTOTYPE. Try this on one room before trusting it with a whole floor.
 *
 * What it is: the user's actual scene, rendered with real light transport —
 * bounced light, soft shadows, true reflections. It refines progressively: a
 * noisy image appears immediately and cleans up over a few seconds while the
 * camera is still, resetting whenever it moves.
 *
 * Why this and not AI: nothing is generated, so nothing can drift. The sofa
 * they placed is the sofa they see, every time, from every angle. That is the
 * whole reason for choosing this over another diffusion pass — the renders we
 * were getting kept turning a grey sectional into a brown leather armchair.
 *
 * What it will NOT look like: a photograph. It looks like an architectural
 * render, because that is what it is. For someone walking their own design,
 * that is the right trade; for a marketing image, the AI render still wins.
 *
 * Constraints, from the library's own documentation:
 *   - WebGL2 only.
 *   - MeshStandardMaterial and MeshPhysicalMaterial only. The scene already
 *     uses these throughout, which is why this is viable at all.
 *   - No instanced geometry, no interleaved buffers. GLB exports frequently
 *     use interleaved attributes, so the scene is de-interleaved first — see
 *     prepareScene below. Without that the BVH build fails on real models.
 */

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WebGLPathTracer } from "three-gpu-pathtracer";
import { deinterleaveGeometry } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export interface PathTracerStats {
  samples: number;
  /** Building the BVH. On a large plan this blocks for a second or two. */
  preparing: boolean;
  error: string | null;
}

interface Props {
  active: boolean;
  onStats?: (s: PathTracerStats) => void;
  /** Stop refining here. Past ~200 the difference stops being visible and the
   *  GPU is just warming the room. */
  maxSamples?: number;
  /** Bounces per ray. 3 is enough for interiors; 5+ is slower for little gain
   *  unless the room is mostly mirrors. */
  bounces?: number;
}

/**
 * Make the scene traceable.
 *
 * De-interleaves geometry, because the path tracer cannot read interleaved
 * attributes and most GLB exporters produce them. Returns a cleanup that
 * restores the originals — the raster path handles interleaved fine and it is
 * faster, so the swap is only for as long as tracing is on.
 */
function prepareScene(scene: THREE.Object3D): () => void {
  const swapped: Array<{ mesh: THREE.Mesh; original: THREE.BufferGeometry }> = [];
  const hidden: THREE.Object3D[] = [];
  const litCeilings: Array<{ mesh: THREE.Mesh; original: THREE.Material | THREE.Material[] }> = [];

  // The Lightformer environment was tuned as a subtle fill for the raster
  // view, where a directional light does the real work. Here it is one of only
  // two light sources, so it carries far more of the room.
  const sceneRoot = scene as THREE.Scene;
  const prevEnvIntensity = sceneRoot.environmentIntensity ?? 1;
  sceneRoot.environmentIntensity = 2.2;

  scene.traverse((o) => {
    // ContactShadows and other helpers are a fake. Real light transport
    // produces the shadow properly, and leaving the fake one in means a dark
    // smear under everything.
    if ((o.name === "nooi-noexport" || o.name === "nooi-ui") && o.visible) {
      o.visible = false;
      hidden.push(o);
      return;
    }

    const mesh = o as THREE.Mesh;
    if (!(mesh as any).isMesh || !mesh.geometry) return;

    // THE INTERIOR LIGHT.
    //
    // The scene's only real light is a directionalLight outside the building.
    // In raster that light passes through walls, so the room looks lit; a path
    // tracer respects the geometry, so the sun hits the roof and nothing
    // reaches inside. That is why the first traced frames came out nearly
    // black with only the lamp visible.
    //
    // Real interiors are lit from above. Turning the ceiling underside into an
    // emissive surface is how architectural renderers solve exactly this — it
    // gives soft, even light with no hard shadows, and because the room is
    // genuinely bright the tracer converges far faster: most of the grain was
    // rays searching for light that barely arrived.
    if (mesh.name === "nooi-ceiling") {
      litCeilings.push({ mesh, original: mesh.material });
      mesh.material = new THREE.MeshStandardMaterial({
        color: "#fcfbf9",
        // Warm, and bright enough to carry a room without blowing out the
        // walls directly beneath it.
        emissive: new THREE.Color("#fff4e2"),
        emissiveIntensity: 2.4,
        roughness: 1,
        side: THREE.DoubleSide,
      });
      return;
    }

    const attrs = mesh.geometry.attributes as Record<string, any>;
    const interleaved = Object.values(attrs).some(
      (a) => a && a.isInterleavedBufferAttribute,
    );
    if (!interleaved) return;

    try {
      const original = mesh.geometry;
      // deinterleaveGeometry MUTATES in place and returns void — it does not
      // hand back a new geometry. So clone first: mutating the original would
      // leave nothing to restore on exit, and the catalogue models are shared
      // between every instance of the same item in the scene.
      const flat = original.clone();
      deinterleaveGeometry(flat);
      mesh.geometry = flat;
      swapped.push({ mesh, original });
    } catch (err) {
      // A geometry that will not de-interleave is skipped rather than fatal:
      // one bad model should not take the whole render down with it.
      console.warn("[pathtracer] could not de-interleave a geometry:", err);
    }
  });

  return () => {
    sceneRoot.environmentIntensity = prevEnvIntensity;
    for (const { mesh, original } of litCeilings) {
      const lit = mesh.material;
      mesh.material = original;
      if (Array.isArray(lit)) lit.forEach(m => m.dispose());
      else lit.dispose();
    }
    for (const { mesh, original } of swapped) {
      const flat = mesh.geometry;
      mesh.geometry = original;
      flat.dispose();
    }
    for (const o of hidden) o.visible = true;
  };
}

/** Resolution while the camera is moving. The image is discarded on every
 *  move, so full-resolution tracing during a drag is wasted entirely. */
const MOVING_SCALE = 0.3;
/** Resolution once the camera settles and samples start accumulating. */
const STILL_SCALE = 1.0;
/** How long the camera must be still before switching up. Short enough to
 *  feel immediate, long enough not to thrash during a slow drag. */
const SETTLE_MS = 350;

export default function PathTracerLayer({
  active, onStats, maxSamples = 200, bounces = 3,
}: Props) {
  const { gl, scene, camera, size } = useThree();
  const tracer = useRef<WebGLPathTracer | null>(null);
  const restore = useRef<(() => void) | null>(null);
  const lastCam = useRef(new THREE.Matrix4());
  const reported = useRef(-1);
  const lastMove = useRef(0);
  const atFullScale = useRef(false);

  // ── Build / tear down ──────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    onStats?.({ samples: 0, preparing: true, error: null });

    // One frame's delay so the "preparing" state paints before the BVH build
    // blocks the main thread. Without it the UI freezes with no explanation.
    const id = requestAnimationFrame(() => {
      if (cancelled) return;
      try {
        restore.current = prepareScene(scene);

        const pt = new WebGLPathTracer(gl);
        pt.bounces = bounces;
        // Quarter resolution to begin with. Moving the camera resets the
        // image anyway, so tracing it at full size is work thrown away — this
        // is what makes dragging feel responsive instead of sluggish.
        pt.renderScale = MOVING_SCALE;
        // Tiles spread one sample across several frames, so the page stays
        // responsive on a large scene instead of locking up per sample.
        pt.tiles.set(2, 2);
        pt.setScene(scene, camera);
        tracer.current = pt;

        lastCam.current.copy(camera.matrixWorld);
        reported.current = -1;
        onStats?.({ samples: 0, preparing: false, error: null });
      } catch (err: any) {
        console.error("[pathtracer] setup failed:", err);
        restore.current?.();
        restore.current = null;
        onStats?.({
          samples: 0, preparing: false,
          error: err?.message ?? "This scene could not be path traced.",
        });
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      try { (tracer.current as any)?.dispose?.(); } catch { /* already gone */ }
      tracer.current = null;
      restore.current?.();
      restore.current = null;
      // Hand the canvas back to the raster path in a clean state.
      gl.setRenderTarget(null);
      gl.setScissorTest(false);
      gl.clear();
    };
    // Deliberately not re-running on camera/scene identity: those are stable
    // for the life of the Canvas, and rebuilding the BVH mid-session would
    // stall for seconds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, gl, bounces]);

  // ── Resize: the tracer owns the framebuffer while it is active ─────────
  useEffect(() => {
    if (!active || !tracer.current) return;
    try { tracer.current.updateCamera(); } catch { /* not ready yet */ }
  }, [active, size.width, size.height]);

  /**
   * Priority >= 1 takes the render loop away from R3F, so the path tracer
   * draws instead of the rasteriser. At priority 0 both would draw and the
   * result would flicker between them.
   */
  useFrame((state) => {
    const pt = tracer.current;
    if (!active || !pt) return;
    // on-demand canvas: keep sampling until the image has converged
    if (!atFullScale.current || Math.floor(pt.samples ?? 0) < maxSamples) state.invalidate();

    // Any camera movement invalidates every accumulated sample — the image
    // is an average over one viewpoint. updateCamera() restarts it.
    const now = performance.now();
    if (!lastCam.current.equals(camera.matrixWorld)) {
      lastCam.current.copy(camera.matrixWorld);
      lastMove.current = now;
      if (atFullScale.current) {
        // Drop back to the small image for the duration of the movement.
        pt.renderScale = MOVING_SCALE;
        atFullScale.current = false;
      }
      try { pt.updateCamera(); } catch { /* mid-rebuild */ }
    } else if (!atFullScale.current && now - lastMove.current > SETTLE_MS) {
      // Settled. Go to full resolution and start accumulating properly.
      pt.renderScale = STILL_SCALE;
      atFullScale.current = true;
      try { pt.updateCamera(); } catch { /* mid-rebuild */ }
    }

    const samples = Math.floor(pt.samples ?? 0);
    if (samples < maxSamples) {
      try {
        pt.renderSample();
      } catch (err: any) {
        console.error("[pathtracer] render failed:", err);
        onStats?.({ samples, preparing: false, error: "Rendering stopped." });
        tracer.current = null;
        return;
      }
    }

    // Report on whole-sample boundaries only — this runs 60 times a second and
    // a setState per frame would cost more than the tracing.
    if (samples !== reported.current) {
      reported.current = samples;
      onStats?.({ samples, preparing: false, error: null });
    }
  }, 1);

  return null;
}