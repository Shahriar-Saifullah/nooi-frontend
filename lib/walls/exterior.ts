/**
 * Which walls are outer walls — lib/walls/exterior.ts
 * ============================================================================
 * The orbit-view cutaway lowers only the building's OUTER walls (the ones
 * between the camera and the inside); interior partitions stay at full
 * height, so rooms keep their shape.
 *
 * A side of a wall faces the outside when nothing is built beyond it: rays
 * cast straight out from that side, at several points along the wall, reach
 * open ground without meeting another wall. Using the walls themselves, not
 * the detected room outlines, keeps this right for corridors and spaces the
 * detector did not label as rooms.
 *
 * Pure geometry in world metres (WorldWall from planWallsToWorld).
 */

import type { WorldWall } from "@/lib/placement/snap";

/**
 * Per wall, the side that faces outside, along the wall's normal:
 *    1  the +z side (walls running along x) or the +x side (along z)
 *   -1  the opposite side
 *    2  both sides (a free-standing wall)
 *    0  neither — an interior wall; never cut away
 */
export type OutsideSide = -1 | 0 | 1 | 2;

/** Points along each wall that cast rays, as fractions of its length. */
const SAMPLES = [0.15, 0.3, 0.5, 0.7, 0.85];

const isHorizontal = (w: WorldWall) => Math.abs(w.x2 - w.x1) >= Math.abs(w.z2 - w.z1);

function rect(w: WorldWall) {
  const h = w.thickness / 2;
  const horiz = isHorizontal(w);
  return {
    minX: Math.min(w.x1, w.x2) - (horiz ? 0 : h), maxX: Math.max(w.x1, w.x2) + (horiz ? 0 : h),
    minZ: Math.min(w.z1, w.z2) - (horiz ? h : 0), maxZ: Math.max(w.z1, w.z2) + (horiz ? h : 0),
  };
}

export function outsideSides(walls: WorldWall[]): OutsideSide[] {
  const rects = walls.map(rect);

  return walls.map((w, i) => {
    const horiz = isHorizontal(w);
    const c = horiz ? (w.z1 + w.z2) / 2 : (w.x1 + w.x2) / 2;
    const a0 = horiz ? Math.min(w.x1, w.x2) : Math.min(w.z1, w.z2);
    const a1 = horiz ? Math.max(w.x1, w.x2) : Math.max(w.z1, w.z2);
    // rays start just past this wall's own face
    const start = w.thickness / 2 + 0.01;

    const open = (side: 1 | -1) => {
      let clear = 0;
      for (const t of SAMPLES) {
        const along = a0 + (a1 - a0) * t;
        const from = c + side * start;
        const blocked = rects.some((r, j) => {
          if (j === i) return false;
          // the ray runs across the wall's line, at `along` on the wall's axis
          const [lo, hi] = horiz ? [r.minX, r.maxX] : [r.minZ, r.maxZ];
          if (along < lo || along > hi) return false;
          const [n0, n1] = horiz ? [r.minZ, r.maxZ] : [r.minX, r.maxX];
          return side > 0 ? n1 > from : n0 < from;
        });
        if (!blocked) clear++;
      }
      // most of the wall must look out on open ground — one stray ray past
      // the end of a neighbouring wall does not make a partition external
      return clear * 2 > SAMPLES.length;
    };

    const plus = open(1), minus = open(-1);
    if (plus && minus) return 2;
    if (plus) return 1;
    if (minus) return -1;
    return 0;
  });
}
