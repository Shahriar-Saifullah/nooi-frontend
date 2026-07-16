"use client";

/**
 * Furniture thumbnails — generated at runtime from the actual GLB models
 * ----------------------------------------------------------------------
 * One shared offscreen WebGL renderer produces a 160x160 PNG per model the
 * first time it's needed; results are cached in-memory and in localStorage
 * (keyed by catalog path) so subsequent loads are instant. Models missing on
 * disk get a colored-box thumbnail so the library never shows broken images.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { CatalogItem } from "@/lib/furniture/catalog";

const SIZE = 160;
const CACHE_PREFIX = "nooi-thumb-v1:";

let renderer: THREE.WebGLRenderer | null = null;
let loader: GLTFLoader | null = null;
const memCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function getRenderer(): THREE.WebGLRenderer {
  if (!renderer) {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: true, preserveDrawingBuffer: true,
    });
    renderer.setSize(SIZE, SIZE, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  return renderer;
}

function renderObjectToDataUrl(obj: THREE.Object3D): string {
  const scene = new THREE.Scene();
  scene.add(obj);

  // frame the object
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  obj.position.sub(center); // center at origin

  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const cam = new THREE.PerspectiveCamera(35, 1, 0.01, maxDim * 10);
  const dist = maxDim * 1.9;
  cam.position.set(dist * 0.8, dist * 0.65, dist * 0.9);
  cam.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(2, 4, 3);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.5);
  rim.position.set(-3, 2, -2);
  scene.add(rim);

  const r = getRenderer();
  r.render(scene, cam);
  const url = r.domElement.toDataURL("image/png");

  // dispose scene-local resources (materials/geometry belong to the clone)
  obj.traverse((n: any) => {
    if (n.isMesh) {
      n.geometry?.dispose?.();
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach((m: any) => m?.dispose?.());
    }
  });
  return url;
}

function fallbackBoxThumb(item: CatalogItem): string {
  const geo = new THREE.BoxGeometry(
    item.size.w / 100, item.size.h / 100, item.size.d / 100);
  const mat = new THREE.MeshStandardMaterial({
    color: item.color, roughness: 0.7,
  });
  return renderObjectToDataUrl(new THREE.Mesh(geo, mat));
}

export async function getThumbnail(item: CatalogItem): Promise<string> {
  const key = CACHE_PREFIX + item.path;
  const hit = memCache.get(key);
  if (hit) return hit;
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      memCache.set(key, stored);
      return stored;
    }
  } catch { /* storage unavailable — memory cache only */ }

  const pending = inflight.get(key);
  if (pending) return pending;

  const p = (async () => {
    let url: string;
    try {
      if (!loader) loader = new GLTFLoader();
      const gltf = await loader.loadAsync(item.path);
      url = renderObjectToDataUrl(gltf.scene);
    } catch {
      url = fallbackBoxThumb(item);   // model file missing → colored box
    }
    memCache.set(key, url);
    try { localStorage.setItem(key, url); } catch { /* quota — skip persist */ }
    inflight.delete(key);
    return url;
  })();
  inflight.set(key, p);
  return p;
}