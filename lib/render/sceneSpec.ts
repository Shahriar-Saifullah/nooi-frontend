/**
 * Photo render scene description — lib/render/sceneSpec.ts
 * ============================================================================
 * A photo render is made on a GPU server by Blender, not in the browser. It
 * gets two things:
 *
 *   scene.glb   the whole scene as the GLB export makes it (walls, floors,
 *               furniture, trims, materials, textures)
 *   spec        what the GLB cannot carry well: the camera, the sun, the lamps
 *               that are switched on, and the output size
 *
 * Lights are read off the live scene rather than recomputed, so the render
 * is lit like the view the client is looking at: the time-of-day sun, and the
 * lamp pool exactly as LightingRig placed it. The fake lights that only exist
 * because a browser cannot bounce light (ambient, hemisphere, the fill and the
 * floor bounce) are left out on purpose — Blender bounces light for real.
 *
 * Coordinates are three.js's (Y up). The worker converts them the same way
 * its glTF importer converts the GLB, so the two line up.
 */

import * as THREE from "three";

export type RenderQuality = "standard" | "high";

export const QUALITY: Record<RenderQuality, { long: number; samples: number; label: string; minutes: string }> = {
  standard: { long: 1920, samples: 256, label: "Standard", minutes: "about 1 minute" },
  high: { long: 3840, samples: 512, label: "High (4K)", minutes: "2–3 minutes" },
};

type V3 = [number, number, number];

export interface RenderSpec {
  version: 1;
  width: number;
  height: number;
  samples: number;
  camera: { position: V3; quaternion: [number, number, number, number]; fovDeg: number };
  /** direction the sunlight comes FROM (unit vector), or null at night */
  sun: { direction: V3; color: string; intensity: number } | null;
  lamps: { position: V3; color: string; intensity: number; distance: number }[];
  /** the live view's environment strength — the sky's brightness in Blender */
  environment: number;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const r5 = (n: number) => Math.round(n * 1e5) / 1e5;
const v3 = (v: THREE.Vector3): V3 => [r3(v.x), r3(v.y), r3(v.z)];

/** The output size: the canvas's shape, with its long side at the quality's size. */
export function outputSize(aspect: number, quality: RenderQuality): { width: number; height: number } {
  const long = QUALITY[quality].long;
  const a = Number.isFinite(aspect) && aspect > 0 ? Math.min(3, Math.max(1 / 3, aspect)) : 16 / 9;
  // even numbers: some encoders (and the later video step) need them
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  return a >= 1 ? { width: long, height: even(long / a) } : { width: even(long * a), height: long };
}

export function buildRenderSpec(
  scene: THREE.Scene, camera: THREE.Camera, aspect: number, quality: RenderQuality,
): RenderSpec {
  scene.updateMatrixWorld(true);
  const { width, height } = outputSize(aspect, quality);

  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  camera.getWorldPosition(pos);
  camera.getWorldQuaternion(quat);
  const fovDeg = (camera as THREE.PerspectiveCamera).isPerspectiveCamera
    ? (camera as THREE.PerspectiveCamera).fov : 50;

  let sun: RenderSpec["sun"] = null;
  const lamps: RenderSpec["lamps"] = [];
  scene.traverse((o) => {
    if (!o.visible) return;
    const dl = o as THREE.DirectionalLight;
    // the sun is the one directional light that casts shadows; the fill and
    // bounce lights are browser stand-ins for bounced light
    if (dl.isDirectionalLight && dl.castShadow && dl.intensity > 0) {
      const from = dl.getWorldPosition(new THREE.Vector3());
      const to = dl.target.getWorldPosition(new THREE.Vector3());
      const dir = from.sub(to).normalize();
      if (dir.y > 0.02) sun = { direction: v3(dir), color: `#${dl.color.getHexString()}`, intensity: r3(dl.intensity) };
    }
    const pl = o as THREE.PointLight;
    if (pl.isPointLight && pl.intensity > 0) {
      lamps.push({
        position: v3(pl.getWorldPosition(new THREE.Vector3())),
        color: `#${pl.color.getHexString()}`,
        intensity: r3(pl.intensity),
        distance: r3(pl.distance),
      });
    }
  });

  return {
    version: 1,
    width, height,
    samples: QUALITY[quality].samples,
    camera: { position: v3(pos), quaternion: [r5(quat.x), r5(quat.y), r5(quat.z), r5(quat.w)], fovDeg: r3(fovDeg) },
    sun,
    lamps: lamps.slice(0, 64),
    environment: r3(scene.environmentIntensity ?? 1),
  };
}
