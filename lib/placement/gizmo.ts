/**
 * Transform-handle maths — lib/placement/gizmo.ts
 * ----------------------------------------------------------------------------
 * The ring and arrows shown around a selected piece of furniture
 * (components/FurnitureGizmo.tsx). Pure functions so the feel can be tested:
 *
 *   rotate  drag around the ring: the piece turns with the pointer, by any
 *           angle; within SNAP_DEG of a multiple of 45° it clicks onto it
 *           (hold Shift for none).
 *   slide   drag an arrow: the piece moves only along that arrow's direction.
 *
 * Rotation is a three.js rotation about +Y: a floor vector (x, z) turned by r
 * becomes (x cos r + z sin r, −x sin r + z cos r), so a point's floor angle
 * atan2(z, x) DEcreases by r.
 */

export const SNAP_DEG = 3;
const TAU = Math.PI * 2;

export const normaliseRad = (r: number) => ((r % TAU) + TAU) % TAU;
export const toDeg = (r: number) => Math.round((normaliseRad(r) * 180) / Math.PI) % 360;

/** Floor angle of a point around a centre. */
export const angleAround = (cx: number, cz: number, px: number, pz: number) => Math.atan2(pz - cz, px - cx);

/**
 * The rotation that keeps the grabbed point of the ring under the pointer.
 * `snap`: click onto 0/45/90… when within SNAP_DEG.
 */
export function rotationFromDrag(
  startRotation: number, startAngle: number, nowAngle: number, snap = true,
): number {
  let r = normaliseRad(startRotation - (nowAngle - startAngle));
  if (snap) {
    const step = Math.PI / 4;
    const nearest = Math.round(r / step) * step;
    if (Math.abs(r - nearest) <= (SNAP_DEG * Math.PI) / 180) r = normaliseRad(nearest);
  }
  return r;
}

/** Unit floor vector of an item's local axis: "x" (width) or "z" (depth). */
export function itemAxis(rotation: number, axis: "x" | "z"): [number, number] {
  return axis === "x" ? [Math.cos(rotation), -Math.sin(rotation)] : [Math.sin(rotation), Math.cos(rotation)];
}

/** Where a piece ends up when an arrow is dragged from `from` to `to`. */
export function slideAlong(
  start: [number, number], dir: [number, number], from: [number, number], to: [number, number],
): [number, number] {
  const t = (to[0] - from[0]) * dir[0] + (to[1] - from[1]) * dir[1];
  return [start[0] + dir[0] * t, start[1] + dir[1] * t];
}
