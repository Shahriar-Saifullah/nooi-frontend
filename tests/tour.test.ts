/** 360° tour layout — run with `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { bearing, buildTour, edgeDistance, inside, polygonArea, standPoint, type XZ } from "@/lib/tour/graph";

const sq = (x0: number, z0: number, x1: number, z1: number): XZ[] => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const opts = { eyeHeight: () => 1.55, minArea: 1.5, wallTol: 0.4 };

test("geometry helpers", () => {
  assert.equal(polygonArea(sq(0, 0, 4, 3)), 12);
  assert.ok(inside(1, 1, sq(0, 0, 4, 3)));
  assert.ok(!inside(5, 1, sq(0, 0, 4, 3)));
  assert.equal(edgeDistance(2, 1, sq(0, 0, 4, 3)), 1);
});

test("stands in the middle of a room, and inside an L-shaped one", () => {
  assert.deepEqual(standPoint(sq(0, 0, 4, 2)), [2, 1]);
  const L: XZ[] = [[0, 0], [6, 0], [6, 1.5], [1.5, 1.5], [1.5, 6], [0, 6]];
  const [x, z] = standPoint(L);
  assert.ok(inside(x, z, L), "inside the L");
  assert.ok(edgeDistance(x, z, L) > 0.5, "away from the walls");
});

test("a door on the wall between two rooms links them both ways, pin at the doorway", () => {
  const rooms = [{ id: "a", name: "Lounge", poly: sq(0, 0, 4, 4) }, { id: "b", name: "Kitchen", poly: sq(4, 0, 8, 4) }];
  const { nodes, plan } = buildTour(rooms, [{ x: 4, z: 2, reach: 0.6 }], opts);
  assert.equal(nodes.length, 2);
  assert.deepEqual(nodes[0].links, [{ to: "n1", at: [4, 2] }]);
  assert.deepEqual(nodes[1].links, [{ to: "n0", at: [4, 2] }]);
  assert.deepEqual(nodes[0].position, [2, 1.55, 2]);
  assert.deepEqual(plan.bounds, [0, 0, 8, 4]);
});

test("small rooms are skipped; a room with no door joins its longest neighbour", () => {
  const rooms = [
    { id: "a", name: "Lounge", poly: sq(0, 0, 4, 4) },
    { id: "b", name: "Kitchen", poly: sq(4, 0, 7, 4) },      // open plan: no door drawn
    { id: "c", name: "Cupboard", poly: sq(7, 0, 8, 1) },     // 1 m²
  ];
  const { nodes } = buildTour(rooms, [], opts);
  assert.deepEqual(nodes.map(n => n.name), ["Lounge", "Kitchen"]);
  assert.equal(nodes[0].links[0].to, "n1");
  assert.ok(Math.abs(nodes[0].links[0].at[0] - 4) < 0.2, "pin on the shared wall");
});

test("a door far from a room doesn't link it", () => {
  const rooms = [{ id: "a", name: "A", poly: sq(0, 0, 4, 4) }, { id: "b", name: "B", poly: sq(10, 0, 14, 4) }];
  const { nodes } = buildTour(rooms, [{ x: 4, z: 2, reach: 0.6 }], opts);
  assert.equal(nodes[0].links.length, 0);
});

test("bearing: 0 is −Z, a quarter turn right is +X", () => {
  assert.equal(bearing([0, 0], [0, -1]), 0);
  assert.ok(Math.abs(bearing([0, 0], [1, 0]) - Math.PI / 2) < 1e-9);
});
