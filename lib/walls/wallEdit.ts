/**
 * Wall edit sessions — lib/walls/wallEdit.ts
 * ============================================================================
 * The rules for dragging a wall, shared by the 2D plan editor and the 3D
 * view's wall handles, so both behave identically:
 *
 *   - corners stay welded: walls that met the moved end move with it;
 *   - partitions that T into the wall keep touching it;
 *   - walls stay axis-aligned (moveWallEnd slides rather than skews);
 *   - and because a follower that slides sideways carries its FAR end with
 *     it, the walls welded or T'd onto that far end follow too — otherwise
 *     lengthening one wall would open the next corner along.
 *
 * Walls come in and go out as plan percentages (the stored format). All the
 * geometry in between runs in scene metres via lib/geometry/planFrame, so
 * pointer positions are passed in scene metres too: the 3D view has them
 * already, the 2D editor converts its pointer once.
 *
 * A session is captured when the drag STARTS (which walls are welded to
 * which ends) and then applied to every pointer position. Re-detecting welds
 * mid-drag would let a wall swept past another one grab it.
 */

import {
  axisAlign, moveWallEnd, isHoriz, weldTargets, tJunctions, followHost, wallLength,
  type WeldRef,
} from "@/lib/walls/geometry";
import {
  wallToScene, wallToPct, realToScene, sceneToReal,
  type PlanFrame, type PctWall, type SceneWall,
} from "@/lib/geometry/planFrame";

export type { WeldRef };

export interface WallChange<W extends PctWall = PctWall> {
  index: number;
  wall: W;
  /** false for walls that only moved to stay attached — see handleWallChange */
  opts?: { dragRooms?: boolean };
}

/** Two wall ends closer than this (real metres) are one corner. Detected
 *  walls rarely end on exactly the same point. */
export const WELD_REAL_M = 0.5;

/** Walls attached to the far end (or the body) of a corner follower. */
interface Chain { via: number; far: 1 | 2; weld: WeldRef[]; tee: WeldRef[] }

export type WallSession =
  | { kind: "end"; i: number; end: 1 | 2; weld: WeldRef[]; tee: WeldRef[]; chain: Chain[] }
  | { kind: "body"; i: number; start: SceneWall; px: number; pz: number;
      weld1: WeldRef[]; weld2: WeldRef[]; tee: WeldRef[]; chain: Chain[] };

// Aligned in plan % FIRST — the renderer picks a wall's axis in %, and for a
// slightly skewed detected wall on a non-square plan, % and metres can
// disagree about which axis dominates.
const scene = (f: PlanFrame, walls: PctWall[]) => walls.map(w => wallToScene(f, axisAlign(w)));
const radius = (f: PlanFrame) => realToScene(f, WELD_REAL_M);

/** One level further out: for each corner follower, what hangs off it. */
function chainsFor(sw: SceneWall[], followers: WeldRef[], taken: Set<number>, r: number): Chain[] {
  const out: Chain[] = [];
  for (const f of followers) {
    const w = axisAlign(sw[f.i]);
    const far: 1 | 2 = f.end === 1 ? 2 : 1;
    const weld = weldTargets(sw, f.i, far === 1 ? w.x1 : w.x2, far === 1 ? w.y1 : w.y2, r)
      .filter(x => !taken.has(x.i));
    weld.forEach(x => taken.add(x.i));
    const tee = tJunctions(sw, f.i, w, weld, r).filter(x => !taken.has(x.i));
    tee.forEach(x => taken.add(x.i));
    out.push({ via: f.i, far, weld, tee });
  }
  return out;
}

export function beginEndDrag(walls: PctWall[], f: PlanFrame, i: number, end: 1 | 2): WallSession {
  const sw = scene(f, walls), r = radius(f);
  const w = axisAlign(sw[i]);
  const weld = weldTargets(sw, i, end === 1 ? w.x1 : w.x2, end === 1 ? w.y1 : w.y2, r);
  const tee = tJunctions(sw, i, w, weld, r);
  const taken = new Set([i, ...weld.map(x => x.i), ...tee.map(x => x.i)]);
  return { kind: "end", i, end, weld, tee, chain: chainsFor(sw, weld, taken, r) };
}

/** (px, pz): where the pointer grabbed the wall, scene metres. */
export function beginBodyDrag(
  walls: PctWall[], f: PlanFrame, i: number, px: number, pz: number,
): WallSession {
  const sw = scene(f, walls), r = radius(f);
  const w = axisAlign(sw[i]);
  const weld1 = weldTargets(sw, i, w.x1, w.y1, r);
  const weld2 = weldTargets(sw, i, w.x2, w.y2, r);
  const tee = tJunctions(sw, i, w, [...weld1, ...weld2], r);
  const taken = new Set([i, ...weld1.map(x => x.i), ...weld2.map(x => x.i), ...tee.map(x => x.i)]);
  return {
    kind: "body", i, start: w, px, pz, weld1, weld2, tee,
    chain: chainsFor(sw, [...weld1, ...weld2], taken, r),
  };
}

type SChange = { index: number; wall: SceneWall; opts?: { dragRooms?: boolean } };
const FOLLOW = { dragRooms: false } as const;

/** Move what hangs off each follower to wherever that follower ended up. */
function applyChains(sw: SceneWall[], chain: Chain[], out: SChange[]) {
  for (const c of chain) {
    const moved = out.find(o => o.index === c.via)?.wall;
    if (!moved) continue;
    const fx = c.far === 1 ? moved.x1 : moved.x2, fy = c.far === 1 ? moved.y1 : moved.y2;
    for (const t of c.weld) {
      const n = sw[t.i];
      if (n) out.push({ index: t.i, wall: moveWallEnd(n, t.end, fx, fy), opts: FOLLOW });
    }
    const h = isHoriz(moved), cross = h ? moved.y1 : moved.x1;
    for (const t of c.tee) {
      const n = sw[t.i];
      if (n) out.push({ index: t.i, wall: followHost(n, t.end, h, cross), opts: FOLLOW });
    }
  }
}

/**
 * Apply a session to the pointer at (x, z), scene metres. For a body drag
 * `crossOnly` restricts the motion to sliding the wall sideways: along-axis
 * motion would just slide it lengthwise, out of its corners.
 */
export function applySession<W extends PctWall>(
  walls: W[], f: PlanFrame, s: WallSession, x: number, z: number, crossOnly = false,
): WallChange<W>[] {
  const sw = scene(f, walls);
  const host = sw[s.i];
  if (!host) return [];
  const out: SChange[] = [];

  if (s.kind === "end") {
    const next = moveWallEnd(host, s.end, x, z);
    out.push({ index: s.i, wall: next });
    for (const t of s.weld) {
      const n = sw[t.i];
      if (n) out.push({ index: t.i, wall: moveWallEnd(n, t.end, x, z), opts: FOLLOW });
    }
    const h = isHoriz(next), cross = h ? next.y1 : next.x1;
    for (const t of s.tee) {
      const n = sw[t.i];
      if (n) out.push({ index: t.i, wall: followHost(n, t.end, h, cross), opts: FOLLOW });
    }
  } else {
    const w = s.start;
    let dx = x - s.px, dz = z - s.pz;
    if (crossOnly) { if (isHoriz(w)) dx = 0; else dz = 0; }
    const moved = axisAlign({ ...host, x1: w.x1 + dx, x2: w.x2 + dx, y1: w.y1 + dz, y2: w.y2 + dz });
    out.push({ index: s.i, wall: moved });
    for (const t of s.weld1) {
      const n = sw[t.i];
      if (n) out.push({ index: t.i, wall: moveWallEnd(n, t.end, moved.x1, moved.y1), opts: FOLLOW });
    }
    for (const t of s.weld2) {
      const n = sw[t.i];
      if (n) out.push({ index: t.i, wall: moveWallEnd(n, t.end, moved.x2, moved.y2), opts: FOLLOW });
    }
    const bh = isHoriz(moved), bc = bh ? moved.y1 : moved.x1;
    for (const t of s.tee) {
      const n = sw[t.i];
      if (n) out.push({ index: t.i, wall: followHost(n, t.end, bh, bc), opts: FOLLOW });
    }
  }
  applyChains(sw, s.chain, out);

  return out.map(c => ({
    index: c.index,
    // keep whatever else the stored wall carries; only geometry changes
    wall: { ...walls[c.index], ...wallToPct(f, c.wall) } as W,
    ...(c.opts ? { opts: { ...c.opts } } : {}),
  }));
}

/** A wall's size as the user thinks of it: real length, scene thickness
 *  (thickness is not stretched — see planFrame). */
export function wallSize(walls: PctWall[], f: PlanFrame, i: number) {
  const w = wallToScene(f, axisAlign(walls[i]));
  return { lengthRealM: sceneToReal(f, wallLength(w)), thicknessM: w.thickness, horiz: isHoriz(w) };
}

/**
 * Set a wall's REAL length exactly, keeping its `anchor` end where it is and
 * moving the other — with the welded walls following, as a drag would.
 */
export function setWallLength<W extends PctWall>(
  walls: W[], f: PlanFrame, i: number, realM: number, anchor: 1 | 2 = 1,
): WallChange<W>[] {
  const w = wallToScene(f, axisAlign(walls[i]));
  const horiz = isHoriz(w);
  const len = realToScene(f, realM);
  const moving: 1 | 2 = anchor === 1 ? 2 : 1;
  const ax = anchor === 1 ? w.x1 : w.x2, ay = anchor === 1 ? w.y1 : w.y2;
  const mx = moving === 1 ? w.x1 : w.x2, my = moving === 1 ? w.y1 : w.y2;
  // keep the direction the wall already runs in
  const sign = horiz ? Math.sign(mx - ax) || 1 : Math.sign(my - ay) || 1;
  const nx = horiz ? ax + sign * len : mx;
  const nz = horiz ? my : ay + sign * len;
  return applySession(walls, f, beginEndDrag(walls, f, i, moving), nx, nz);
}

/** Set a wall's thickness in metres. */
export function setWallThickness<W extends PctWall>(
  walls: W[], f: PlanFrame, i: number, m: number,
): WallChange<W> {
  const w = wallToScene(f, walls[i]);
  return { index: i, wall: { ...walls[i], ...wallToPct(f, { ...w, thickness: m }) } as W };
}
