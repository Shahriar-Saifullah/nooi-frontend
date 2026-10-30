/**
 * "Decorate my bedroom" must produce a sensible room — run with `npm test`.
 * The AI's coordinates are deliberately bad in some cases here: a bed
 * straddling a wall is exactly what users saw.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { planWallsToWorld, hitsWall, footprintCorners, pointInPoly, type Footprint } from "@/lib/placement/snap";
import { planRoomLayout, roleOf, type LayoutItem } from "@/lib/placement/roomLayout";

// 10 m × 10 m plan; a 4 m × 4 m bedroom from (−5,−5) to (−1,−1) in world metres,
// plus a neighbouring room to the east.
const PCT = (m: number) => ((m + 5) / 10) * 100;
const wall = (x1: number, z1: number, x2: number, z2: number) =>
  ({ x1: PCT(x1), y1: PCT(z1), x2: PCT(x2), y2: PCT(z2), thickness: 1.2 }); // 12 cm
const WALLS = planWallsToWorld([
  wall(-5, -5, -1, -5), wall(-1, -5, -1, -1), wall(-1, -1, -5, -1), wall(-5, -1, -5, -5),
  wall(-1, -5, 3, -5), wall(3, -5, 3, -1), wall(3, -1, -1, -1),
], 10, 10);
const ROOM: [number, number][] = [[-5, -5], [-1, -5], [-1, -1], [-5, -1]];
const DOOR = { x: -3, z: -1, halfWidth: 0.45 };   // in the south wall

const item = (key: string, name: string, w: number, d: number, h: number, hint?: LayoutItem["hint"]): LayoutItem =>
  ({ key, name, w, d, h, hint });

const BEDROOM = (hints = true): LayoutItem[] => [
  item("bed", "King Bed", 1.8, 2.1, 1.0, hints ? { x: -1.1, z: -3, rotation: 0 } : undefined),   // straddles the east wall
  item("ns1", "Nightstand", 0.5, 0.4, 0.55, hints ? { x: -4, z: -4.9, rotation: 0 } : undefined), // inside the north wall
  item("ns2", "Nightstand", 0.5, 0.4, 0.55),
  item("wardrobe", "Wardrobe", 1.2, 0.6, 2.0, hints ? { x: -3, z: -3, rotation: 0 } : undefined), // middle of the room
  item("dresser", "Dresser", 1.0, 0.45, 0.8),
  item("chair", "Accent Chair", 0.7, 0.7, 0.8),
  item("rug", "Area Rug", 2.0, 2.6, 0.01),
];

const fp = (it: LayoutItem, p: { x: number; z: number; rotation: number }): Footprint =>
  ({ x: p.x, z: p.z, w: it.w, d: it.d, rotation: p.rotation });

function check(items: LayoutItem[], doors = [DOOR]) {
  const { placed, dropped } = planRoomLayout({ room: ROOM, walls: WALLS, doors, items });
  const by = new Map(placed.map(p => [p.key, p]));
  for (const p of placed) {
    const it = items.find(i => i.key === p.key)!;
    const f = fp(it, p);
    assert.equal(hitsWall(f, WALLS), false, `${p.key} is inside a wall`);
    for (const [x, z] of footprintCorners(f)) assert.ok(pointInPoly(x, z, ROOM), `${p.key} pokes out of the room`);
  }
  // nothing solid overlaps anything else (rugs excepted)
  const solid = placed.filter(p => roleOf(items.find(i => i.key === p.key)!) !== "rug");
  for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
    const a = fp(items.find(x => x.key === solid[i].key)!, solid[i]);
    const b = fp(items.find(x => x.key === solid[j].key)!, solid[j]);
    const sep = Math.abs(a.x - b.x) >= (a.w + b.w) / 2 - 1e-6 || Math.abs(a.z - b.z) >= (a.d + b.d) / 2 - 1e-6
      || Math.abs(a.x - b.x) >= (a.d + b.w) / 2 || Math.abs(a.z - b.z) >= (a.w + b.d) / 2;
    assert.ok(sep, `${solid[i].key} overlaps ${solid[j].key}`);
  }
  return { by, dropped };
}

/** distance from the item's BACK edge to the nearest wall face, and whether its front faces the room */
function backToWall(it: LayoutItem, p: { x: number; z: number; rotation: number }) {
  const vx = Math.sin(p.rotation), vz = Math.cos(p.rotation);
  const backX = p.x - vx * it.d / 2, backZ = p.z - vz * it.d / 2;
  const faceGap = Math.min(backX - (-5 + 0.06), (-1 - 0.06) - backX, backZ - (-5 + 0.06), (-1 - 0.06) - backZ);
  const frontInside = pointInPoly(p.x + vx * (it.d / 2 + 0.3), p.z + vz * (it.d / 2 + 0.3), ROOM);
  return { faceGap, frontInside };
}

test("roles are recognised", () => {
  assert.equal(roleOf({ name: "King Bed", h: 1 }), "bed");
  assert.equal(roleOf({ name: "Bedside table", h: 0.5 }), "nightstand");
  assert.equal(roleOf({ name: "Sofa bed", h: 0.8 }), "wall");
  assert.equal(roleOf({ name: "Area Rug", h: 0.01 }), "rug");
  assert.equal(roleOf({ name: "Floor Lamp", h: 1.6 }), "free");
});

test("a bad AI layout becomes a valid bedroom", () => {
  const items = BEDROOM();
  const { by, dropped } = check(items);
  assert.deepEqual(dropped, []);
  // bed: headboard on a wall, foot into the room
  const bed = backToWall(items[0], by.get("bed")!);
  assert.ok(bed.faceGap < 0.05, `bed headboard is ${bed.faceGap} m off the wall`);
  assert.ok(bed.frontInside, "bed faces the wall");
  // wardrobe and dresser: backs to walls, fronts into the room
  for (const k of ["wardrobe", "dresser"]) {
    const r = backToWall(items.find(i => i.key === k)!, by.get(k)!);
    assert.ok(r.faceGap < 0.05 && r.frontInside, `${k} not against a wall facing in`);
  }
});

test("nightstands flank the bed", () => {
  const items = BEDROOM();
  const { by } = check(items);
  const bed = by.get("bed")!;
  for (const k of ["ns1", "ns2"]) {
    const ns = by.get(k)!;
    assert.ok(Math.abs(ns.rotation - bed.rotation) < 1e-6, `${k} not aligned with the bed`);
    const d = Math.hypot(ns.x - bed.x, ns.z - bed.z);
    assert.ok(d < 1.6, `${k} is ${d} m from the bed`);
  }
});

test("the rug goes under the bed", () => {
  const items = BEDROOM();
  const { by } = check(items);
  const bed = by.get("bed")!, rug = by.get("rug")!;
  assert.ok(Math.hypot(rug.x - bed.x, rug.z - bed.z) < 1.0);
});

test("nothing blocks the door", () => {
  const items = BEDROOM(false);
  const { by } = check(items);
  for (const [k, p] of by) {
    const it = items.find(i => i.key === k)!;
    if (roleOf(it) === "rug") continue;
    const f = fp(it, p);
    const [xs, zs] = [footprintCorners(f).map(c => c[0]), footprintCorners(f).map(c => c[1])];
    const blocks = Math.max(...xs) > DOOR.x - 0.5 && Math.min(...xs) < DOOR.x + 0.5 && Math.max(...zs) > -1 - 0.95;
    assert.ok(!blocks, `${k} blocks the door`);
  }
});

test("an L-shaped bedroom: everything stays inside the L", () => {
  const L: [number, number][] = [[-5, -5], [-1, -5], [-1, -3], [-3, -3], [-3, -1], [-5, -1]];
  const lw = planWallsToWorld([
    wall(-5, -5, -1, -5), wall(-1, -5, -1, -3), wall(-1, -3, -3, -3), wall(-3, -3, -3, -1),
    wall(-3, -1, -5, -1), wall(-5, -1, -5, -5),
  ], 10, 10);
  const items = BEDROOM();
  const { placed } = planRoomLayout({ room: L, walls: lw, items });
  for (const p of placed) {
    const f = fp(items.find(i => i.key === p.key)!, p);
    assert.equal(hitsWall(f, lw), false, `${p.key} in a wall`);
    for (const [x, z] of footprintCorners(f)) assert.ok(pointInPoly(x, z, L), `${p.key} outside the L`);
  }
  assert.ok(placed.some(p => p.key === "bed"), "the bed fits an L this size");
});

test("pieces that cannot fit are left out, not forced into a wall", () => {
  const items = [item("huge", "Wardrobe", 5, 0.6, 2)];
  const { placed, dropped } = planRoomLayout({ room: ROOM, walls: WALLS, items });
  assert.deepEqual(placed, []);
  assert.deepEqual(dropped, ["huge"]);
});
