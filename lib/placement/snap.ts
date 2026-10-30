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

import { wallToScene, type PlanFrame } from "@/lib/geometry/planFrame";

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

// ── Plan → world projection ──────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for "where is this wall, really".
//
// Walls are stored as percentages of the source image. Three places used to
// convert them independently — the 3D renderer, the canvas page, and the scene
// — and they disagreed on all three counts: the renderer clamps thickness and
// the engine did not, the renderer extends walls half a thickness at each end
// and the engine did not, and the renderer projects every wall onto its
// dominant axis while the engine took the raw two-point segment. Furniture
// therefore snapped to walls that were not where they were drawn.
//
// Everything now goes through this function. If the renderer's assumptions
// change, they change HERE and the engine follows.

export interface PlanWall {
  x1: number; y1: number;     // % of plan (0–100)
  x2: number; y2: number;
  thickness: number;          // % of the larger plan dimension
  id?: string;
}

/** Matches MIN_WALL_T / MAX_WALL_T in ThreeSceneV2 — a drawn wall is never
 *  thinner or fatter than this regardless of what the detector reported. */
export const WALL_T_MIN = 0.09;
export const WALL_T_MAX = 0.20;

export function planWallsToWorld(
  walls: PlanWall[], totalW: number, totalD: number,
): WorldWall[] {
  // % → scene metres goes through the plan frame like every other conversion
  const frame: PlanFrame = { widthM: totalW, depthM: totalD, visualScale: 1 };

  return walls.map((raw, i) => {
    const w = wallToScene(frame, raw);
    const thickness = Math.min(WALL_T_MAX, Math.max(WALL_T_MIN, w.thickness));
    const half = thickness / 2;
    const id = raw.id ?? `wi${i}`;

    // The renderer draws each wall axis-aligned along whichever axis it spans
    // furthest, and extends it half a thickness at both ends so corners
    // interpenetrate instead of leaving a slit. Mirror both exactly.
    // orientation is decided in plan %, exactly as the renderer decides it
    if (Math.abs(raw.x2 - raw.x1) >= Math.abs(raw.y2 - raw.y1)) {
      const z = (w.y1 + w.y2) / 2;
      return {
        x1: Math.min(w.x1, w.x2) - half, z1: z,
        x2: Math.max(w.x1, w.x2) + half, z2: z,
        thickness, id,
      };
    }
    const x = (w.x1 + w.x2) / 2;
    return {
      x1: x, z1: Math.min(w.y1, w.y2) - half,
      x2: x, z2: Math.max(w.y1, w.y2) + half,
      thickness, id,
    };
  });
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

/** Rotation about Y that turns an item's front (local +Z) to face (nx, nz).
 *  Same convention as wall-mounted decor in ThreeSceneV2. */
export function facingAwayFromWall(nx: number, nz: number): number {
  return Math.atan2(nx, nz);
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
  // sofa against a wall shows 220 of frontage, not 90 — and its FRONT (local
  // +Z) faces into the room, away from the wall. Using the wall's own angle
  // here instead depended on which end the wall was drawn from, so half of
  // all snapped beds and wardrobes ended up facing the wall.
  const rotation = facingAwayFromWall(hit.nx, hit.nz);

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

// ── Walls as solid obstacles ─────────────────────────────────────────────────
//
// A floor item is a rectangle (its footprint) at any rotation; a wall is an
// axis-aligned solid band (planWallsToWorld already extends it over the
// corners). Overlap is tested EXACTLY with the separating-axis test on the
// four axes that matter: world x, world z, and the item's own two sides.
//
// The previous check measured the item by halfExtents(), which only knows
// 0° and 90°: at 30° a 220 × 90 sofa was treated as 45 cm deep when it
// reaches 94 cm, and sank 44 cm into the wall.

/** Unit vectors of an item's width (u) and depth (v) axes on the floor, for
 *  a three.js rotation about +Y: local x → (cos r, −sin r), local z →
 *  (sin r, cos r). */
function itemAxes(rotation: number): [[number, number], [number, number]] {
  const c = Math.cos(rotation), s = Math.sin(rotation);
  return [[c, -s], [s, c]];
}

/** The four floor corners of a footprint. */
export function footprintCorners(f: Footprint): [number, number][] {
  const [u, v] = itemAxes(f.rotation);
  const a = f.w / 2, b = f.d / 2;
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([i, j]) => [
    f.x + u[0] * a * i + v[0] * b * j,
    f.z + u[1] * a * i + v[1] * b * j,
  ] as [number, number]);
}

export interface WallPenetration {
  /** how far the item must move to clear the wall (plus `clearance`), m */
  depth: number;
  /** direction to move it: away from the wall */
  nx: number; nz: number;
  wall: WorldWall;
}

/**
 * How deep an item sits in one wall, and the shortest way out. null when it
 * is at least `clearance` away from it.
 */
export function wallPenetration(
  f: Footprint, w: WorldWall, clearance = 0,
): WallPenetration | null {
  const half = w.thickness / 2;
  const horiz = Math.abs(w.x2 - w.x1) >= Math.abs(w.z2 - w.z1);
  // the wall as an axis-aligned rectangle
  const minX = Math.min(w.x1, w.x2) - (horiz ? 0 : half);
  const maxX = Math.max(w.x1, w.x2) + (horiz ? 0 : half);
  const minZ = Math.min(w.z1, w.z2) - (horiz ? half : 0);
  const maxZ = Math.max(w.z1, w.z2) + (horiz ? half : 0);
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const ex = (maxX - minX) / 2, ez = (maxZ - minZ) / 2;

  const [u, v] = itemAxes(f.rotation);
  const a = f.w / 2, b = f.d / 2;
  const dx = f.x - cx, dz = f.z - cz;

  let best: WallPenetration | null = null;
  for (const [nx, nz] of [[1, 0], [0, 1], u, v] as [number, number][]) {
    const rItem = a * Math.abs(u[0] * nx + u[1] * nz) + b * Math.abs(v[0] * nx + v[1] * nz);
    const rWall = ex * Math.abs(nx) + ez * Math.abs(nz);
    const along = dx * nx + dz * nz;
    const overlap = rItem + rWall + clearance - Math.abs(along);
    if (overlap <= 0) return null;                    // separated on this axis
    if (!best || overlap < best.depth) {
      const sign = along >= 0 ? 1 : -1;
      best = { depth: overlap, nx: nx * sign, nz: nz * sign, wall: w };
    }
  }
  return best;
}

/** The deepest wall overlap of an item, in metres; 0 when it is clear. */
export function wallOverlapDepth(f: Footprint, walls: WorldWall[]): number {
  let deepest = 0;
  for (const w of walls) {
    const p = wallPenetration(f, w);
    if (p && p.depth > deepest) deepest = p.depth;
  }
  return deepest;
}

/** True when any part of the item is inside a wall (touching is fine). */
export const hitsWall = (f: Footprint, walls: WorldWall[], tolerance = 0.005) =>
  wallOverlapDepth(f, walls) > tolerance;

/**
 * Push an item clear of every wall it overlaps, by the shortest route out of
 * each, leaving `clearance` between it and the wall face.
 *
 * Room polygons trace the wall CENTRELINE, so an item sitting neatly inside a
 * room polygon can still be buried up to half a wall thickness — containment
 * checks alone do not prevent clipping. Iterated because pushing out of one
 * wall can push into another in a corner. In a gap narrower than the item
 * there is no way out; check the result with hitsWall().
 */
export function pushOutOfWalls(
  f: Footprint, walls: WorldWall[], clearance = 0.02, passes = 8,
): Footprint {
  const cur = { ...f };
  for (let pass = 0; pass < passes; pass++) {
    let moved = false;
    for (const w of walls) {
      const p = wallPenetration(cur, w, clearance);
      // already clear, or only within the clearance margin by a hair
      if (!p || p.depth < 1e-4) continue;
      cur.x += p.nx * p.depth;
      cur.z += p.nz * p.depth;
      moved = true;
    }
    if (!moved) break;
  }
  return cur;
}

/**
 * Where an item may stand: nudged clear of the walls, or null when there is
 * no wall-free spot close by (a gap narrower than the item). Callers refuse
 * the placement on null rather than leave the item inside a wall.
 */
export function settleClearOfWalls(f: Footprint, walls: WorldWall[]): Footprint | null {
  if (walls.length === 0) return f;
  const out = pushOutOfWalls(f, walls);
  return hitsWall(out, walls) ? null : out;
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