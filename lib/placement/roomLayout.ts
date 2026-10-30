/**
 * Room layout planner — lib/placement/roomLayout.ts
 * ============================================================================
 * "Decorate my bedroom": the AI picks the pieces and suggests rough spots;
 * this decides where they actually go. AI coordinates are hints — rooms are
 * L-shaped, walls have thickness, doors need to open — so every piece is put
 * somewhere that obeys the rules below, or left out.
 *
 *   bed          headboard against a wall, ideally with room for a nightstand
 *                each side and not right beside the door
 *   nightstand   either side of the bed, backs flush with the headboard wall
 *   wall pieces  wardrobe, dresser, desk, shelves, TV unit, sofa: back to a
 *                wall, facing the room
 *   rug          under the bed (towards the foot) or in front of the sofa
 *   everything   fully inside the room, out of the walls, not overlapping
 *                anything, out of door swings, and out of the walking space
 *                in front of beds and wardrobes
 *
 * Pure geometry (world metres, plan centred on the origin); no React/three.
 */

import {
  type Footprint, type WorldWall, type Poly,
  footprintCorners, hitsWall, pointInPoly, facingAwayFromWall,
} from "./snap";

export interface LayoutItem {
  key: string;
  name: string;
  typeId?: string;
  /** metres */
  w: number; d: number; h: number;
  /** the AI's suggestion, if any (rotation in radians) */
  hint?: { x: number; z: number; rotation: number };
}

export interface Door { x: number; z: number; halfWidth: number }

export interface Placed { key: string; x: number; z: number; rotation: number }

export interface LayoutInput {
  room: Poly;
  walls: WorldWall[];
  doors?: Door[];
  /** furniture already in the room — treated as obstacles */
  existing?: Footprint[];
  items: LayoutItem[];
}

type Role = "bed" | "nightstand" | "rug" | "wall" | "free";

const BED = /(^|[\s_-])(bed|bunk|king|queen|single|double|twin)([\s_-]|$)|^bed/i;
const NIGHTSTAND = /nightstand|night[\s_-]?stand|bedside/i;
const RUG = /rug|carpet|mat\b/i;
const WALL_PIECE = /wardrobe|dresser|bookshelf|bookcase|shelf|sofa|couch|tv|console|sideboard|desk|cabinet|fridge|chest|vanity|closet|armoire/i;

export function roleOf(item: Pick<LayoutItem, "name" | "typeId" | "h">): Role {
  const s = `${item.typeId ?? ""} ${item.name}`;
  if (NIGHTSTAND.test(s)) return "nightstand";
  if (RUG.test(s) || item.h <= 0.05) return "rug";
  if (BED.test(s) && !/sofa|bench|bedside/i.test(s)) return "bed";
  if (WALL_PIECE.test(s)) return "wall";
  return "free";
}

const GAP = 0.04;            // between pieces
const WALL_GAP = 0.015;      // between a piece and the wall face
const FRONT_CLEAR = 0.6;     // walking space kept in front of beds, wardrobes…
const DOOR_DEPTH = 0.95;     // door swing kept clear, each side of the wall
const STEP = 0.1;            // candidate spacing along walls / on the grid

// ── geometry helpers ────────────────────────────────────────────────────────

const axes = (r: number) => ({ u: [Math.cos(r), -Math.sin(r)] as const, v: [Math.sin(r), Math.cos(r)] as const });

/** Exact rectangle overlap (separating axis), with a gap. */
function rectsOverlap(a: Footprint, b: Footprint, gap = GAP): boolean {
  const A = axes(a.rotation), B = axes(b.rotation);
  const dx = b.x - a.x, dz = b.z - a.z;
  for (const [nx, nz] of [A.u, A.v, B.u, B.v]) {
    const ra = (a.w / 2) * Math.abs(A.u[0] * nx + A.u[1] * nz) + (a.d / 2) * Math.abs(A.v[0] * nx + A.v[1] * nz);
    const rb = (b.w / 2) * Math.abs(B.u[0] * nx + B.u[1] * nz) + (b.d / 2) * Math.abs(B.v[0] * nx + B.v[1] * nz);
    if (Math.abs(dx * nx + dz * nz) >= ra + rb + gap) return false;
  }
  return true;
}

/** Every corner (and the centre) inside the room outline. */
function insideRoom(f: Footprint, room: Poly): boolean {
  if (!pointInPoly(f.x, f.z, room)) return false;
  return footprintCorners(f).every(([x, z]) => pointInPoly(x, z, room));
}

/** The strip in front of a piece that must stay walkable. */
function frontZone(f: Footprint, depth = FRONT_CLEAR): Footprint {
  const { v } = axes(f.rotation);
  const off = f.d / 2 + depth / 2;
  return { x: f.x + v[0] * off, z: f.z + v[1] * off, w: f.w, d: depth, rotation: f.rotation };
}

// ── the planner ─────────────────────────────────────────────────────────────

interface Obstacle { f: Footprint; soft: boolean }   // soft = walking space / door swing

export function planRoomLayout(input: LayoutInput): { placed: Placed[]; dropped: string[] } {
  const { room, walls } = input;
  const obstacles: Obstacle[] = (input.existing ?? []).map(f => ({ f, soft: false }));
  const placed: Placed[] = [];
  const dropped: string[] = [];

  // Door swings: a square each side of the wall at every door near this room.
  for (const d of input.doors ?? []) {
    const near = walls.find(w => distToSegment(d.x, d.z, w) < Math.max(0.3, w.thickness));
    if (!near) continue;
    const horiz = Math.abs(near.x2 - near.x1) >= Math.abs(near.z2 - near.z1);
    const width = d.halfWidth * 2 + 0.1;
    obstacles.push({
      f: horiz
        ? { x: d.x, z: d.z, w: width, d: DOOR_DEPTH * 2 + near.thickness, rotation: 0 }
        : { x: d.x, z: d.z, w: DOOR_DEPTH * 2 + near.thickness, d: width, rotation: 0 },
      soft: true,
    });
  }

  const ok = (f: Footprint, flat: boolean) =>
    insideRoom(f, room) &&
    !hitsWall(f, walls) &&
    (flat || !obstacles.some(o => rectsOverlap(f, o.f)));

  const commit = (item: LayoutItem, f: Footprint, role: Role) => {
    placed.push({ key: item.key, x: f.x, z: f.z, rotation: f.rotation });
    if (role === "rug") return; // rugs are walked on and sat on
    obstacles.push({ f, soft: false });
    if (role === "bed" || role === "wall") obstacles.push({ f: frontZone(f), soft: true });
  };

  // Faces of walls that look into this room, as candidate lines.
  const faces = wallFaces(walls, room);

  /** Best spot with the piece's back to a wall. */
  const againstWall = (item: LayoutItem, score: (f: Footprint) => number): Footprint | null => {
    let best: Footprint | null = null, bestScore = Infinity;
    for (const face of faces) {
      const len = Math.hypot(face.x2 - face.x1, face.z2 - face.z1);
      if (len < item.w) continue;
      const tx = (face.x2 - face.x1) / len, tz = (face.z2 - face.z1) / len;
      const rotation = facingAwayFromWall(face.nx, face.nz);
      const out = item.d / 2 + WALL_GAP;
      for (let s = item.w / 2; s <= len - item.w / 2 + 1e-9; s += STEP) {
        const f: Footprint = {
          x: face.x1 + tx * s + face.nx * out,
          z: face.z1 + tz * s + face.nz * out,
          w: item.w, d: item.d, rotation,
        };
        if (!ok(f, false)) continue;
        // its own walking space must be free too (into the room, not a wall)
        const fz = frontZone(f, Math.min(FRONT_CLEAR, 0.45));
        if (!insideRoom(fz, room) || obstacles.some(o => !o.soft && rectsOverlap(fz, o.f, 0))) continue;
        const sc = score(f);
        if (sc < bestScore) { bestScore = sc; best = f; }
      }
    }
    return best;
  };

  /** Nearest free spot to a target point, anywhere in the room. */
  const nearestFree = (item: LayoutItem, tx: number, tz: number, rotations: number[], flat: boolean): Footprint | null => {
    const xs = room.map(p => p[0]), zs = room.map(p => p[1]);
    let best: Footprint | null = null, bestD = Infinity;
    for (const rotation of rotations) {
      for (let x = Math.min(...xs); x <= Math.max(...xs); x += STEP) {
        for (let z = Math.min(...zs); z <= Math.max(...zs); z += STEP) {
          const dist = (x - tx) ** 2 + (z - tz) ** 2;
          if (dist >= bestD) continue;
          const f = { x, z, w: item.w, d: item.d, rotation };
          if (ok(f, flat)) { best = f; bestD = dist; }
        }
      }
    }
    return best;
  };

  const centre = polyCentre(room);
  const doorNear = (f: Footprint) =>
    (input.doors ?? []).reduce((pen, d) => pen + Math.max(0, 2.2 - Math.hypot(f.x - d.x, f.z - d.z)), 0);
  const hintDist = (item: LayoutItem, f: Footprint) =>
    item.hint ? Math.hypot(f.x - item.hint.x, f.z - item.hint.z) : 0;

  const byRole = (r: Role) => input.items.filter(i => roleOf(i) === r);
  const beds = byRole("bed").sort((a, b) => b.w * b.d - a.w * a.d);
  const nightstands = byRole("nightstand");
  const wallPieces = byRole("wall").sort((a, b) => b.w * b.d - a.w * a.d);
  const free = byRole("free").sort((a, b) => b.w * b.d - a.w * a.d);
  const rugs = byRole("rug");

  // 1. Beds — the anchor of a bedroom.
  const placedBeds: Footprint[] = [];
  for (const bed of beds) {
    const ns = nightstands[0];
    const f = againstWall(bed, cand => {
      // room for nightstands either side is worth a lot; so is a quiet wall
      const sides = ns ? nightstandSlots(cand, ns).filter(s => ok(s, false)).length : 2;
      return hintDist(bed, cand) * 0.3 + (2 - sides) * 3 + doorNear(cand) * 2
        // a bed centred on its wall reads as designed
        + Math.abs(alongOffsetFromFaceCentre(cand, faces)) * 0.4;
    });
    if (f) { commit(bed, f, "bed"); placedBeds.push(f); } else dropped.push(bed.key);
  }

  // 2. Nightstands beside the first bed (or against a wall if there's none).
  const usedSlots = new Set<number>();
  for (const ns of nightstands) {
    let f: Footprint | null = null;
    for (const bedF of placedBeds) {
      const slots = nightstandSlots(bedF, ns);
      const i = slots.findIndex((s, idx) => !usedSlots.has(idx) && ok(s, false));
      if (i >= 0) { f = slots[i]; usedSlots.add(i); break; }
    }
    f ??= againstWall(ns, cand => hintDist(ns, cand) + doorNear(cand));
    if (f) commit(ns, f, "nightstand"); else dropped.push(ns.key);
  }

  // 3. Wardrobes, dressers, desks, shelves, sofas — backs to the walls.
  for (const item of wallPieces) {
    const f = againstWall(item, cand => hintDist(item, cand) + doorNear(cand) * 1.5);
    if (f) commit(item, f, "wall"); else dropped.push(item.key);
  }

  // 4. Everything else, as near the AI's suggestion as fits.
  for (const item of free) {
    const tx = item.hint?.x ?? centre[0], tz = item.hint?.z ?? centre[1];
    const r0 = item.hint?.rotation ?? 0;
    const f = nearestFree(item, tx, tz, [r0, r0 + Math.PI / 2], false);
    if (f) commit(item, f, "free"); else dropped.push(item.key);
  }

  // 5. Rugs under the bed (towards the foot) or in front of a sofa.
  for (const rug of rugs) {
    let f: Footprint | null = null;
    const bed = placedBeds[0];
    if (bed) {
      const { v } = axes(bed.rotation);
      const shift = Math.max(0, (rug.d - bed.d) / 2) + bed.d * 0.2;
      const cand = { x: bed.x + v[0] * shift, z: bed.z + v[1] * shift, w: rug.w, d: rug.d, rotation: bed.rotation };
      if (ok(cand, true)) f = cand;
    }
    if (!f) {
      const sofaKey = wallPieces.find(i => /sofa|couch/i.test(`${i.typeId} ${i.name}`))?.key;
      const sofa = placed.find(p => p.key === sofaKey);
      const sofaItem = wallPieces.find(i => i.key === sofaKey);
      if (sofa && sofaItem) {
        const { v } = axes(sofa.rotation);
        const off = sofaItem.d / 2 + rug.d / 2 - 0.25;
        const cand = { x: sofa.x + v[0] * off, z: sofa.z + v[1] * off, w: rug.w, d: rug.d, rotation: sofa.rotation };
        if (ok(cand, true)) f = cand;
      }
    }
    f ??= nearestFree(rug, rug.hint?.x ?? centre[0], rug.hint?.z ?? centre[1], [rug.hint?.rotation ?? 0, Math.PI / 2], true);
    if (f) commit(rug, f, "rug"); else dropped.push(rug.key);
  }

  return { placed, dropped };
}

// ── helpers ─────────────────────────────────────────────────────────────────

/** Left and right of a bed, backs in line with the headboard. */
function nightstandSlots(bed: Footprint, ns: { w: number; d: number }): Footprint[] {
  const { u, v } = axes(bed.rotation);
  const back = { x: bed.x - v[0] * (bed.d / 2), z: bed.z - v[1] * (bed.d / 2) };
  const along = bed.w / 2 + ns.w / 2 + 0.05;
  return [-1, 1].map(side => ({
    x: back.x + u[0] * along * side + v[0] * (ns.d / 2),
    z: back.z + u[1] * along * side + v[1] * (ns.d / 2),
    w: ns.w, d: ns.d, rotation: bed.rotation,
  }));
}

interface Face { x1: number; z1: number; x2: number; z2: number; nx: number; nz: number }

/** The room-side face of every wall that bounds the room, clipped to the
 *  stretch actually inside it. */
export function wallFaces(walls: WorldWall[], room: Poly): Face[] {
  const faces: Face[] = [];
  for (const w of walls) {
    const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
    if (len < 0.3) continue;
    const tx = (w.x2 - w.x1) / len, tz = (w.z2 - w.z1) / len;
    for (const side of [1, -1]) {
      const nx = -tz * side, nz = tx * side;
      const off = w.thickness / 2;
      // keep only the stretch whose room side is inside this room
      let start: number | null = null;
      const emit = (a: number, b: number) => {
        if (b - a < 0.3) return;
        faces.push({
          x1: w.x1 + tx * a + nx * off, z1: w.z1 + tz * a + nz * off,
          x2: w.x1 + tx * b + nx * off, z2: w.z1 + tz * b + nz * off,
          nx, nz,
        });
      };
      const probe = off + 0.2;
      for (let s = 0; s <= len + 1e-9; s += 0.1) {
        const inside = pointInPoly(w.x1 + tx * s + nx * probe, w.z1 + tz * s + nz * probe, room);
        if (inside && start === null) start = s;
        if (!inside && start !== null) { emit(start, s - 0.1); start = null; }
      }
      if (start !== null) emit(start, len);
    }
  }
  return faces;
}

function alongOffsetFromFaceCentre(f: Footprint, faces: Face[]): number {
  let best = Infinity, off = 0;
  for (const face of faces) {
    const mx = (face.x1 + face.x2) / 2, mz = (face.z1 + face.z2) / 2;
    const d = distToSegment(f.x, f.z, { x1: face.x1, z1: face.z1, x2: face.x2, z2: face.z2, thickness: 0 });
    if (d < best) { best = d; off = Math.hypot(f.x - mx, f.z - mz) - d; }
  }
  return Math.max(0, off);
}

function distToSegment(x: number, z: number, w: { x1: number; z1: number; x2: number; z2: number; thickness: number }) {
  const dx = w.x2 - w.x1, dz = w.z2 - w.z1;
  const l2 = dx * dx + dz * dz || 1e-9;
  const t = Math.max(0, Math.min(1, ((x - w.x1) * dx + (z - w.z1) * dz) / l2));
  return Math.hypot(x - (w.x1 + dx * t), z - (w.z1 + dz * t));
}

function polyCentre(p: Poly): [number, number] {
  return [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
}
