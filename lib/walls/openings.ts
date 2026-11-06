/**
 * Doors and windows on walls — lib/walls/openings.ts
 * ============================================================================
 * Pure geometry behind "Edit doors & windows" (3D view). Units:
 *
 *   stored   opening x / y in ‰ of the plan image (0–1000), width in ‰ of the
 *            plan's larger side — what the detector returns and room_data saves
 *   walls    x / y in % of the plan (0–100), thickness in % of the larger side
 *   scene    metres, plan centred on the origin (the 3D world)
 *
 * Walls are drawn axis-aligned (dominant axis), so an opening is just an
 * interval along its wall's axis: [centre − width/2, centre + width/2].
 * A valid opening stays inside the wall's ends, clear of other openings on
 * the same wall, and clear of the spots where another wall meets this one
 * (a window across a partition was the reason this module exists).
 */

import { WALL_T_MIN, WALL_T_MAX } from "@/lib/placement/snap";
import type { WindowStyle, FrameFinish } from "./windowStyles";

export type OpeningType = "door" | "window";

export interface PlanOpening {
  type: OpeningType;
  wall: "horizontal" | "vertical";
  x: number; y: number;   // ‰ of image width / height
  width: number;          // ‰ of max(image w, h)
  wall_id?: string;       // "w<index>" into the walls array
  /** windows: how it's drawn (lib/walls/windowStyles); default "fixed" */
  style?: WindowStyle;
  /** windows: frame finish; default "wood" */
  frame?: FrameFinish;
}

export interface PlanWallLike { x1: number; y1: number; x2: number; y2: number; thickness: number }

/** The scene the plan is drawn into: metres along plan x and plan y. */
export interface PlanSize { totalW: number; totalD: number }

export interface WallLine {
  index: number;
  horiz: boolean;
  /** along-axis extent of the wall's centreline, scene metres */
  a0: number; a1: number;
  /** cross-axis position */
  c: number;
  /** drawn thickness, scene metres */
  t: number;
}

const maxDim = (s: PlanSize) => Math.max(s.totalW, s.totalD);
const px = (s: PlanSize, xPct: number) => (xPct / 100) * s.totalW - s.totalW / 2;
const pz = (s: PlanSize, yPct: number) => (yPct / 100) * s.totalD - s.totalD / 2;
const unPx = (s: PlanSize, x: number) => ((x + s.totalW / 2) / s.totalW) * 100;
const unPz = (s: PlanSize, z: number) => ((z + s.totalD / 2) / s.totalD) * 100;

/** Gap kept between neighbouring openings, and from wall ends / junctions. */
export const OPENING_GAP = 0.08;
export const MIN_OPENING_WIDTH = 0.4;   // metres (scene)

/** Stable key per opening — must match ThreeSceneV2's cut keys (door finishes use it). */
export function openingKey(op: PlanOpening): string {
  return op.wall_id
    ? `${op.wall_id}-${op.type}-${Math.round(op.x)}-${Math.round(op.y)}`
    : `${op.type}-${Math.round(op.x)}-${Math.round(op.y)}`;
}

export function wallLine(w: PlanWallLike, index: number, s: PlanSize): WallLine {
  const horiz = Math.abs(w.x2 - w.x1) >= Math.abs(w.y2 - w.y1);
  const t = Math.min(WALL_T_MAX, Math.max(WALL_T_MIN, (w.thickness / 100) * maxDim(s)));
  return horiz
    ? { index, horiz, a0: px(s, Math.min(w.x1, w.x2)), a1: px(s, Math.max(w.x1, w.x2)), c: pz(s, (w.y1 + w.y2) / 2), t }
    : { index, horiz, a0: pz(s, Math.min(w.y1, w.y2)), a1: pz(s, Math.max(w.y1, w.y2)), c: px(s, (w.x1 + w.x2) / 2), t };
}

/** Which wall an opening belongs to (same rules the renderer uses). */
export function wallIndexOf(op: PlanOpening, walls: PlanWallLike[], s: PlanSize): number {
  if (op.wall_id) {
    const n = parseInt(op.wall_id.replace(/\D/g, ""), 10);
    if (!Number.isNaN(n) && n >= 0 && n < walls.length) return n;
  }
  const horiz = op.wall === "horizontal";
  const ox = px(s, op.x / 10), oz = pz(s, op.y / 10);
  let idx = -1, best = Infinity;
  walls.forEach((w, i) => {
    const L = wallLine(w, i, s);
    if (L.horiz !== horiz) return;
    const d = Math.abs((horiz ? oz : ox) - L.c);
    if (d < best) { best = d; idx = i; }
  });
  return best > 0.6 ? -1 : idx;
}

/** An opening as an interval on its wall, scene metres. */
export function openingSpan(op: PlanOpening, s: PlanSize): { centre: number; half: number } {
  const centre = op.wall === "horizontal" ? px(s, op.x / 10) : pz(s, op.y / 10);
  return { centre, half: ((op.width / 1000) * maxDim(s)) / 2 };
}

/** Where other walls meet or cross this one: along-axis positions + their half thickness. */
export function junctions(line: WallLine, lines: WallLine[]): { at: number; half: number }[] {
  const out: { at: number; half: number }[] = [];
  for (const o of lines) {
    if (o.index === line.index || o.horiz === line.horiz) continue;
    // the other wall's cross position is where it would meet this one…
    const at = o.c;
    if (at < line.a0 - 1e-6 || at > line.a1 + 1e-6) continue;
    // …if it actually reaches this wall's line
    const reach = o.t / 2 + line.t / 2 + 0.05;
    if (line.c < o.a0 - reach || line.c > o.a1 + reach) continue;
    out.push({ at, half: o.t / 2 });
  }
  return out;
}

/**
 * The nearest valid centre to `wanted` for an opening of half-width `half` on
 * `line`, or null if there is no room for it on this wall at all.
 */
export function fitOpening(
  line: WallLine, wanted: number, half: number,
  others: { centre: number; half: number }[],
  meets: { at: number; half: number }[],
): number | null {
  const lo = line.a0 + line.t / 2 + OPENING_GAP + half;
  const hi = line.a1 - line.t / 2 - OPENING_GAP - half;
  if (lo > hi) return null;
  const blocked = (c: number) =>
    others.some(o => Math.abs(c - o.centre) < half + o.half + OPENING_GAP) ||
    meets.some(m => Math.abs(c - m.at) < half + m.half + OPENING_GAP);
  const start = Math.min(hi, Math.max(lo, wanted));
  if (!blocked(start)) return start;
  // search outwards in 1 cm steps for the nearest free spot
  for (let d = 0.01; d <= hi - lo + 0.01; d += 0.01) {
    for (const c of [start - d, start + d]) {
      if (c >= lo - 1e-9 && c <= hi + 1e-9 && !blocked(c)) return c;
    }
  }
  return null;
}

/** Back to stored units: an opening centred at `centre` on `line`, `widthM` wide. */
export function toPlanOpening(line: WallLine, centre: number, widthM: number, type: OpeningType, s: PlanSize): PlanOpening {
  const x = line.horiz ? unPx(s, centre) : unPx(s, line.c);
  const y = line.horiz ? unPz(s, line.c) : unPz(s, centre);
  return {
    type,
    wall: line.horiz ? "horizontal" : "vertical",
    x: Math.round(x * 10 * 100) / 100,
    y: Math.round(y * 10 * 100) / 100,
    width: Math.round((widthM / maxDim(s)) * 1000 * 100) / 100,
    wall_id: `w${line.index}`,
  };
}

/** Everything a move / resize needs about the other openings on the same wall. */
export function context(openings: PlanOpening[], skip: number | null, wallIndex: number, walls: PlanWallLike[], s: PlanSize) {
  const lines = walls.map((w, i) => wallLine(w, i, s));
  const line = lines[wallIndex];
  const others = openings
    .map((op, i) => ({ op, i }))
    .filter(({ op, i }) => i !== skip && wallIndexOf(op, walls, s) === wallIndex)
    .map(({ op }) => openingSpan(op, s));
  return { line, others, meets: line ? junctions(line, lines) : [] };
}

/**
 * Place (or move / resize) an opening. Returns the new stored opening, or null
 * when it can't fit on that wall.
 */
export function placeOpening(args: {
  openings: PlanOpening[]; walls: PlanWallLike[]; size: PlanSize;
  wallIndex: number; centre: number; widthM: number; type: OpeningType;
  /** the opening being moved / resized, so it doesn't block itself */
  skip?: number | null;
}): PlanOpening | null {
  const { line, others, meets } = context(args.openings, args.skip ?? null, args.wallIndex, args.walls, args.size);
  if (!line) return null;
  const widthM = Math.max(MIN_OPENING_WIDTH, args.widthM);
  const c = fitOpening(line, args.centre, widthM / 2, others, meets);
  if (c === null) return null;
  const placed = toPlanOpening(line, c, widthM, args.type, args.size);
  // a move / resize keeps the window's style and frame
  const prev = args.skip != null ? args.openings[args.skip] : undefined;
  if (prev?.style) placed.style = prev.style;
  if (prev?.frame) placed.frame = prev.frame;
  return placed;
}

/** After deleting wall `index`: drop its openings and renumber the rest. */
export function openingsAfterWallDelete(openings: PlanOpening[], walls: PlanWallLike[], index: number, s: PlanSize): PlanOpening[] {
  return openings
    .map(op => ({ op, wi: wallIndexOf(op, walls, s) }))
    .filter(({ wi }) => wi !== index)
    .map(({ op, wi }) => (wi > index ? { ...op, wall_id: `w${wi - 1}` } : wi >= 0 ? { ...op, wall_id: `w${wi}` } : op));
}
