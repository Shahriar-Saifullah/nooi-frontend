/** Doors and windows on walls (lib/walls/openings) — run with `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  placeOpening, openingSpan, wallIndexOf, openingsAfterWallDelete, openingKey,
  wallLine, junctions, type PlanOpening, type PlanWallLike,
} from "@/lib/walls/openings";

// a 10 m × 10 m plan: 1 % = 10 cm, 1 ‰ = 1 cm
const size = { totalW: 10, totalD: 10 };
const T = 1.5; // % → 15 cm walls
// outer box + a partition at x = 50 % meeting the top wall
const walls: PlanWallLike[] = [
  { x1: 10, y1: 10, x2: 90, y2: 10, thickness: T },   // w0 top, x −4..4 m at z −4
  { x1: 90, y1: 10, x2: 90, y2: 90, thickness: T },   // w1 right
  { x1: 10, y1: 90, x2: 90, y2: 90, thickness: T },   // w2 bottom
  { x1: 10, y1: 10, x2: 10, y2: 90, thickness: T },   // w3 left
  { x1: 50, y1: 10, x2: 50, y2: 60, thickness: T },   // w4 partition
];

test("a new opening lands where it was asked if there is room", () => {
  const op = placeOpening({ openings: [], walls, size, wallIndex: 0, centre: -2, widthM: 1.2, type: "window" })!;
  assert.ok(op);
  assert.equal(op.wall, "horizontal");
  assert.equal(op.wall_id, "w0");
  assert.equal(op.x, 300);       // −2 m → 30 % → 300 ‰
  assert.equal(op.y, 100);
  assert.equal(op.width, 120);   // 1.2 m of a 10 m plan
  const span = openingSpan(op, size);
  assert.ok(Math.abs(span.centre + 2) < 1e-9 && Math.abs(span.half - 0.6) < 1e-9);
});

test("an opening is kept off the spot where a partition meets the wall", () => {
  const lines = walls.map((w, i) => wallLine(w, i, size));
  const meets = junctions(lines[0], lines);
  assert.ok(meets.some(m => Math.abs(m.at) < 1e-9), "the partition at x = 0 meets the top wall");
  // asked to centre a window right on the partition: it slides clear of it
  const op = placeOpening({ openings: [], walls, size, wallIndex: 0, centre: 0, widthM: 1.2, type: "window" })!;
  const { centre, half } = openingSpan(op, size);
  assert.ok(Math.abs(centre) >= half + 0.075 / 1 - 1e-6, `centre ${centre} clears the partition`);
});

test("openings stay inside the wall's ends and don't overlap each other", () => {
  const end = placeOpening({ openings: [], walls, size, wallIndex: 0, centre: -10, widthM: 1, type: "door" })!;
  const s = openingSpan(end, size);
  assert.ok(s.centre - s.half >= -4 + 0.075, "clear of the corner");

  const first = placeOpening({ openings: [], walls, size, wallIndex: 0, centre: -2, widthM: 1, type: "door" })!;
  const second = placeOpening({ openings: [first], walls, size, wallIndex: 0, centre: -2, widthM: 1, type: "window" })!;
  const a = openingSpan(first, size), b = openingSpan(second, size);
  assert.ok(Math.abs(a.centre - b.centre) >= a.half + b.half - 1e-6, "no overlap");
});

test("moving an opening doesn't collide with itself", () => {
  const op = placeOpening({ openings: [], walls, size, wallIndex: 0, centre: -2, widthM: 1, type: "door" })!;
  const moved = placeOpening({ openings: [op], walls, size, wallIndex: 0, centre: -1.9, widthM: 1, type: "door", skip: 0 })!;
  assert.equal(moved.x, 310);
});

test("no room at all → null", () => {
  // the partition's free stretch is 5 m; a 6 m door can't fit
  assert.equal(placeOpening({ openings: [], walls, size, wallIndex: 4, centre: 0, widthM: 6, type: "door" }), null);
});

test("wall assignment and keys", () => {
  const op: PlanOpening = { type: "door", wall: "vertical", x: 900, y: 500, width: 90 };
  assert.equal(wallIndexOf(op, walls, size), 1);
  assert.equal(openingKey({ ...op, wall_id: "w1" }), "w1-door-900-500");
});

test("deleting a wall drops its openings and renumbers the rest", () => {
  const ops: PlanOpening[] = [
    { type: "door", wall: "horizontal", x: 300, y: 100, width: 90, wall_id: "w0" },
    { type: "window", wall: "vertical", x: 900, y: 500, width: 120, wall_id: "w1" },
    { type: "door", wall: "vertical", x: 500, y: 400, width: 90, wall_id: "w4" },
  ];
  const next = openingsAfterWallDelete(ops, walls, 1, size);
  assert.equal(next.length, 2);
  assert.equal(next[0].wall_id, "w0");
  assert.equal(next[1].wall_id, "w3");
});
