/**
 * Read a 3D model's materials — lib/export/modelFinish.ts
 * ============================================================================
 * Browser only. Loads a piece's .glb (already in the HTTP cache: the scene
 * loaded it) and works out its visible parts: each material's surface area,
 * its real colour (base colour × the average of its texture), and what it is
 * (finishParts.materialKind). Feeds the furniture list, so "Original colour"
 * becomes "Fabric - Beige, Wood - Walnut brown".
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { partColourName } from "./colourName";
import { materialKind, summariseParts, type FinishPart } from "./finishParts";

// same decoders the scene's loader (drei useGLTF) uses
const DRACO_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.5/";

let loader: GLTFLoader | null = null;
function getLoader(): GLTFLoader {
  if (loader) return loader;
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_PATH);
  loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader;
}

/** Average colour of a texture, sRGB 0–1, or null if it can't be read. */
function textureAverage(tex: THREE.Texture | null | undefined): [number, number, number] | null {
  const img = tex?.image as (CanvasImageSource & { width?: number; height?: number }) | undefined;
  if (!img || !img.width || !img.height) return null;
  try {
    const S = 24;
    const c = document.createElement("canvas");
    c.width = S; c.height = S;
    const g = c.getContext("2d", { willReadFrequently: true });
    if (!g) return null;
    g.drawImage(img, 0, 0, S, S);
    const d = g.getImageData(0, 0, S, S).data;
    let r = 0, gg = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;          // ignore cut-out pixels
      r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++;
    }
    return n ? [r / n / 255, gg / n / 255, b / n / 255] : null;
  } catch { return null; }
}

/** Surface area of a mesh (or one group of it), world units². */
function meshArea(mesh: THREE.Mesh, start = 0, count = Infinity): number {
  const geo = mesh.geometry as THREE.BufferGeometry;
  const pos = geo.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!pos) return 0;
  const idx = geo.getIndex();
  const total = idx ? idx.count : pos.count;
  const end = Math.min(total, start + count);
  const tris = Math.floor((end - start) / 3);
  // big meshes: sample triangles and scale up
  const step = Math.max(1, Math.floor(tris / 4000));
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3();
  let area = 0;
  for (let t = 0; t < tris; t += step) {
    const i = start + t * 3;
    const ia = idx ? idx.getX(i) : i, ib = idx ? idx.getX(i + 1) : i + 1, ic = idx ? idx.getX(i + 2) : i + 2;
    a.fromBufferAttribute(pos, ia).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(pos, ib).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(pos, ic).applyMatrix4(mesh.matrixWorld);
    area += ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() / 2;
  }
  return area * step;
}

function partOf(mat: THREE.Material, area: number): FinishPart | null {
  const m = mat as THREE.MeshStandardMaterial & THREE.MeshPhysicalMaterial;
  if (!m || area <= 0) return null;
  const base = m.color ? m.color.clone() : new THREE.Color(1, 1, 1);   // linear
  const avg = textureAverage(m.map);
  if (avg) base.multiply(new THREE.Color().setRGB(avg[0], avg[1], avg[2], THREE.SRGBColorSpace));
  const hex = `#${base.getHexString()}`;                                  // sRGB
  const material = materialKind({
    name: [m.name, m.map?.name, (m.map?.image as { src?: string } | undefined)?.src?.split("/").pop()]
      .filter(Boolean).join(" "),
    metalness: m.metalness ?? 0,
    roughness: m.roughness ?? 1,
    opacity: m.transparent ? (m.opacity ?? 1) : 1,
    transmission: m.transmission ?? 0,
    textured: !!avg,
    hex,
  });
  return { material, colour: { hex, name: partColourName(hex, material) }, share: area };
}

const cache = new Map<string, Promise<FinishPart[] | null>>();

/** A model's main parts (largest first), or null if it can't be read. */
export function modelFinish(url: string, timeoutMs = 15000): Promise<FinishPart[] | null> {
  const hit = cache.get(url);
  if (hit) return hit;
  const job = new Promise<FinishPart[] | null>(resolve => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    getLoader().load(url, gltf => {
      clearTimeout(timer);
      try {
        const parts: FinishPart[] = [];
        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse(o => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh || !mesh.visible) return;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          if (Array.isArray(mesh.material) && mesh.geometry.groups.length) {
            for (const g of mesh.geometry.groups) {
              const p = partOf(mats[g.materialIndex ?? 0], meshArea(mesh, g.start, g.count));
              if (p) parts.push(p);
            }
          } else {
            const p = partOf(mats[0], meshArea(mesh));
            if (p) parts.push(p);
          }
        });
        resolve(parts.length ? summariseParts(parts) : null);
      } catch { resolve(null); }
    }, undefined, () => { clearTimeout(timer); resolve(null); });
  });
  cache.set(url, job);
  return job;
}
