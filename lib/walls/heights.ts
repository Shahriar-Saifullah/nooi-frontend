/**
 * Ceiling heights — lib/walls/heights.ts
 * ============================================================================
 * Every room has its own ceiling height (rooms[].height, metres — the same
 * field the "new project" form fills in). The 3D scene used to draw every wall
 * at a fixed 2.8 m; now:
 *
 *   a room's ceiling, ceiling lights and fans    → that room's height
 *   a wall                                        → the taller of the rooms
 *                                                   on its two sides
 *   anything outside every room                   → the default (2.8 m)
 *
 * Heights are real metres, which is also what the scene uses vertically.
 * Pure, so the scene and the tests share it.
 */

export const DEFAULT_CEILING_M = 2.8;
export const MIN_CEILING_M = 2.2;
export const MAX_CEILING_M = 8;

/** A stored height → metres, or null. Values over 20 are taken as cm. */
export function cleanCeiling(v: unknown): number | null {
  let n = typeof v === "string" ? parseFloat(v) : Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n > 20) n = n / 100;
  return Math.round(Math.max(MIN_CEILING_M, Math.min(MAX_CEILING_M, n)) * 100) / 100;
}

export type Poly = [number, number][];
export interface HeightRoom { poly: Poly; h: number }

export function pointInPoly(x: number, z: number, poly: Poly): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Ceiling height over a point: the room it is in (the tallest, if rooms overlap). */
export function heightAt(x: number, z: number, rooms: HeightRoom[], fallback = DEFAULT_CEILING_M): number {
  let best = -1;
  for (const r of rooms) if (r.h > best && pointInPoly(x, z, r.poly)) best = r.h;
  return best > 0 ? best : fallback;
}

export interface WallSeg { x1: number; z1: number; x2: number; z2: number; thickness: number; id?: string }

/** A wall's height: the tallest room touching either face. */
export function wallHeight(w: WallSeg, rooms: HeightRoom[], fallback = DEFAULT_CEILING_M): number {
  const horiz = Math.abs(w.x2 - w.x1) >= Math.abs(w.z2 - w.z1);
  const off = w.thickness / 2 + 0.15;
  let best = -1;
  for (const f of [0.2, 0.5, 0.8]) {
    const x = w.x1 + (w.x2 - w.x1) * f;
    const z = w.z1 + (w.z2 - w.z1) * f;
    for (const s of [-1, 1]) {
      const px = horiz ? x : x + s * off;
      const pz = horiz ? z + s * off : z;
      for (const r of rooms) if (r.h > best && pointInPoly(px, pz, r.poly)) best = r.h;
    }
  }
  return best > 0 ? best : fallback;
}

export interface SceneHeights {
  fallback: number;
  /** tallest ceiling anywhere — camera limits, drag planes */
  max: number;
  at: (x: number, z: number) => number;
  /** by wall key (wall.id ?? `wi${index}`) */
  wall: (key: string | undefined) => number;
}

export function buildHeights(rooms: HeightRoom[], walls: WallSeg[], fallback = DEFAULT_CEILING_M): SceneHeights {
  const byWall = new Map<string, number>();
  walls.forEach((w, i) => byWall.set(w.id ?? `wi${i}`, wallHeight(w, rooms, fallback)));
  const max = Math.max(fallback, ...rooms.map(r => r.h), ...byWall.values());
  return {
    fallback,
    max,
    at: (x, z) => heightAt(x, z, rooms, fallback),
    wall: key => (key && byWall.get(key)) || fallback,
  };
}

export const FLAT_HEIGHTS: SceneHeights = buildHeights([], [], DEFAULT_CEILING_M);
