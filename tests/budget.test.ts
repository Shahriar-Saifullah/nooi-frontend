/** Reading a budget out of a furnish request — run with `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBudget } from "@/lib/furniture/budget";

test("budgets are read in the usual ways", () => {
  assert.equal(parseBudget("decorate my bedroom under 8000"), 8000);
  assert.equal(parseBudget("furnish the living room with a budget of 12k"), 12000);
  assert.equal(parseBudget("furnish it for SAR 9,500"), 9500);
  assert.equal(parseBudget("fill the room, 15000 riyals max"), 15000);
  assert.equal(parseBudget("up to 7.5k for the dining room"), 7500);
});

test("numbers that aren't money are ignored", () => {
  assert.equal(parseBudget("decorate my bedroom"), null);
  assert.equal(parseBudget("furnish a 3 by 4 room with 2 sofas"), null);
  assert.equal(parseBudget("decorate bedroom 2"), null);
});
