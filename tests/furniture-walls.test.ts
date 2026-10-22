/**
 * Furniture must never stand inside a wall — run with `npm test`.
 *
 * Each case here is a way furniture used to end up in a wall: rotating it
 * against one, enlarging it there, dragging it at an angle (the old check
 * only understood 0° and 90°), dropping it on a wall, or squeezing it into a
 * gap narrower than itself.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  planWallsToWorld, snapToWall, settleClearOfWalls, hitsWall, wallOverlapDepth,
  wallPenetration, footprintCorners, type Footprint,
} from "@/lib/placement/snap";

// 16 m × 12 m plan with a partition; north wall's room-side face near z = -4.7
const WALLS = planWallsToWorld([
  { x1: 10, y1: 10, x2: 90, y2: 10, thickness: 1.2 }, { x1: 90, y1: 10, x2: 90, y2: 90, thickness: 1.2 },
  { x1: 90, y1: 90, x2: 10, y2: 90, thickness: 1.2 }, { x1: 10, y1: 90, x2: 10, y2: 10, thickness: 1.2 },
  { x1: 60, y1: 10, x2: 60, y2: 90, thickness: 1.2 },
], 16, 12);
const SOFA = { w: 2.2, d: 0.9 };
const deg = (d: number) => (d * Math.PI) / 180;

const againstNorthWall = (): Footprint => {
  const s = snapToWall({ x: -2, z: -4.3, ...SOFA, rotation: 0 }, WALLS);
  return { x: s.x, z: s.z, ...SOFA, rotation: s.rotation };
};

const assertClear = (f: Footprint | null) => {
  assert.ok(f, "expected a wall-free spot");
  assert.equal(hitsWall(f!, WALLS), false, `still ${wallOverlapDepth(f!, WALLS)} m inside a wall`);
};

test("footprint corners follow the three.js rotation", () => {
  const c = footprintCorners({ x: 0, z: 0, w: 2, d: 1, rotation: deg(90) });
  // local +x (width) turns to −z at +90°
  const zs = c.map(p => p[1]).sort((a, b) => a - b);
  assert.ok(Math.abs(zs[0] + 1) < 1e-9 && Math.abs(zs[3] - 1) < 1e-9);
});

test("an angled sofa's real reach is measured, not its 0° box", () => {
  // centre 60 cm from the wall face: clear at 0°, inside at 30°
  const z = -4.7 + 0.6 + 0.0;
  const straight = { x: -2, z, ...SOFA, rotation: 0 };
  const angled = { ...straight, rotation: deg(30) };
  assert.equal(hitsWall(straight, WALLS), false);
  assert.equal(hitsWall(angled, WALLS), true);
});

test("a sofa snapped to a wall is touching, not inside", () => {
  assertClear(settleClearOfWalls(againstNorthWall(), WALLS));
});

test("rotating against a wall steps the item clear", () => {
  const f = againstNorthWall();
  for (const r of [30, 45, 60, 90]) assertClear(settleClearOfWalls({ ...f, rotation: f.rotation + deg(r) }, WALLS));
});

test("enlarging against a wall steps the item clear", () => {
  const f = againstNorthWall();
  assertClear(settleClearOfWalls({ ...f, w: SOFA.w * 1.8, d: SOFA.d * 1.8 }, WALLS));
});

test("dropped right on a wall, it lands beside it", () => {
  const f = settleClearOfWalls({ x: -2, z: -4.8, ...SOFA, rotation: 0 }, WALLS);
  assertClear(f);
  assert.ok(f!.z > -4.8, "moves into the room the drop was in");
});

test("into a corner at an angle, it clears both walls", () => {
  assertClear(settleClearOfWalls({ x: -6.2, z: -4.6, ...SOFA, rotation: deg(40) }, WALLS));
});

test("no room (gap narrower than the item): refused, not forced into a wall", () => {
  const corridor = planWallsToWorld([
    { x1: 10, y1: 10, x2: 90, y2: 10, thickness: 1.2 },
    { x1: 10, y1: 16, x2: 90, y2: 16, thickness: 1.2 },
  ], 16, 12);
  assert.equal(settleClearOfWalls({ x: 0, z: -4.5, ...SOFA, rotation: 0 }, corridor), null);
});

test("an item in open floor is left exactly where it is", () => {
  const f = { x: -2, z: 0, ...SOFA, rotation: deg(17) };
  assert.deepEqual(settleClearOfWalls(f, WALLS), f);
  assert.equal(wallPenetration(f, WALLS[0]), null);
});
