/** Phase 1: ceiling heights, show / hide — run with `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildHeights, cleanCeiling, heightAt, wallHeight, DEFAULT_CEILING_M, type HeightRoom } from "@/lib/walls/heights";
import {
  EMPTY_HIDDEN, LIGHTING, cleanHidden, isHidden, pruneHidden, toggleGroup, toggleItem, toggleType, visibilityRows, nothingHidden,
} from "@/lib/scene/visibility";
import { favouriteFor } from "@/lib/favourites";
import { catalogById } from "@/lib/furniture/catalog";

// two rooms side by side: x 0..4 (2.6 m) and x 4..8 (3.4 m), z 0..4
const rooms: HeightRoom[] = [
  { poly: [[0, 0], [4, 0], [4, 4], [0, 4]], h: 2.6 },
  { poly: [[4, 0], [8, 0], [8, 4], [4, 4]], h: 3.4 },
];

test("ceiling values: metres, cm, junk, limits", () => {
  assert.equal(cleanCeiling(2.4), 2.4);
  assert.equal(cleanCeiling("3.05"), 3.05);
  assert.equal(cleanCeiling(280), 2.8);
  assert.equal(cleanCeiling(1.2), 2.2);
  assert.equal(cleanCeiling(15), 8);
  assert.equal(cleanCeiling(undefined), null);
  assert.equal(cleanCeiling("abc"), null);
});

test("height over a point is its room's, else the default", () => {
  assert.equal(heightAt(1, 1, rooms), 2.6);
  assert.equal(heightAt(6, 1, rooms), 3.4);
  assert.equal(heightAt(20, 20, rooms), DEFAULT_CEILING_M);
});

test("a wall takes the taller room either side", () => {
  const partition = { x1: 4, z1: 0, x2: 4, z2: 4, thickness: 0.15 };
  const leftOuter = { x1: 0, z1: 0, x2: 0, z2: 4, thickness: 0.2 };
  const rightOuter = { x1: 8, z1: 0, x2: 8, z2: 4, thickness: 0.2 };
  assert.equal(wallHeight(partition, rooms), 3.4);
  assert.equal(wallHeight(leftOuter, rooms), 2.6);
  assert.equal(wallHeight(rightOuter, rooms), 3.4);
  const h = buildHeights(rooms, [partition, leftOuter, { ...rightOuter, id: "east" }]);
  assert.equal(h.wall("wi0"), 3.4);
  assert.equal(h.wall("wi1"), 2.6);
  assert.equal(h.wall("east"), 3.4);
  assert.equal(h.wall("missing"), DEFAULT_CEILING_M);
  assert.equal(h.max, 3.4);
  assert.equal(h.at(1, 1), 2.6);
});

const sofa = { id: "a", modelId: "sofa-3seat" };
const lamp = { id: "b", modelId: "floor-lamp" };
const chair = { id: "c", modelId: "armchair" };
const cat = (p: { modelId?: string }) => (p.modelId ? catalogById(p.modelId) : undefined);

test("show / hide by group, type, piece and lighting", () => {
  assert.equal(isHidden(sofa, cat(sofa), false, EMPTY_HIDDEN), false);
  assert.equal(isHidden(lamp, cat(lamp), true, toggleGroup(EMPTY_HIDDEN, LIGHTING)), true);
  assert.equal(isHidden(sofa, cat(sofa), false, toggleGroup(EMPTY_HIDDEN, LIGHTING)), false);
  assert.equal(isHidden(sofa, cat(sofa), false, toggleType(EMPTY_HIDDEN, "sofa")), true);
  assert.equal(isHidden(chair, cat(chair), false, toggleType(EMPTY_HIDDEN, "sofa")), false);
  assert.equal(isHidden(chair, cat(chair), false, toggleGroup(EMPTY_HIDDEN, "living")), true);
  assert.equal(isHidden(chair, cat(chair), false, toggleItem(EMPTY_HIDDEN, "c")), true);
  assert.deepEqual(toggleType(toggleType(EMPTY_HIDDEN, "sofa"), "sofa").types, []);
  assert.ok(nothingHidden(EMPTY_HIDDEN));
});

test("show / hide: stored data is cleaned and pruned", () => {
  const h = cleanHidden({ groups: ["lighting", 3, "lighting"], types: ["sofa"], items: ["a", "gone"], kitchen: true, extra: 1 });
  assert.deepEqual(h, { groups: ["lighting"], types: ["sofa"], items: ["a", "gone"], kitchen: true });
  assert.deepEqual(pruneHidden(h, new Set(["a"])).items, ["a"]);
  assert.deepEqual(cleanHidden(null), EMPTY_HIDDEN);
});

test("panel rows count what is in the room", () => {
  const pieces = [sofa, { id: "a2", modelId: "sofa-2seat" }, lamp, chair];
  const rows = visibilityRows(pieces, p => { const c = cat(p); return c ? { category: c.category, typeId: c.typeId } : undefined; },
    p => p.modelId === "floor-lamp", toggleType(EMPTY_HIDDEN, "sofa"), g => g);
  assert.equal(rows.groups[0].key, LIGHTING);
  const sofas = rows.types.find(t => t.key === "sofa")!;
  assert.equal(sofas.count, 2);
  assert.equal(sofas.hidden, 2);
  assert.equal(rows.groups.find(g => g.key === "living")!.count, 4);
});

test("favourites: vendor pieces are products", () => {
  assert.deepEqual(favouriteFor("sofa-3seat"), { kind: "library", ref: "sofa-3seat" });
  assert.deepEqual(favouriteFor("shop:1234"), { kind: "product", ref: "1234" });
});

test("lifts fill the ceiling height", () => {
  assert.equal(catalogById("lift-home")?.fitToWallHeight, true);
  assert.equal(catalogById("lift-passenger")?.procedural, "elevator");
});
