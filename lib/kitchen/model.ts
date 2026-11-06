/**
 * Kitchen builder data & layout — lib/kitchen/model.ts
 * ============================================================================
 * A kitchen is a list of RUNS. A run is a row of modules (cabinets and
 * appliances) standing against one face of one wall, sharing a countertop
 * and plinth. Base modules can carry an upper above them: a wall cabinet or
 * a chimney hood. Tall modules (fridge, pantry, oven tower) go floor to the
 * top of the uppers and have nothing above.
 *
 * Sizes are real metres (the scene draws furniture at real size); positions
 * along a wall are scene metres. Pure functions: placement rules here, the
 * 3D build in build.ts, the editing UI in components/KitchenPanel.
 *
 * Orientation: a run's local +X runs to the right as you stand in the room
 * facing the wall; its fronts face the room (local +Z).
 */

import { wallLine, wallIndexOf, openingSpan, type PlanOpening, type PlanWallLike, type PlanSize, type WallLine } from "@/lib/walls/openings";
import type { KitchenStyle } from "./materials";

export type ModuleKind =
  | "base-door" | "drawer-base" | "sink-base" | "dishwasher" | "cooktop-gas" | "cooktop-induction"
  | "oven-tower" | "tall-pantry" | "fridge-single";
export type UpperKind = "cabinet" | "hood" | null;

export interface KitchenModule { id: string; kind: ModuleKind; width: number; upper: UpperKind }
export interface KitchenRun {
  id: string;
  /** the wall, by key (stable) with its index as a fallback */
  wall: { index: number; key: string };
  /** which face: +1 / −1 along the wall's normal (+z for a horizontal wall, +x for a vertical one) */
  side: 1 | -1;
  /** along-wall position (scene metres) of the run's left end */
  start: number;
  modules: KitchenModule[];
}
export interface KitchenData { runs: KitchenRun[]; style: KitchenStyle }

export const BASE_DEPTH = 0.6;           // carcass depth, m
export const COUNTER_OVERHANG = 0.02;
export const UPPER_DEPTH = 0.35;
export const PLINTH = 0.1;
export const CARCASS = 0.8;
export const COUNTER_TOP = PLINTH + CARCASS + 0.02;      // 0.92 m
export const TALL_TOP = PLINTH + 2.07;                    // 2.17 m
export const UPPER_BOTTOM = TALL_TOP - 0.762;             // uppers' tops line up with tall units

export const MODULES: Record<ModuleKind, { label: string; width: number; widths: number[]; tall: boolean; upper: UpperKind; group: "Cabinets" | "Appliances" }> = {
  "base-door":         { label: "Base cabinet",     width: 0.6,  widths: [0.3, 0.4, 0.45, 0.5, 0.6, 0.8, 0.9, 1.0], tall: false, upper: "cabinet", group: "Cabinets" },
  "drawer-base":       { label: "Drawer cabinet",   width: 0.6,  widths: [0.3, 0.4, 0.45, 0.5, 0.6, 0.8, 0.9],      tall: false, upper: "cabinet", group: "Cabinets" },
  "tall-pantry":       { label: "Tall pantry",      width: 0.6,  widths: [0.4, 0.45, 0.5, 0.6],                     tall: true,  upper: null,      group: "Cabinets" },
  "sink-base":         { label: "Sink cabinet",     width: 0.8,  widths: [0.6, 0.8, 0.9, 1.0, 1.2],                 tall: false, upper: "cabinet", group: "Appliances" },
  "dishwasher":        { label: "Dishwasher",       width: 0.6,  widths: [0.45, 0.6],                               tall: false, upper: "cabinet", group: "Appliances" },
  "cooktop-gas":       { label: "Gas cooktop",      width: 0.75, widths: [0.6, 0.75, 0.9],                          tall: false, upper: "hood",    group: "Appliances" },
  "cooktop-induction": { label: "Induction cooktop",width: 0.6,  widths: [0.6, 0.75, 0.9],                          tall: false, upper: "hood",    group: "Appliances" },
  "oven-tower":        { label: "Oven tower",       width: 0.6,  widths: [0.6],                                     tall: true,  upper: null,      group: "Appliances" },
  "fridge-single":     { label: "Fridge",           width: 0.76, widths: [0.6, 0.76, 0.9],                          tall: true,  upper: null,      group: "Appliances" },
};

export const runWidth = (r: KitchenRun) => r.modules.reduce((a, m) => a + m.width, 0);

/** The wall a run stands on. */
export function runWallIndex(r: KitchenRun, walls: (PlanWallLike & { id?: string })[]): number {
  const byKey = walls.findIndex((w, i) => (w.id ?? `wi${i}`) === r.wall.key);
  if (byKey >= 0) return byKey;
  return r.wall.index < walls.length ? r.wall.index : -1;
}

export interface RunFrame {
  line: WallLine;
  /** the wall face the run backs onto, cross-axis coordinate */
  face: number;
  /** unit along-wall direction of the run's +X (±1) */
  dir: 1 | -1;
  /** world (scene) rotation that turns the run's +Z to face the room */
  rotation: number;
  /** world x/z of along-coordinate `a` at depth `d` out from the face */
  at: (a: number, d: number) => [number, number];
}

export function runFrame(line: WallLine, side: 1 | -1): RunFrame {
  const face = line.c + side * (line.t / 2);
  // run +Z = the face normal (into the room)
  const nx = line.horiz ? 0 : side, nz = line.horiz ? side : 0;
  const rotation = Math.atan2(nx, nz);
  // run +X = (cos r, −sin r); along the wall axis that is ±1
  const rx = Math.cos(rotation), rz = -Math.sin(rotation);
  const dir = (line.horiz ? Math.sign(rx) : Math.sign(rz)) as 1 | -1;
  const at = (a: number, d: number): [number, number] =>
    line.horiz ? [a, face + side * d] : [face + side * d, a];
  return { line, face, dir, rotation, at };
}

/** Along-wall interval [lo, hi] a run occupies. */
export function runSpan(r: KitchenRun, f: RunFrame): [number, number] {
  const end = r.start + f.dir * runWidth(r);
  return [Math.min(r.start, end), Math.max(r.start, end)];
}

/**
 * The free stretch of this wall face around `along`: bounded by walls that
 * meet this face on the room side, by doorways (for anything standing on the
 * floor), and by other runs (their depth reaches across a corner).
 */
export function freeInterval(args: {
  walls: (PlanWallLike & { id?: string })[]; size: PlanSize; openings: PlanOpening[];
  runs: KitchenRun[]; wallIndex: number; side: 1 | -1; along: number; skipRunId?: string;
}): [number, number] | null {
  const lines = args.walls.map((w, i) => wallLine(w, i, args.size));
  const line = lines[args.wallIndex];
  if (!line) return null;
  const face = line.c + args.side * line.t / 2;
  let lo = line.a0 - line.t / 2, hi = line.a1 + line.t / 2;

  const block = (from: number, to: number) => {
    if (to <= args.along) lo = Math.max(lo, to);
    else if (from >= args.along) hi = Math.min(hi, from);
    else { lo = hi = args.along; }        // the point itself is blocked
  };

  // walls that meet this face on the room side
  for (const o of lines) {
    if (o.index === line.index || o.horiz === line.horiz) continue;
    const reachesRoom = args.side > 0 ? o.a1 > face + 0.01 : o.a0 < face - 0.01;
    const touches = o.a0 <= face + 0.05 && o.a1 >= face - 0.05;
    if (!reachesRoom || !touches) continue;
    if (o.c < line.a0 - line.t || o.c > line.a1 + line.t) continue;
    block(o.c - o.t / 2, o.c + o.t / 2);
  }
  // doorways in this wall
  args.openings.forEach(op => {
    if (op.type !== "door" || wallIndexOf(op, args.walls, args.size) !== line.index) return;
    const { centre, half } = openingSpan(op, args.size);
    block(centre - half - 0.05, centre + half + 0.05);
  });
  // other runs: on this face, or across the corner where their depth reaches
  for (const r of args.runs) {
    if (r.id === args.skipRunId) continue;
    const wi = runWallIndex(r, args.walls);
    const ol = lines[wi];
    if (!ol) continue;
    const f = runFrame(ol, r.side);
    const [a, b] = runSpan(r, f);
    if (wi === line.index && r.side === args.side) { block(a, b); continue; }
    if (ol.horiz === line.horiz) continue;
    // a perpendicular run: its footprint in this wall's along axis is its
    // depth out from its own face, if its run touches this face
    const depthEnd = f.face + r.side * (BASE_DEPTH + COUNTER_OVERHANG);
    const across: [number, number] = [Math.min(f.face, depthEnd), Math.max(f.face, depthEnd)];
    // our strip: this face out to our own depth
    const ours: [number, number] = [Math.min(face, face + args.side * (BASE_DEPTH + COUNTER_OVERHANG)), Math.max(face, face + args.side * (BASE_DEPTH + COUNTER_OVERHANG))];
    if (a < ours[1] && b > ours[0]) block(across[0], across[1]);
  }
  return hi - lo > 0.01 ? [lo, hi] : null;
}

/** Windows on this wall face (for tall units and uppers), as along-wall intervals. */
export function windowSpans(walls: PlanWallLike[], size: PlanSize, openings: PlanOpening[], wallIndex: number): [number, number][] {
  return openings
    .filter(op => op.type === "window" && wallIndexOf(op, walls, size) === wallIndex)
    .map(op => { const { centre, half } = openingSpan(op, size); return [centre - half, centre + half] as [number, number]; });
}

const overlaps = (a: [number, number], b: [number, number]) => a[0] < b[1] - 1e-6 && b[0] < a[1] - 1e-6;

/** Each module's along-wall interval. */
export function moduleSpans(r: KitchenRun, f: RunFrame): [number, number][] {
  let x = 0;
  return r.modules.map(m => {
    const a = r.start + f.dir * x, b = r.start + f.dir * (x + m.width);
    x += m.width;
    return [Math.min(a, b), Math.max(a, b)] as [number, number];
  });
}

/** Does this run fit its wall: inside the free stretch, tall units clear of windows. */
export function runProblem(args: {
  run: KitchenRun; walls: (PlanWallLike & { id?: string })[]; size: PlanSize; openings: PlanOpening[]; runs: KitchenRun[];
}): string | null {
  const wi = runWallIndex(args.run, args.walls);
  if (wi < 0) return "That wall no longer exists.";
  const line = wallLine(args.walls[wi], wi, args.size);
  const f = runFrame(line, args.run.side);
  const [a, b] = runSpan(args.run, f);
  const free = freeInterval({ ...args, wallIndex: wi, side: args.run.side, along: (a + b) / 2, skipRunId: args.run.id });
  if (!free || a < free[0] - 1e-3 || b > free[1] + 1e-3) return "Not enough room on this wall — it would run into a wall, a doorway or other cabinets.";
  const wins = windowSpans(args.walls, args.size, args.openings, wi);
  const spans = moduleSpans(args.run, f);
  const blocked = args.run.modules.findIndex((m, i) => MODULES[m.kind].tall && wins.some(w => overlaps(w, spans[i])));
  if (blocked >= 0) return `The ${MODULES[args.run.modules[blocked].kind].label.toLowerCase()} would stand in front of a window.`;
  return null;
}

/** Which uppers to draw: none in front of a window. */
export function upperVisible(r: KitchenRun, f: RunFrame, wins: [number, number][]): boolean[] {
  const spans = moduleSpans(r, f);
  return r.modules.map((m, i) => !!m.upper && !wins.some(w => overlaps(w, spans[i])));
}

let seq = 0;
export const newId = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function newModule(kind: ModuleKind): KitchenModule {
  return { id: newId("m"), kind, width: MODULES[kind].width, upper: MODULES[kind].upper };
}

/**
 * Add a module where the user clicked a wall face: onto the end of a run on
 * this face when the click is near it, else as a new run centred on the
 * click and slid into the free stretch. Returns the new runs, or a reason.
 */
export function addModuleAt(args: {
  data: KitchenData; kind: ModuleKind; walls: (PlanWallLike & { id?: string })[]; size: PlanSize;
  openings: PlanOpening[]; wallIndex: number; side: 1 | -1; along: number;
}): { runs: KitchenRun[]; runId: string; index: number } | { error: string } {
  const { data, kind, walls, size, openings, wallIndex, side, along } = args;
  const line = wallLine(walls[wallIndex], wallIndex, size);
  const f = runFrame(line, side);
  const mod = newModule(kind);
  const key = (walls[wallIndex] as { id?: string }).id ?? `wi${wallIndex}`;

  // near an existing run on this face: extend it at the nearer end
  for (const r of data.runs) {
    if (runWallIndex(r, walls) !== wallIndex || r.side !== side) continue;
    const [a, b] = runSpan(r, f);
    if (along < a - 0.9 || along > b + 0.9) continue;
    const startEnd = r.start;                       // its left end (along coordinate)
    const atLeft = Math.abs(along - startEnd) < Math.abs(along - (r.start + f.dir * runWidth(r)));
    const next: KitchenRun = atLeft
      ? { ...r, start: r.start - f.dir * mod.width, modules: [mod, ...r.modules] }
      : { ...r, modules: [...r.modules, mod] };
    const err = runProblem({ run: next, walls, size, openings, runs: data.runs });
    if (err) return { error: err };
    return { runs: data.runs.map(x => (x.id === r.id ? next : x)), runId: r.id, index: atLeft ? 0 : next.modules.length - 1 };
  }

  const free = freeInterval({ walls, size, openings, runs: data.runs, wallIndex, side, along });
  if (!free || free[1] - free[0] < mod.width - 1e-6) return { error: "No room for it here — try a longer stretch of wall." };
  // centre on the click, slid inside the free stretch; snap tight to a
  // corner when within 25 cm of one
  let lo = Math.max(free[0], Math.min(free[1] - mod.width, along - mod.width / 2));
  if (lo - free[0] < 0.25) lo = free[0];
  if (free[1] - (lo + mod.width) < 0.25) lo = free[1] - mod.width;
  const start = f.dir > 0 ? lo : lo + mod.width;
  const run: KitchenRun = { id: newId("run"), wall: { index: wallIndex, key }, side, start, modules: [mod] };
  const err = runProblem({ run, walls, size, openings, runs: data.runs });
  if (err) return { error: err };
  return { runs: [...data.runs, run], runId: run.id, index: 0 };
}

/** Apply a change to one run, checking it still fits. */
export function changeRun(
  data: KitchenData, runId: string, change: (r: KitchenRun) => KitchenRun | null,
  ctx: { walls: (PlanWallLike & { id?: string })[]; size: PlanSize; openings: PlanOpening[] },
): { runs: KitchenRun[] } | { error: string } {
  const r = data.runs.find(x => x.id === runId);
  if (!r) return { error: "That run is gone." };
  const next = change(r);
  if (!next || next.modules.length === 0) return { runs: data.runs.filter(x => x.id !== runId) };
  const err = runProblem({ run: next, ...ctx, runs: data.runs });
  if (err) return { error: err };
  return { runs: data.runs.map(x => (x.id === runId ? next : x)) };
}

/** A run's frame on its wall, or null when the wall is gone. */
export function frameOf(r: KitchenRun, walls: (PlanWallLike & { id?: string })[], size: PlanSize): RunFrame | null {
  const wi = runWallIndex(r, walls);
  return wi < 0 ? null : runFrame(wallLine(walls[wi], wi, size), r.side);
}

/** Edits to one run. Each keeps the other units where they stand. */
export const runEdits = {
  /** New width for a unit: grows to the right; if that doesn't fit, to the left. */
  width(r: KitchenRun, i: number, width: number, dir: 1 | -1, fits: (r: KitchenRun) => boolean): KitchenRun | null {
    const modules = r.modules.map((m, k) => (k === i ? { ...m, width } : m));
    const right = { ...r, modules };
    if (fits(right)) return right;
    const delta = width - r.modules[i].width;
    const left = { ...r, modules, start: r.start - dir * delta };
    return fits(left) ? left : null;
  },
  replace(r: KitchenRun, i: number, kind: ModuleKind): KitchenRun {
    return { ...r, modules: r.modules.map((m, k) => (k === i ? { ...m, kind, width: MODULES[kind].width, upper: MODULES[kind].upper } : m)) };
  },
  upper(r: KitchenRun, i: number, upper: UpperKind): KitchenRun {
    return { ...r, modules: r.modules.map((m, k) => (k === i ? { ...m, upper } : m)) };
  },
  /** Swap with the neighbour on the left (−1) or right (+1). */
  move(r: KitchenRun, i: number, by: -1 | 1): KitchenRun | null {
    const j = i + by;
    if (j < 0 || j >= r.modules.length) return null;
    const modules = [...r.modules];
    [modules[i], modules[j]] = [modules[j], modules[i]];
    return { ...r, modules };
  },
  /** Insert a unit beside unit i; on the left the run's start moves out. */
  insert(r: KitchenRun, i: number, side: "left" | "right", mod: KitchenModule, dir: 1 | -1): KitchenRun {
    const at = side === "left" ? i : i + 1;
    const modules = [...r.modules.slice(0, at), mod, ...r.modules.slice(at)];
    return { ...r, modules, start: side === "left" && at === 0 ? r.start - dir * mod.width : r.start };
  },
  /** Remove a unit; the units to its right close the gap (the first unit's
   *  removal moves the start instead, so nothing else shifts). */
  remove(r: KitchenRun, i: number, dir: 1 | -1): KitchenRun | null {
    const modules = r.modules.filter((_, k) => k !== i);
    if (!modules.length) return null;
    return { ...r, modules, start: i === 0 ? r.start + dir * r.modules[0].width : r.start };
  },
};
