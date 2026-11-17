/**
 * Production 3D model — lib/production/model3d.ts
 * ============================================================================
 * Every board and worktop of the order as a box, in place in the room and
 * named by its part id, so a factory can load the exact approved kitchen into
 * its own software and click any panel to see which part it is.
 *
 *   OBJ + MTL   millimetres (what CAD imports expect)
 *   GLB         metres (the glTF standard), one node per part
 *
 * World axes follow the 3D view: Y up. (The plan drawing's Y is −Z here.)
 */

import { COUNTERTOPS, FRONT_FINISHES, type KitchenStyle } from "@/lib/kitchen/materials";
import { runToWorld, type KitchenOrderInput } from "./placement";
import type { Box, KitchenParts, PartRole } from "./parts";

interface Solid { id: string; mat: MatKey; run: string; box: Box }
type MatKey = "carcass" | "back" | "front" | "plinth" | "worktop";

const hex = (h: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h);
  const v = m ? parseInt(m[1], 16) : 0xcccccc;
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

function colours(style: KitchenStyle): Record<MatKey, [number, number, number]> {
  const front = style.front.startsWith("#") ? style.front : FRONT_FINISHES.find(f => f.id === style.front)?.swatch ?? "#dddddd";
  return {
    carcass: hex("#f4f4f2"), back: hex("#e2e2df"), front: hex(front), plinth: hex(front),
    worktop: hex(COUNTERTOPS.find(c => c.id === style.countertop)?.swatch ?? "#eeeeee"),
  };
}

const roleMat = (r: PartRole): MatKey => (r === "shelf" ? "carcass" : r);

function solids(k: KitchenParts): Solid[] {
  return [
    ...k.parts.map(p => ({ id: p.id, mat: roleMat(p.role), run: p.run, box: p.box })),
    ...k.worktops.map(w => ({ id: w.id, mat: "worktop" as const, run: w.run, box: w.box })),
  ];
}

/** OBJ (mm) and its MTL. */
export function toObj(input: KitchenOrderInput, k: KitchenParts, mtlName = "kitchen.mtl"): { obj: string; mtl: string } {
  const col = colours(input.style);
  const lines = [`# Nooi kitchen — order ${input.order.orderNo}`, "# units: millimetres, Y up", `mtllib ${mtlName}`];
  let v = 1;
  for (const s of solids(k)) {
    const run = input.runs.find(r => r.code === s.run);
    if (!run) continue;
    const { x0, x1, y0, y1, z0, z1 } = s.box;
    const corner = (x: number, y: number, z: number) => {
      const [wx, wz] = runToWorld(run, x / 1000, z / 1000);
      return `v ${(wx * 1000).toFixed(1)} ${y.toFixed(1)} ${(wz * 1000).toFixed(1)}`;
    };
    lines.push(`o ${s.id}`, `usemtl ${s.mat}`);
    lines.push(corner(x0, y0, z0), corner(x1, y0, z0), corner(x1, y1, z0), corner(x0, y1, z0),
      corner(x0, y0, z1), corner(x1, y0, z1), corner(x1, y1, z1), corner(x0, y1, z1));
    const f = (...i: number[]) => lines.push(`f ${i.map(j => j + v).join(" ")}`);
    // winding outward for a right-handed run frame (runs never mirror)
    f(0, 3, 2, 1); f(4, 5, 6, 7); f(0, 1, 5, 4); f(2, 3, 7, 6); f(1, 2, 6, 5); f(0, 4, 7, 3);
    v += 8;
  }
  const mtl = (Object.keys(col) as MatKey[]).map(m => `newmtl ${m}\nKd ${col[m].map(c => c.toFixed(3)).join(" ")}\nKa 0 0 0\nd 1\nillum 1\n`).join("\n");
  return { obj: lines.join("\n") + "\n", mtl };
}

/** Binary glTF: a shared unit cube per material, one scaled/rotated node per part. */
export function toGlb(input: KitchenOrderInput, k: KitchenParts): Uint8Array {
  const col = colours(input.style);
  const mats = Object.keys(col) as MatKey[];
  // unit cube, 24 vertices with flat normals
  const P: number[] = [], N: number[] = [], I: number[] = [];
  const faces: [number[], number[][]][] = [
    [[1, 0, 0], [[.5, -.5, -.5], [.5, .5, -.5], [.5, .5, .5], [.5, -.5, .5]]],
    [[-1, 0, 0], [[-.5, -.5, .5], [-.5, .5, .5], [-.5, .5, -.5], [-.5, -.5, -.5]]],
    [[0, 1, 0], [[-.5, .5, -.5], [-.5, .5, .5], [.5, .5, .5], [.5, .5, -.5]]],
    [[0, -1, 0], [[-.5, -.5, .5], [-.5, -.5, -.5], [.5, -.5, -.5], [.5, -.5, .5]]],
    [[0, 0, 1], [[-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]]],
    [[0, 0, -1], [[.5, -.5, -.5], [-.5, -.5, -.5], [-.5, .5, -.5], [.5, .5, -.5]]],
  ];
  faces.forEach(([n, vs], fi) => {
    vs.forEach(p => { P.push(...p); N.push(...n); });
    const b = fi * 4;
    I.push(b, b + 1, b + 2, b, b + 2, b + 3);
  });
  const pos = new Float32Array(P), nor = new Float32Array(N), idx = new Uint16Array(I);
  const bin = new Uint8Array(pos.byteLength + nor.byteLength + idx.byteLength + 2);
  bin.set(new Uint8Array(pos.buffer), 0);
  bin.set(new Uint8Array(nor.buffer), pos.byteLength);
  bin.set(new Uint8Array(idx.buffer), pos.byteLength + nor.byteLength);

  const nodes: object[] = [];
  for (const s of solids(k)) {
    const run = input.runs.find(r => r.code === s.run);
    if (!run) continue;
    const { x0, x1, y0, y1, z0, z1 } = s.box;
    const [cx, cz] = runToWorld(run, (x0 + x1) / 2000, (z0 + z1) / 2000);
    nodes.push({
      name: s.id, mesh: mats.indexOf(s.mat),
      translation: [cx, (y0 + y1) / 2000, cz],
      rotation: [0, Math.sin(run.rotation / 2), 0, Math.cos(run.rotation / 2)],
      scale: [Math.max(1e-4, (x1 - x0) / 1000), Math.max(1e-4, (y1 - y0) / 1000), Math.max(1e-4, (z1 - z0) / 1000)],
    });
  }
  const gltf = {
    asset: { version: "2.0", generator: "Nooi order pack" },
    scene: 0,
    scenes: [{ name: `Order ${input.order.orderNo}`, nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes: mats.map((m, i) => ({ name: m, primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: i }] })),
    materials: mats.map(m => ({ name: m, pbrMetallicRoughness: { baseColorFactor: [...col[m], 1], metallicFactor: 0, roughnessFactor: m === "worktop" ? 0.35 : 0.7 } })),
    buffers: [{ byteLength: bin.byteLength }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: pos.byteLength, target: 34962 },
      { buffer: 0, byteOffset: pos.byteLength, byteLength: nor.byteLength, target: 34962 },
      { buffer: 0, byteOffset: pos.byteLength + nor.byteLength, byteLength: idx.byteLength, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 24, type: "VEC3", min: [-.5, -.5, -.5], max: [.5, .5, .5] },
      { bufferView: 1, componentType: 5126, count: 24, type: "VEC3" },
      { bufferView: 2, componentType: 5123, count: 36, type: "SCALAR" },
    ],
  };
  let json = new TextEncoder().encode(JSON.stringify(gltf));
  const pad = (4 - (json.length % 4)) % 4;
  if (pad) { const j = new Uint8Array(json.length + pad); j.set(json); j.fill(0x20, json.length); json = j; }
  const binLen = bin.byteLength + ((4 - (bin.byteLength % 4)) % 4);
  const total = 12 + 8 + json.length + 8 + binLen;
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  dv.setUint32(12, json.length, true); dv.setUint32(16, 0x4e4f534a, true); out.set(json, 20);
  const o = 20 + json.length;
  dv.setUint32(o, binLen, true); dv.setUint32(o + 4, 0x004e4942, true); out.set(bin, o + 8);
  return out;
}
