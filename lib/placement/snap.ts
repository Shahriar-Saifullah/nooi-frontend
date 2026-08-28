/**
 * Snap & adjacency engine (NOOI-17)
 * ----------------------------------
 * One place that answers the three placement questions the app keeps asking
 * in different corners of the codebase:
 *
 *   1. Where is the nearest wall, and which way does it face?
 *   2. Is this position valid — inside a room, clear of other furniture?
 *   3. What should this item snap to?
 *
 * Those questions previously had three separate half-answers: the AI furnish
 * sanitizer did containment and overlap server-side, drag-and-drop did neither,
 * and nothing understood walls at all — which is why AI-placed furniture landed
 * marooned in the middle of rooms instead of against a wall.
 *
 * Everything here is pure geometry in WORLD space (metres, plan centred on the
 * origin) with no React or three.js dependency, so it can run in the canvas,
 * in the scene, or on the server.
 */

export interface WorldWall {
  x1: number; z1: number;
  x2: number; z2: number;
  thickness: number;          // metres
  id?: string;
}

export interface Footprint {
  x: number; z: number;       // centre
  w: number; d: number;       // metres, unrotated
  rotation: number;           // radians about Y
  id?: string;
}

/** Half-extents of a footprint's axis-aligned bounds, rotation-aware.
 *  Rotations are overwhelmingly multiples of 90°, so swapping w/d past 45°
 *  is both accurate enough and much cheaper than a true OBB test. */
export function halfExtents(f: Pick<Footprint, "w" | "d" | "rotation">): [number, number] {
  const swapped = Math.abs(Math.sin(f.rotation)) > 0.7071;
  return [(swapped ? f.d : f.w) / 2, (swapped ? f.w : f.d) / 2];
}

// ── Walls ────────────────────────────────────────────────────────────────────

export interface WallHit {
  wall: WorldWall;
  /** closest point on the wall centreline */
  px: number; pz: number;
  /** distance from the query point to that centreline */
  distance: number;
  /** wall direction in radians (0 = runs along +x) */
  angle: number;
  /** unit normal pointing from the wall toward the query point */
  nx: number; nz: number;
}

export function nearestWall(x: number, z: number, walls: WorldWall[]): WallHit | null {
  let best: WallHit | null = null;

  for (const w of walls) {
    const dx = w.x2 - w.x1, dz = w.z2 - w.z1;
    const len2 = dx * dx + dz * dz;
    if (len2 < 1e-9) continue;

    let t = ((x - w.x1) * dx + (z - w.z1) * dz) / len2;
    t = Math.max(0, Math.min(1, t));                 // clamp to the segment
    const px = w.x1 + dx * t, pz = w.z1 + dz * t;

    const distance = Math.hypot(x - px, z - pz);
    if (best && distance >= best.distance) continue;

    const nlen = distance || 1e-9;
    best = {
      wall: w,
      px, pz,
      distance,
      angle: Math.atan2(dz, dx),
      nx: (x - px) / nlen,
      nz: (z - pz) / nlen,
    };
  }
  return best;
}

export interface SnapResult {
  x: number; z: number;
  rotation: number;
  wallId?: string;
  snapped: boolean;
}

/**
 * Push an item back against the nearest wall, if one is close enough.
 *
 * `rotation` is chosen so the item's DEPTH axis faces the wall — i.e. its back
 * is against it, which is how a sofa, wardrobe or bed actually sits. Items are
 * offset by half their depth plus half the wall thickness so they touch the
 * wall face rather than intersecting it.
 *
 * Returns `snapped: false` and the original position when nothing is within
 * `threshold`, so callers can use the result unconditionally.
 */
export function snapToWall(
  f: Footprint,
  walls: WorldWall[],
  threshold = 0.6,
): SnapResult {
  const hit = nearestWall(f.x, f.z, walls);
  if (!hit || hit.distance > threshold) {
    return { x: f.x, z: f.z, rotation: f.rotation, snapped: false };
  }

  // The item's WIDTH runs along the wall and its DEPTH faces it — a 220x90
  // sofa against a wall shows 220 of frontage, not 90.
  const rotation = hit.angle;

  // Offset must be the half-extent measured along the WALL NORMAL, not a fixed
  // axis: for a horizontal wall that is the z extent, for a vertical wall the
  // x extent. Taking one blindly sank items into vertical walls by the
  // difference between their width and depth.
  const [hx, hz] = halfExtents({ w: f.w, d: f.d, rotation });
  const alongNormal = Math.abs(hit.nx) * hx + Math.abs(hit.nz) * hz;
  const gap = hit.wall.thickness / 2 + alongNormal;

  return {
    x: hit.px + hit.nx * gap,
    z: hit.pz + hit.nz * gap,
    rotation,
    wallId: hit.wall.id,
    snapped: true,
  };
}

// ── Collision ────────────────────────────────────────────────────────────────

export function overlaps(a: Footprint, b: Footprint, gap = 0.02): boolean {
  const [ahw, ahd] = halfExtents(a);
  const [bhw, bhd] = halfExtents(b);
  return Math.abs(a.x - b.x) < ahw + bhw + gap
      && Math.abs(a.z - b.z) < ahd + bhd + gap;
}

export function firstCollision(
  item: Footprint, others: Footprint[], gap = 0.02,
): Footprint | null {
  for (const o of others) {
    if (o.id && item.id && o.id === item.id) continue;
    if (overlaps(item, o, gap)) return o;
  }
  return null;
}

/**
 * Nudge an item out of whatever it is overlapping, along the axis needing the
 * least movement. Bounded attempts: a crowded room can have no free spot, and
 * silently looping is worse than leaving the item where the user put it.
 */
export function resolveCollision(
  item: Footprint, others: Footprint[], gap = 0.02, attempts = 8,
): Footprint {
  let cur = { ...item };
  for (let i = 0; i < attempts; i++) {
    const hit = firstCollision(cur, others, gap);
    if (!hit) return cur;

    const [chw, chd] = halfExtents(cur);
    const [hhw, hhd] = halfExtents(hit);
    const pushX = chw + hhw + gap - Math.abs(cur.x - hit.x);
    const pushZ = chd + hhd + gap - Math.abs(cur.z - hit.z);

    if (pushX <= pushZ) {
      cur.x += Math.sign(cur.x - hit.x || 1) * pushX;
    } else {
      cur.z += Math.sign(cur.z - hit.z || 1) * pushZ;
    }
  }
  return cur;
}

// ── Rooms ────────────────────────────────────────────────────────────────────

export type Poly = [number, number][];

export function pointInPoly(x: number, z: number, poly: Poly): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Which room contains this point, if any. */
export function roomAt(x: number, z: number, rooms: { id: string; poly: Poly }[]) {
  return rooms.find(r => pointInPoly(x, z, r.poly)) ?? null;
}

/** Whole footprint inside one room (all four corners), not just its centre. */
export function fitsInRoom(f: Footprint, poly: Poly, margin = 0.05): boolean {
  const [hw, hd] = halfExtents(f);
  const corners: Poly = [
    [f.x - hw - margin, f.z - hd - margin],
    [f.x + hw + margin, f.z - hd - margin],
    [f.x - hw - margin, f.z + hd + margin],
    [f.x + hw + margin, f.z + hd + margin],
  ];
  return corners.every(([cx, cz]) => pointInPoly(cx, cz, poly));
}

// ── Categories that belong against a wall ────────────────────────────────────
// Used by the AI placement pass: a bed or wardrobe marooned mid-room is the
// single most obvious sign that furniture was placed by a machine.

const WALL_HUGGING = /bed|wardrobe|dresser|bookshelf|shelf|sofa|couch|tv|console|sideboard|desk|cabinet|fridge|nightstand/i;

export function prefersWall(name: string, typeId?: string): boolean {
  return WALL_HUGGING.test(name) || (!!typeId && WALL_HUGGING.test(typeId));
}