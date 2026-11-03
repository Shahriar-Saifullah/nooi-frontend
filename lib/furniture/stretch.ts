/**
 * Smart stretch — lib/furniture/stretch.ts
 * ============================================================================
 * Making a piece wider the way it would really be made wider:
 *
 *   repeat    sofas get another seat, bookshelves another bay — the arms and
 *             end panels keep their size and the middle section repeats
 *   stretch   tables and beds get a longer top — the legs and posts at the
 *             ends keep their thickness, only the middle lengthens
 *   scale     everything else just scales (lamps, decor, chairs…)
 *
 * It works on the ordinary 3D models we already have. The model is cut, along
 * its width (model X), into a left end, a middle and a right end. The cuts go
 * where the fewest triangles cross — the gaps between seat cushions, between
 * shelf bays, just inside a table's legs — so a repeated seat looks like a
 * seat. Triangles that do cross a cut are clipped exactly, so a long back
 * panel splits cleanly instead of being drawn in every copy.
 *
 * Depth and height still scale normally.
 */

import * as THREE from "three";
import type { CatalogItem } from "./catalog";

export type StretchMode = "repeat" | "stretch" | "scale";

/** How a kind of piece grows, and what a repeated section is called. */
export function stretchModeFor(cat: Pick<CatalogItem, "typeId" | "mountType" | "procedural" | "path"> | undefined): {
  mode: StretchMode; unit: string;
} {
  if (!cat || cat.procedural || !cat.path || (cat.mountType ?? "floor") !== "floor") return { mode: "scale", unit: "" };
  switch (cat.typeId) {
    case "sofa": return { mode: "repeat", unit: "seat" };
    case "bookshelf": return { mode: "repeat", unit: "bay" };
    case "wardrobe": case "tv-stand": case "sideboard": case "dresser": case "kitchen-island":
      return { mode: "repeat", unit: "section" };
    case "bed": case "dining-table": case "coffee-table": case "outdoor-table": case "side-table": case "bathtub":
      return { mode: "stretch", unit: "" };
    default: return { mode: "scale", unit: "" };
  }
}

/** Where the model is cut, in its own X units. */
export interface Cuts {
  x0: number; x1: number; c1: number; c2: number;
  /** what the middle does when the piece gets wider */
  how: "repeat" | "stretch";
  /** stretch cuts to use when the width doesn't reach a whole extra unit
   *  (a one-bay shelf's middle holds a post that must not get fat) */
  fallback?: Cuts | null;
}

/**
 * What the model looks like along X, in `bins` slabs: how many triangles
 * cross each slab boundary (fewer = a natural gap to cut at), and each slab's
 * cross-section extent (to tell a plain run of seats from an arm, a chaise or
 * a side table built into the model).
 */
export interface Profile {
  x0: number; x1: number;
  /** crossings[i]: triangles crossing the boundary at x0 + i/bins · width */
  crossings: number[];
  /** per slab: [yMin, yMax, zMin, zMax] of the geometry in it */
  extents?: [number, number, number, number][];
}

/**
 * Pick the two cuts.
 *
 * The middle section is what gets repeated (or stretched), so it must look
 * the same along its length — no arm, chaise or built-in side table inside —
 * and the cuts go where the fewest triangles cross.
 *
 * repeat:  the middle is one unit between two natural gaps (the seams
 *          between seat cushions, the dividers between bays), the shortest
 *          such unit nearest the centre. A model with no inner gaps (a
 *          one-bay shelf, a one-cushion sofa) falls back to `noGap`:
 *            "post-bay"  repeat [left post + bay], keeping the right post as
 *                        the end — a shelf gains bays with a post between
 *            "stretch"   lengthen the middle instead (a long single seat)
 * stretch: the longest uniform middle, so only the legs stay at the ends.
 *
 * Null when nothing qualifies — the piece then just scales.
 */
export function chooseCuts(
  prof: Profile, mode: "repeat" | "stretch", noGap: "post-bay" | "stretch" = "stretch",
): Cuts | null {
  const { crossings, x0, x1 } = prof;
  const bins = crossings.length;
  if (bins < 10 || !(x1 > x0)) return null;
  const at = (i: number) => x0 + ((x1 - x0) * i) / bins;
  const lo = Math.ceil(bins * 0.06), hi = bins - lo;
  const minMiddle = Math.ceil(bins * 0.1);

  // Narrow gaps (between cushions, between shelf bays) are exactly where we
  // cut, so they must not count as a change of shape: each slab takes the
  // union of its neighbours within ±1% of the width.
  const w = Math.max(1, Math.round(bins * 0.01));
  const extents = prof.extents?.map((_, k) => {
    const u: [number, number, number, number] = [Infinity, -Infinity, Infinity, -Infinity];
    for (let q = Math.max(0, k - w); q <= Math.min(bins - 1, k + w); q++) {
      const e = prof.extents![q];
      u[0] = Math.min(u[0], e[0]); u[1] = Math.max(u[1], e[1]);
      u[2] = Math.min(u[2], e[2]); u[3] = Math.max(u[3], e[3]);
    }
    return u;
  });
  // how far a slab may differ and still count as "the same", per axis
  let tolY = Infinity, tolZ = Infinity;
  if (extents) {
    const ys = extents.flatMap(e => [e[0], e[1]]).filter(Number.isFinite);
    const zs = extents.flatMap(e => [e[2], e[3]]).filter(Number.isFinite);
    tolY = Math.max(1e-6, (Math.max(...ys) - Math.min(...ys)) * 0.04);
    tolZ = Math.max(1e-6, (Math.max(...zs) - Math.min(...zs)) * 0.04);
  }
  const same = (a: number, b: number) => {
    if (!extents) return true;
    const p = extents[a], q = extents[b];
    if (!p || !q || !Number.isFinite(p[0]) || !Number.isFinite(q[0])) return false;
    return Math.abs(p[0] - q[0]) <= tolY && Math.abs(p[1] - q[1]) <= tolY
      && Math.abs(p[2] - q[2]) <= tolZ && Math.abs(p[3] - q[3]) <= tolZ;
  };
  /** every slab in [i, j) looks like slab i */
  const uniform = (i: number, j: number) => {
    for (let k = i + 1; k < j; k++) if (!same(i, k)) return false;
    return true;
  };

  const inner = crossings.slice(lo, hi + 1);
  const median = [...inner].sort((a, b) => a - b)[Math.floor(inner.length / 2)];
  const typical = median + 1;

  const longestUniform = (): Cuts | null => {
    let best: { i: number; j: number; cost: number } | null = null;
    for (let i = lo; i <= hi - minMiddle; i++) {
      for (let j = i + 1; j <= hi; j++) {
        if (!same(i, j - 1)) break;
        if (j - i < minMiddle) continue;
        const cost = (crossings[i] + crossings[j]) / typical + 0.6 * (1 - (j - i) / bins);
        if (!best || cost < best.cost) best = { i, j, cost };
      }
    }
    return best ? { x0, x1, c1: at(best.i), c2: at(best.j), how: "stretch" } : null;
  };
  if (mode === "stretch") return longestUniform();

  // natural gaps: clear dips in the crossing count
  const dips: number[] = [];
  for (let i = lo; i <= hi; i++) {
    const c = crossings[i];
    if (c > median * 0.85) continue;
    let isMin = true;
    for (let d = -2; d <= 2 && isMin; d++) {
      const n = crossings[i + d];
      if (d !== 0 && n !== undefined && n < c) isMin = false;
    }
    // one cut per gap: skip the rest of a flat-bottomed dip
    if (isMin && (dips.length === 0 || i - dips[dips.length - 1] > 2)) dips.push(i);
  }
  let best: { i: number; j: number; cost: number } | null = null;
  for (let a = 0; a < dips.length; a++) {
    for (let b = a + 1; b < dips.length; b++) {
      const i = dips[a], j = dips[b];
      if (j - i < minMiddle) continue;
      if (!uniform(i, j)) break;
      const centre = Math.abs((i + j) / 2 - bins / 2) / bins;
      const cost = (j - i) / bins + 0.3 * centre + 0.2 * (crossings[i] + crossings[j]) / typical;
      if (!best || cost < best.cost) best = { i, j, cost };
      break;                      // the next gap along is the unit; further ones are 2+ units
    }
  }
  if (best) return { x0, x1, c1: at(best.i), c2: at(best.j), how: "repeat" };

  if (noGap === "post-bay") {
    // the right post: from the right end inwards until the count settles
    // at the bay's level; repeat everything left of it
    const bayLike = (k: number) => Math.abs(crossings[k] - median) <= median * 0.1 + 1;
    let j = bins - 1;
    while (j > bins * 0.5 && !bayLike(j)) j--;
    if (j >= bins * 0.55 && j < bins - 1) return { x0, x1, c1: x0, c2: at(j + 1), how: "repeat", fallback: longestUniform() };
  }
  return longestUniform();
}

export interface Piece { region: "left" | "middle" | "right"; /** x scale */ k: number; /** where its region's start lands, metres from the piece's centre line */ start: number }

/**
 * Lay out the pieces for a target width.
 *   natural  the width the model would have with no stretching (metres)
 *   width    the width wanted (metres)
 * Returns null when plain scaling should be used (no change, or so narrow
 * the ends alone don't fit).
 */
export function planStretch(cuts: Cuts, natural: number, width: number, mode: "repeat" | "stretch" = cuts.how):
  { pieces: Piece[]; repeats: number } | null {
  const L = cuts.x1 - cuts.x0;
  if (!(L > 0) || !(natural > 0) || Math.abs(width / natural - 1) < 0.02) return null;
  const k0 = natural / L;                                  // the ends keep this scale
  const left = (cuts.c1 - cuts.x0) * k0;
  const right = (cuts.x1 - cuts.c2) * k0;
  const midNatural = (cuts.c2 - cuts.c1) * k0;
  const midWanted = width - left - right;
  if (midWanted < midNatural * 0.35) return null;          // too narrow: just scale

  const repeats = mode === "repeat" ? Math.max(1, Math.round(midWanted / midNatural)) : 1;
  // not a whole extra unit: lengthen between the posts instead
  if (mode === "repeat" && repeats === 1 && cuts.fallback) return planStretch(cuts.fallback, natural, width, "stretch");
  const kMid = midWanted / repeats / (cuts.c2 - cuts.c1);
  const pieces: Piece[] = [];
  let x = -width / 2;
  pieces.push({ region: "left", k: k0, start: x }); x += left;
  for (let i = 0; i < repeats; i++) { pieces.push({ region: "middle", k: kMid, start: x }); x += midWanted / repeats; }
  pieces.push({ region: "right", k: k0, start: x });
  return { pieces, repeats };
}

// ── reading and cutting models (three.js) ───────────────────────────────────

/** Each mesh in the root's own frame (the root's transform undone). */
function meshesIn(root: THREE.Object3D): { mesh: THREE.Mesh; m: THREE.Matrix4 }[] {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const out: { mesh: THREE.Mesh; m: THREE.Matrix4 }[] = [];
  root.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry?.getAttribute("position")) {
      out.push({ mesh, m: new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld) });
    }
  });
  return out;
}

function triangleIndices(geo: THREE.BufferGeometry): ArrayLike<number> {
  const idx = geo.getIndex();
  if (idx) return idx.array as ArrayLike<number>;
  const n = geo.getAttribute("position").count;
  return Array.from({ length: n }, (_, i) => i);
}

/** The model's profile along X (see chooseCuts). */
export function crossingProfile(root: THREE.Object3D, bins = 200): Profile | null {
  const meshes = meshesIn(root);
  let x0 = Infinity, x1 = -Infinity;
  const xs: Float32Array[] = [], ys: Float32Array[] = [], zs: Float32Array[] = [];
  const v = new THREE.Vector3();
  for (const { mesh, m } of meshes) {
    const pos = mesh.geometry.getAttribute("position");
    const ax = new Float32Array(pos.count), ay = new Float32Array(pos.count), az = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m);
      ax[i] = v.x; ay[i] = v.y; az[i] = v.z;
      if (v.x < x0) x0 = v.x;
      if (v.x > x1) x1 = v.x;
    }
    xs.push(ax); ys.push(ay); zs.push(az);
  }
  if (!(x1 > x0)) return null;
  const diff = new Float64Array(bins + 2);
  const toBin = (x: number) => ((x - x0) / (x1 - x0)) * bins;
  const extents: [number, number, number, number][] =
    Array.from({ length: bins }, () => [Infinity, -Infinity, Infinity, -Infinity]);
  meshes.forEach(({ mesh }, mi) => {
    const ix = triangleIndices(mesh.geometry), X = xs[mi], Y = ys[mi], Z = zs[mi];
    for (let t = 0; t + 2 < ix.length; t += 3) {
      const ia = ix[t], ib = ix[t + 1], ic = ix[t + 2];
      const a = X[ia], b = X[ib], c = X[ic];
      const bMin = toBin(Math.min(a, b, c)), bMax = toBin(Math.max(a, b, c));
      // boundaries strictly inside the triangle's x-extent
      const from = Math.floor(bMin) + 1;
      const to = Math.ceil(bMax) - 1;
      if (to >= from) { diff[Math.max(0, from)] += 1; diff[Math.min(bins, to) + 1] -= 1; }
      // the slabs it touches take its cross-section extent
      const yMin = Math.min(Y[ia], Y[ib], Y[ic]), yMax = Math.max(Y[ia], Y[ib], Y[ic]);
      const zMin = Math.min(Z[ia], Z[ib], Z[ic]), zMax = Math.max(Z[ia], Z[ib], Z[ic]);
      const s0 = Math.max(0, Math.min(bins - 1, Math.floor(bMin)));
      const s1 = Math.max(0, Math.min(bins - 1, Math.ceil(bMax) - 1));
      for (let k = s0; k <= s1; k++) {
        const e = extents[k];
        if (yMin < e[0]) e[0] = yMin;
        if (yMax > e[1]) e[1] = yMax;
        if (zMin < e[2]) e[2] = zMin;
        if (zMax > e[3]) e[3] = zMax;
      }
    }
  });
  const crossings: number[] = [];
  let run = 0;
  for (let i = 0; i < bins; i++) { run += diff[i]; crossings.push(run); }
  return { crossings, x0, x1, extents };
}

/**
 * A copy of the model holding only what lies between lo and hi on X (root
 * frame). Geometry is clipped exactly; materials and transforms are shared.
 */
export function cutRegion(root: THREE.Object3D, lo: number, hi: number): THREE.Object3D {
  const copy = root.clone(true);
  const src = meshesIn(root);
  const dst: THREE.Mesh[] = [];
  copy.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh && m.geometry?.getAttribute("position")) dst.push(m); });
  src.forEach(({ mesh, m }, i) => {
    const target = dst[i];
    if (!target) return;
    target.geometry = clipGeometry(mesh.geometry, m, lo, hi);
  });
  return copy;
}

/** Clip a geometry to lo ≤ x ≤ hi, x measured after `m`. Non-indexed out. */
export function clipGeometry(geo: THREE.BufferGeometry, m: THREE.Matrix4, lo: number, hi: number): THREE.BufferGeometry {
  const pos = geo.getAttribute("position");
  // every per-vertex attribute is carried through (position, normal, uv…)
  const names = Object.keys(geo.attributes);
  const attrs = names.map(n => geo.getAttribute(n));
  const sizes = attrs.map(a => a.itemSize);
  // x after the transform, per vertex
  const e = m.elements;
  const X = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) X[i] = e[0] * pos.getX(i) + e[4] * pos.getY(i) + e[8] * pos.getZ(i) + e[12];

  const ix = triangleIndices(geo);
  const groups = geo.groups.length ? geo.groups : [{ start: 0, count: ix.length, materialIndex: 0 }];
  const out: number[][] = attrs.map(() => []);
  const outGroups: { start: number; count: number; materialIndex: number }[] = [];
  let written = 0;

  type V = { x: number; vals: number[][] };
  const vert = (i: number): V => ({ x: X[i], vals: attrs.map((a, k) => {
    const r: number[] = [];
    for (let c = 0; c < sizes[k]; c++) r.push(a.getComponent(i, c));
    return r;
  }) });
  const lerp = (p: V, q: V, t: number): V => ({
    x: p.x + (q.x - p.x) * t,
    vals: p.vals.map((pv, k) => pv.map((c, j) => c + (q.vals[k][j] - c) * t)),
  });
  // Sutherland–Hodgman against one x-plane
  const clip = (poly: V[], keep: (x: number) => boolean, edge: number): V[] => {
    const res: V[] = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      const pin = keep(p.x), qin = keep(q.x);
      if (pin) res.push(p);
      if (pin !== qin) res.push(lerp(p, q, (edge - p.x) / (q.x - p.x)));
    }
    return res;
  };
  const emit = (v: V) => { v.vals.forEach((vals, k) => out[k].push(...vals)); };

  for (const g of groups) {
    const start = written;
    const end = Math.min(ix.length, g.start + g.count);
    for (let t = g.start; t + 2 < end; t += 3) {
      const a = ix[t], b = ix[t + 1], c = ix[t + 2];
      const xa = X[a], xb = X[b], xc = X[c];
      const mn = Math.min(xa, xb, xc), mx = Math.max(xa, xb, xc);
      if (mx < lo || mn > hi) continue;
      if (mn >= lo && mx <= hi) { emit(vert(a)); emit(vert(b)); emit(vert(c)); written += 3; continue; }
      let poly = [vert(a), vert(b), vert(c)];
      if (mn < lo) poly = clip(poly, x => x >= lo, lo);
      if (poly.length >= 3 && mx > hi) poly = clip(poly, x => x <= hi, hi);
      for (let i = 1; i + 1 < poly.length; i++) { emit(poly[0]); emit(poly[i]); emit(poly[i + 1]); written += 3; }
    }
    if (written > start) outGroups.push({ start, count: written - start, materialIndex: g.materialIndex ?? 0 });
  }

  const res = new THREE.BufferGeometry();
  names.forEach((n, k) => {
    const a = attrs[k] as THREE.BufferAttribute;
    const arr = new Float32Array(out[k]);
    if (n === "normal") {               // interpolated normals: unit length again
      for (let i = 0; i + 2 < arr.length; i += 3) {
        const l = Math.hypot(arr[i], arr[i + 1], arr[i + 2]) || 1;
        arr[i] /= l; arr[i + 1] /= l; arr[i + 2] /= l;
      }
    }
    res.setAttribute(n, new THREE.BufferAttribute(arr, a.itemSize));
  });
  outGroups.forEach(g => res.addGroup(g.start, g.count, g.materialIndex));
  res.computeBoundingBox();
  res.computeBoundingSphere();
  return res;
}

// ── per-model cache ─────────────────────────────────────────────────────────

const cutsCache = new WeakMap<THREE.Object3D, Map<string, Cuts | null>>();
const regionCache = new WeakMap<THREE.Object3D, Map<string, THREE.Object3D>>();

/** What a repeat-mode model with no inner gaps does instead: seats get a
 *  longer seat, everything else gains bays with a post between. */
export const noGapFor = (unit: string): "post-bay" | "stretch" => (unit === "seat" ? "stretch" : "post-bay");

/** A model's cuts for a mode (computed once per model). */
export function cutsFor(root: THREE.Object3D, mode: "repeat" | "stretch", noGap: "post-bay" | "stretch" = "stretch"): Cuts | null {
  let m = cutsCache.get(root);
  if (!m) { m = new Map(); cutsCache.set(root, m); }
  const key = `${mode}|${noGap}`;
  if (!m.has(key)) {
    const prof = crossingProfile(root);
    m.set(key, prof ? chooseCuts(prof, mode, noGap) : null);
  }
  return m.get(key) ?? null;
}

/** One cut-out region of a model, cached; callers clone it. */
export function regionOf(root: THREE.Object3D, cuts: Cuts, region: Piece["region"]): THREE.Object3D {
  let m = regionCache.get(root);
  if (!m) { m = new Map(); regionCache.set(root, m); }
  const key = `${region}|${cuts.c1}|${cuts.c2}`;
  let r = m.get(key);
  if (!r) {
    const [lo, hi] = region === "left" ? [-Infinity, cuts.c1] : region === "middle" ? [cuts.c1, cuts.c2] : [cuts.c2, Infinity];
    r = cutRegion(root, lo, hi);
    m.set(key, r);
  }
  return r;
}

// ── what the inspector shows ("3 seats → 4 seats") ──────────────────────────
// The scene measures the model; the panel only needs the end / middle split.

const shares = new Map<string, { left: number; middle: number; right: number; how: "repeat" | "stretch" }>();
const listeners = new Set<() => void>();
let version = 0;

export function publishShares(modelId: string, cuts: Cuts) {
  const L = cuts.x1 - cuts.x0;
  const s = { left: (cuts.c1 - cuts.x0) / L, middle: (cuts.c2 - cuts.c1) / L, right: (cuts.x1 - cuts.c2) / L, how: cuts.how };
  const prev = shares.get(modelId);
  if (prev && Math.abs(prev.middle - s.middle) < 1e-6) return;
  shares.set(modelId, s);
  version++;
  listeners.forEach(l => l());
}
export const getShares = (modelId: string) => shares.get(modelId);
export const subscribeShares = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const getSharesVersion = () => version;

/** How many repeated sections a width gives (1 = the model as it comes). */
export function repeatsFor(share: { left: number; middle: number; right: number }, natural: number, width: number): number {
  const mid = natural * share.middle;
  const wanted = width - natural * (share.left + share.right);
  if (mid <= 0 || wanted < mid * 0.35) return 1;
  return Math.max(1, Math.round(wanted / mid));
}
