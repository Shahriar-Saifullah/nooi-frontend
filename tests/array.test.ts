/** Array: repeat a piece (lib/placement/array) — run with `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { rowSpots, gridSpots, aroundSpots, spotProblem, facing } from "@/lib/placement/array";

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test("a row runs to the piece's right, a set gap apart", () => {
  const s = rowSpots({ x: 0, z: 0, rotation: 0, w: 0.5, d: 0.5 }, 4, 0.1, "right");
  assert.equal(s.length, 3);
  assert.ok(near(s[2].x, 1.8) && near(s[2].z, 0));
  // turned 90°, "right" follows the piece
  const t = rowSpots({ x: 0, z: 0, rotation: Math.PI / 2, w: 0.5, d: 0.5 }, 2, 0, "right");
  assert.ok(near(t[0].x, 0) && near(t[0].z, -0.5));
  const f = rowSpots({ x: 0, z: 0, rotation: 0, w: 0.5, d: 0.8 }, 3, 0.2, "front");
  assert.ok(near(f[1].z, 2));
});

test("a grid has rows × columns minus the piece itself", () => {
  const g = gridSpots({ x: 0, z: 0, rotation: 0, w: 1.2, d: 0.6 }, 2, 3, 0.3, 0.9);
  assert.equal(g.length, 5);
  assert.ok(g.some(p => near(p.x, 3) && near(p.z, -1.5)));   // last column, second row behind
});

test("chairs round a table all face it", () => {
  const table = { x: 1, z: 1, rotation: 0, w: 1.8, d: 0.9 };
  const spots = aroundSpots(table, { w: 0.5, d: 0.5 }, 6, false);
  assert.equal(spots.length, 6);
  for (const s of spots) {
    const fx = Math.sin(s.rotation), fz = Math.cos(s.rotation);       // the chair's front
    const tx = table.x - s.x, tz = table.z - s.z;
    assert.ok(fx * tx + fz * tz > 0.99 * Math.hypot(tx, tz), "faces the table");
  }
  // 2 + 2 along the long sides, one at each end
  assert.equal(spots.filter(s => Math.abs(s.z - 1) > 0.4).length, 4);
  assert.equal(spots.filter(s => Math.abs(s.x - 1) > 0.9).length, 2);
  const round = aroundSpots({ x: 0, z: 0, rotation: 0, w: 1.2, d: 1.2 }, { w: 0.5, d: 0.5 }, 4, true);
  assert.ok(round.every(s => near(Math.hypot(s.x, s.z), 0.6 + 0.175)));
  assert.ok(near(facing(0, 0, 0, 1), 0));
});

test("spots in walls, on furniture or outside the rooms are refused", () => {
  const walls = [{ x1: -5, z1: 2, x2: 5, z2: 2, thickness: 0.1, id: "w" }];
  const room = [[-5, -5], [5, -5], [5, 5], [-5, 5]] as [number, number][];
  const f = (x: number, z: number) => ({ x, z, w: 0.5, d: 0.5, rotation: 0 });
  assert.equal(spotProblem(f(0, 0), walls, [], [room]), null);
  assert.equal(spotProblem(f(0, 1.9), walls, [], [room]), "wall");
  assert.equal(spotProblem(f(0, 0), walls, [f(0.2, 0)], [room]), "furniture");
  assert.equal(spotProblem(f(7, 0), walls, [], [room]), "outside");
});
