/**
 * Wall texture loading + real-world tiling
 * -----------------------------------------
 * Loaded imperatively rather than with useTexture/useLoader on purpose: wall
 * faces are a dynamic, per-render-variable set, and calling hooks inside that
 * loop would break the rules of hooks. A module-level cache keeps each image
 * decoded once no matter how many walls use it.
 *
 * Each wall face needs its OWN texture instance (repeat differs per wall size)
 * but they share the underlying image, so clones are cheap.
 *
 * IMPORTANT: THREE.Texture.clone() copies `image` BY REFERENCE at clone time.
 * Cloning a texture that is still downloading captures `undefined`, and the
 * loader's completion only flags the ORIGINAL — the clone renders white
 * forever. So every clone is registered here and patched when the image lands.
 */

import * as THREE from "three";
import type { WallSurface } from "./catalog";

interface BaseEntry {
  tex: THREE.Texture;
  loaded: boolean;
  failed: boolean;
  clones: THREE.Texture[];
}

const baseCache = new Map<string, BaseEntry>();
const faceCache = new Map<string, { map: THREE.Texture; normalMap?: THREE.Texture }>();

/** Callbacks fired when a texture finishes decoding, so the scene can redraw. */
const listeners = new Set<() => void>();
export function onSurfaceTextureLoaded(fn: () => void): () => void {
  listeners.add(fn);
  // must return void, not Set.delete's boolean — React cleanup functions
  // are typed as () => void
  return () => { listeners.delete(fn); };
}

function baseEntry(url: string): BaseEntry {
  const hit = baseCache.get(url);
  if (hit) return hit;

  const entry: BaseEntry = {
    tex: null as unknown as THREE.Texture,
    loaded: false,
    failed: false,
    clones: [],
  };

  entry.tex = new THREE.TextureLoader().load(
    url,
    () => {
      entry.loaded = true;
      // hand the decoded image to every clone made while it was downloading
      for (const c of entry.clones) {
        c.image = entry.tex.image;
        c.needsUpdate = true;
      }
      listeners.forEach(fn => fn());
    },
    undefined,
    () => {
      entry.failed = true;
      console.error(
        `[surfaces] texture failed to load: ${url}\n` +
        `Check the file exists at public${url} and the name matches the catalog entry.`,
      );
    },
  );
  entry.tex.wrapS = entry.tex.wrapT = THREE.RepeatWrapping;
  entry.tex.colorSpace = THREE.SRGBColorSpace;

  baseCache.set(url, entry);
  return entry;
}

function cloneFor(url: string, repeatX: number, repeatY: number, srgb: boolean): THREE.Texture {
  const entry = baseEntry(url);
  const c = entry.tex.clone();
  c.wrapS = c.wrapT = THREE.RepeatWrapping;
  c.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  c.repeat.set(repeatX, repeatY);
  c.needsUpdate = true;
  if (!entry.loaded) {
    entry.clones.push(c);          // patched when the image arrives
  } else {
    c.image = entry.tex.image;     // already decoded — take it now
  }
  return c;
}

/**
 * Textures for one wall face, tiled at real-world scale.
 * @param wallLenM     wall length in metres (horizontal span of this face)
 * @param wallHeightM  wall height in metres
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

  const map = cloneFor(surface.map, repeatX, repeatY, true);
  const normalMap = surface.normalMap
    ? cloneFor(surface.normalMap, repeatX, repeatY, false)  // normals are data, not colour
    : undefined;

  const entry = { map, normalMap };
  faceCache.set(key, entry);
  return entry;
}

/**
 * Texture for a door leaf. Unlike walls, a door uses ONE texture stretched
 * across the leaf (repeat 1x1), so the base texture is returned directly —
 * no clone. Fewer moving parts, and nothing to go wrong while it downloads.
 */
export function getDoorTexture(url: string): THREE.Texture {
  return baseEntry(url).tex;
}