/**
 * Wall texture loading + real-world tiling
 * -----------------------------------------
 * Loaded imperatively rather than with useTexture/useLoader on purpose: wall
 * faces are a dynamic, per-frame-variable set, and calling hooks inside that
 * loop would break the rules of hooks. A module-level cache keeps each image
 * decoded once no matter how many walls use it.
 *
 * Each wall face needs its OWN texture instance (repeat differs per wall size)
 * but they share the underlying image, so clones are cheap.
 */

import * as THREE from "three";
import type { WallSurface } from "./catalog";

const baseCache = new Map<string, THREE.Texture>();
const faceCache = new Map<string, { map: THREE.Texture; normalMap?: THREE.Texture }>();

/** Callbacks fired when a texture finishes decoding, so the scene can redraw. */
const listeners = new Set<() => void>();
export function onSurfaceTextureLoaded(fn: () => void): () => void {
  listeners.add(fn);
  // must return void, not Set.delete's boolean — React cleanup functions
  // are typed as () => void
  return () => { listeners.delete(fn); };
}

function loadBase(url: string): THREE.Texture {
  const hit = baseCache.get(url);
  if (hit) return hit;
  const tex = new THREE.TextureLoader().load(url, () => {
    listeners.forEach(fn => fn());
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  baseCache.set(url, tex);
  return tex;
}

/**
 * Textures for one wall face, tiled at real-world scale.
 * @param wallLenM  wall length in metres (the horizontal span of this face)
 * @param wallHeightM wall height in metres
 */
export function getFaceTextures(
  surface: WallSurface,
  wallLenM: number,
  wallHeightM: number,
): { map: THREE.Texture; normalMap?: THREE.Texture } {
  const key = `${surface.id}|${wallLenM.toFixed(2)}|${wallHeightM.toFixed(2)}`;
  const hit = faceCache.get(key);
  if (hit) return hit;

  const repeatX = Math.max(0.05, wallLenM / surface.tileSize.w);
  const repeatY = Math.max(0.05, wallHeightM / surface.tileSize.h);

  const map = loadBase(surface.map).clone();
  map.needsUpdate = true;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(repeatX, repeatY);

  let normalMap: THREE.Texture | undefined;
  if (surface.normalMap) {
    normalMap = loadBase(surface.normalMap).clone();
    normalMap.needsUpdate = true;
    normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
    // normal maps are linear data, not colour
    normalMap.colorSpace = THREE.NoColorSpace;
    normalMap.repeat.set(repeatX, repeatY);
  }

  const entry = { map, normalMap };
  faceCache.set(key, entry);
  return entry;
}