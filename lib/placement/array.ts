/**
 * Array: repeat a piece — lib/placement/array.ts
 * ============================================================================
 * The "array" tool of design programs, for a room:
 *
 *   row      copies side by side (or front to back), a set gap apart:
 *            bar stools along a counter, a wall of shelving
 *   grid     rows × columns: office desks, waiting-room seats
 *   around   chairs evenly round a table, each facing it: round tables get a
 *            circle; rectangular ones get the long sides first, then the ends
 *
 * Pure geometry in scene metres. Each result is checked against walls, other
 * furniture and the rooms, so the preview can show which copies can't go.
 * Item axes (three.js, rotation about +Y): right = (cos r, −sin r), front =
 * (sin r, cos r) — a piece's front is its local +Z.
 */

import { hitsWall, overlaps, pointInPoly, type Footprint, type Poly, type WorldWall } from "./snap";

export interface Spot { x: number; z: number; rotation: number }
export interface Source { x: number; z: number; rotation: number; w: number; d: number }

export type RowDirection = "right" | "left" | "front" | "back";

const right = (r: number): [number, number] => [Math.cos(r), -Math.sin(r)];
const front = (r: number): [number, number] => [Math.sin(r), Math.cos(r)];

/** `count` pieces in a line including the source; returns the new ones. */
export function rowSpots(src: Source, count: number, gapM: number, dir: RowDirection): Spot[] {
  const sideways = dir === "right" || dir === "left";
  const [ux, uz] = sideways ? right(src.rotation) : front(src.rotation);
  const sign = dir === "right" || dir === "front" ? 1 : -1;
  const step = (sideways ? src.w : src.d) + gapM;
  const out: Spot[] = [];
  for (let i = 1; i < Math.max(1, Math.round(count)); i++) {
    out.push({ x: src.x + ux * step * i * sign, z: src.z + uz * step * i * sign, rotation: src.rotation });
  }
  return out;
}

/** rows × cols including the source (top-left); columns run to its right,
 *  rows go behind it. Returns the new ones. */
export function gridSpots(src: Source, rows: number, cols: number, gapXM: number, gapZM: number): Spot[] {
  const [rx, rz] = right(src.rotation);
  const [fx, fz] = front(src.rotation);
  const sx = src.w + gapXM, sz = src.d + gapZM;
  const out: Spot[] = [];
  for (let r = 0; r < Math.max(1, Math.round(rows)); r++) {
    for (let c = 0; c < Math.max(1, Math.round(cols)); c++) {
      if (r === 0 && c === 0) continue;
      out.push({ x: src.x + rx * sx * c - fx * sz * r, z: src.z + rz * sx * c - fz * sz * r, rotation: src.rotation });
    }
  }
  return out;
}

/** Facing the point (x, z): the rotation that turns a piece's front to it. */
export const facing = (fromX: number, fromZ: number, toX: number, toZ: number) =>
  Math.atan2(toX - fromX, toZ - fromZ);

/**
 * `count` chairs round a table (all of them; the source chair becomes the
 * first). Chairs sit partly tucked under the edge, like chairs at a table.
 */
export function aroundSpots(table: Source, chair: { w: number; d: number }, count: number, round: boolean): Spot[] {
  const n = Math.max(1, Math.round(count));
  const tuck = chair.d * 0.35;                     // centre this far out from the edge
  const spots: Spot[] = [];
  if (round) {
    const r = Math.max(table.w, table.d) / 2 + tuck;
    for (let i = 0; i < n; i++) {
      const a = table.rotation + (i / n) * Math.PI * 2;
      const x = table.x + Math.sin(a) * r, z = table.z + Math.cos(a) * r;
      spots.push({ x, z, rotation: facing(x, z, table.x, table.z) });
    }
    return spots;
  }
  // rectangle: along the long sides first; an end each once there are 6+
  // (or one end when the count is odd)
  const long = table.w >= table.d ? "x" : "z";
  const L = long === "x" ? table.w : table.d;      // long side length
  const S = long === "x" ? table.d : table.w;      // short side length
  let ends = n >= 6 ? 2 : 0;
  if ((n - ends) % 2 === 1) ends += ends === 2 ? -1 : 1;
  ends = Math.min(ends, n);
  const perSide = [Math.ceil((n - ends) / 2), Math.floor((n - ends) / 2)];
  const [ux, uz] = right(table.rotation), [vx, vz] = front(table.rotation);
  // in the table's frame: a = along its width (local x), b = along its depth (local z)
  const at = (a: number, b: number) => ({ x: table.x + ux * a + vx * b, z: table.z + uz * a + vz * b });
  const push = (a: number, b: number) => {
    const p = at(a, b);
    spots.push({ ...p, rotation: facing(p.x, p.z, table.x, table.z) });
  };
  [1, -1].forEach((side, k) => {
    const m = perSide[k];
    for (let i = 0; i < m; i++) {
      const t = (i + 0.5) / m * L - L / 2;
      const off = side * (S / 2 + tuck);
      if (long === "x") push(t, off); else push(off, t);
    }
  });
  for (let e = 0; e < ends; e++) {
    const off = (e === 0 ? 1 : -1) * (L / 2 + tuck);
    if (long === "x") push(off, 0); else push(0, off);
  }
  return spots;
}

/** Can a piece go here: clear of walls and other furniture, inside a room. */
export function spotProblem(
  f: Footprint, walls: WorldWall[], others: Footprint[], rooms: Poly[],
): "wall" | "furniture" | "outside" | null {
  if (hitsWall(f, walls)) return "wall";
  if (rooms.length && !rooms.some(p => pointInPoly(f.x, f.z, p))) return "outside";
  if (others.some(o => overlaps(f, o, 0.01))) return "furniture";
  return null;
}
