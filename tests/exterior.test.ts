/**
 * Only outer walls are cut away in the orbit views — run with `npm test`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { planWallsToWorld } from "@/lib/placement/snap";
import { outsideSides } from "@/lib/walls/exterior";

const T = 1.2;
const w = (x1: number, y1: number, x2: number, y2: number) => ({ x1, y1, x2, y2, thickness: T });

test("a house with partitions: outer walls face out, partitions are interior", () => {
  const walls = planWallsToWorld([
    w(10, 10, 90, 10),   // north   → outside is −z
    w(90, 10, 90, 90),   // east    → +x
    w(90, 90, 10, 90),   // south   → +z
    w(10, 90, 10, 10),   // west    → −x
    w(60, 10, 60, 90),   // partition running the full depth
    w(60, 50, 90, 50),   // partition T'd into it
  ], 16, 12);
  assert.deepEqual(outsideSides(walls), [-1, 1, 1, -1, 0, 0]);
});

test("a free-standing wall is open on both sides", () => {
  assert.deepEqual(outsideSides(planWallsToWorld([w(40, 50, 60, 50)], 16, 12)), [2]);
});

test("an L-shaped house: the inner corner walls are still outer walls", () => {
  //  ┌──────┐
  //  │      │
  //  │      └─────┐
  //  │            │
  //  └────────────┘
  const walls = planWallsToWorld([
    w(10, 10, 50, 10), w(50, 10, 50, 50), w(50, 50, 90, 50),
    w(90, 50, 90, 90), w(90, 90, 10, 90), w(10, 90, 10, 10),
  ], 16, 12);
  const s = outsideSides(walls);
  assert.equal(s[1], 1, "the inner vertical wall faces +x, outside");
  assert.equal(s[2], -1, "the inner horizontal wall faces −z, outside");
  assert.ok(s.every(v => v !== 0), "every wall of a single-room shell is an outer wall");
});

test("a corridor wall between two rooms is interior", () => {
  const walls = planWallsToWorld([
    w(10, 10, 90, 10), w(90, 10, 90, 90), w(90, 90, 10, 90), w(10, 90, 10, 10),
    w(10, 45, 90, 45), w(10, 55, 90, 55),   // a corridor across the middle
  ], 16, 12);
  const s = outsideSides(walls);
  assert.equal(s[4], 0);
  assert.equal(s[5], 0);
});
