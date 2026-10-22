/**
 * Axis-aligned wall geometry — lib/walls/geometry.ts
 * ============================================================================
 * Pure functions over straight walls that run along x or y. They do not care
 * what unit the coordinates are in; the caller passes the weld radius in the
 * same unit. lib/walls/wallEdit runs them in scene metres, so "two ends this
 * close are one corner" means the same physical distance across the whole
 * plan and on both axes (in plan percentages it did not: 2 % of the width and
 * 2 % of the depth are different lengths, and both change with plan size).
 *
 * No React, no three.js — so they are unit-tested directly
 * (lib/walls/__tests__).
 */

export interface Seg {
  x1: number; y1: number; x2: number; y2: number;
  thickness: number;
  id?: string;
}

export interface WeldRef { i: number; end: 1 | 2 }

export const isHoriz = (w: Seg) =>
  Math.abs(w.x2 - w.x1) >= Math.abs(w.y2 - w.y1);

/**
 * Collapse a wall onto its dominant axis.
 *
 * ThreeSceneV2 renders every wall axis-aligned: it picks the axis the wall
 * spans furthest along and takes a single cross-axis coordinate. A wall stored
 * with y1 !== y2 therefore looks one way in the plan editor and another way in
 * 3D, and the snap engine — which reads the raw segment — believes a third
 * thing. Keeping the stored wall axis-aligned makes all three agree.
 */
export function axisAlign<W extends Seg>(w: W): W {
  if (isHoriz(w)) {
    const y = (w.y1 + w.y2) / 2;
    return { ...w, y1: y, y2: y };
  }
  const x = (w.x1 + w.x2) / 2;
  return { ...w, x1: x, x2: x };
}

/**
 * Move one end of a wall to (x, y) without ever skewing it.
 *
 * The grabbed end goes exactly where the pointer is. Along the wall's own
 * axis that lengthens or shortens it; across that axis the WHOLE wall slides,
 * because a wall with two different cross-axis coordinates is a wall the 3D
 * renderer cannot draw.
 */
export function moveWallEnd<W extends Seg>(w: W, end: 1 | 2, x: number, y: number): W {
  const a = axisAlign(w);
  if (isHoriz(a)) {
    return end === 1
      ? { ...a, x1: x, y1: y, y2: y }
      : { ...a, x2: x, y1: y, y2: y };
  }
  return end === 1
    ? { ...a, y1: y, x1: x, x2: x }
    : { ...a, y2: y, x1: x, x2: x };
}

/**
 * Every other wall endpoint sitting on the corner at (x, y).
 *
 * Without this, dragging one wall tears it away from the walls it met and
 * leaves the shell open.
 */
export function weldTargets(
  walls: Seg[], skip: number, x: number, y: number, radius: number,
): WeldRef[] {
  const out: WeldRef[] = [];
  walls.forEach((raw, i) => {
    if (i === skip) return;
    const w = axisAlign(raw);
    if (Math.hypot(w.x1 - x, w.y1 - y) <= radius) out.push({ i, end: 1 });
    else if (Math.hypot(w.x2 - x, w.y2 - y) <= radius) out.push({ i, end: 2 });
  });
  return out;
}

/**
 * Walls that END somewhere along the BODY of `host` — a T-junction rather
 * than a corner.
 *
 * Interior partitions almost always meet an exterior wall this way. Corner
 * welding alone leaves every partition behind when the exterior wall moves.
 * A T follower only tracks the host's CROSS-axis position: it reaches
 * further to stay attached, it does not slide along.
 */
export function tJunctions(
  walls: Seg[], skip: number, host: Seg, taken: WeldRef[], radius: number,
): WeldRef[] {
  const h = axisAlign(host);
  const horiz = isHoriz(h);
  const lo = Math.min(horiz ? h.x1 : h.y1, horiz ? h.x2 : h.y2);
  const hi = Math.max(horiz ? h.x1 : h.y1, horiz ? h.x2 : h.y2);
  const cross = horiz ? h.y1 : h.x1;

  const out: WeldRef[] = [];
  walls.forEach((raw, i) => {
    if (i === skip) return;
    const w = axisAlign(raw);
    ([1, 2] as const).forEach((end) => {
      // a corner weld already owns this endpoint and positions it precisely
      if (taken.some(t => t.i === i && t.end === end)) return;
      const ex = end === 1 ? w.x1 : w.x2;
      const ey = end === 1 ? w.y1 : w.y2;
      const along = horiz ? ex : ey;
      const off = horiz ? ey : ex;
      if (Math.abs(off - cross) <= radius
          && along >= lo - radius && along <= hi + radius) {
        out.push({ i, end });
      }
    });
  });
  return out;
}

/** Reach a T follower's endpoint out to the host wall's new cross-axis
 *  position, leaving its own along-axis coordinate alone. */
export function followHost<W extends Seg>(
  follower: W, end: 1 | 2, hostHoriz: boolean, hostCross: number,
): W {
  const a = axisAlign(follower);
  const ownX = end === 1 ? a.x1 : a.x2;
  const ownY = end === 1 ? a.y1 : a.y2;
  return moveWallEnd(
    a, end,
    hostHoriz ? ownX : hostCross,
    hostHoriz ? hostCross : ownY,
  );
}

/** Centreline length of an axis-aligned wall. */
export const wallLength = (w: Seg) => {
  const a = axisAlign(w);
  return isHoriz(a) ? Math.abs(a.x2 - a.x1) : Math.abs(a.y2 - a.y1);
};
