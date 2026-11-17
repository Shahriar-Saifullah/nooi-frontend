/** Surface library: every finish points at files that exist — run with `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { WALL_SURFACES } from "@/lib/surfaces/catalog";

const pub = (url: string) => join(process.cwd(), "public", url);

test("every surface's maps and swatch exist", () => {
  for (const s of WALL_SURFACES) {
    for (const f of [s.map, s.normalMap, s.roughnessMap, s.thumbnail]) {
      if (f) assert.ok(existsSync(pub(f)), `${s.id}: missing ${f}`);
    }
  }
});

test("ids are unique and sizes are real-world", () => {
  const ids = WALL_SURFACES.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of WALL_SURFACES) {
    assert.ok(s.tileSize.w > 0.1 && s.tileSize.w < 10, s.id);
    assert.ok(s.tileSize.h > 0.1 && s.tileSize.h < 10, s.id);
    // a shine map carries the values itself: the factor must not scale it down
    if (s.roughnessMap) assert.equal(s.roughness, 1, s.id);
  }
});

test("every Poly Haven model and swatch is shipped", async () => {
  const { FURNITURE_TYPES } = await import("@/lib/furniture/catalog");
  const ph = FURNITURE_TYPES.flatMap(t => t.variants).filter(v => v.credit?.source === "Poly Haven");
  assert.ok(ph.length >= 30);
  for (const v of ph) {
    assert.ok(existsSync(pub(v.path)), `${v.id}: missing ${v.path}`);
    assert.ok(v.thumbnail && existsSync(pub(v.thumbnail)), `${v.id}: missing thumbnail`);
    assert.equal(v.credit?.license, "CC0");
  }
});
