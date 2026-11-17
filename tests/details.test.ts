/** Architectural details: ceilings and wall panelling — run with `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ceilingBeams, cleanCeilingSpec, insetPolygon, insideSpans, type XZ } from "@/lib/walls/ceiling";
import { cleanPanelSpec, panelPieces } from "@/lib/walls/panelling";

const sq = (x0: number, z0: number, x1: number, z1: number): XZ[] => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

test("a tray border moves every side in, whichever way the room is drawn", () => {
  const inner = insetPolygon(sq(0, 0, 6, 4), 0.5)!;
  assert.deepEqual(inner.map(p => p.map(v => Math.round(v * 100) / 100)), [[0.5, 0.5], [5.5, 0.5], [5.5, 3.5], [0.5, 3.5]]);
  const cw = insetPolygon([...sq(0, 0, 6, 4)].reverse(), 0.5)!;
  assert.ok(cw.every(([x, z]) => x >= 0.49 && x <= 5.51 && z >= 0.49 && z <= 3.51));
  // an L-shaped room keeps its L
  const L: XZ[] = [[0, 0], [6, 0], [6, 3], [3, 3], [3, 6], [0, 6]];
  const li = insetPolygon(L, 0.4)!;
  assert.equal(li.length, 6);
  // too small for the border: flat
  assert.equal(insetPolygon(sq(0, 0, 1, 1), 0.45), null);
});

test("beams stay inside the room, even an L-shaped one", () => {
  const L: XZ[] = [[0, 0], [6, 0], [6, 3], [3, 3], [3, 6], [0, 6]];
  const spans = insideSpans(L, "x", 4.5);
  assert.deepEqual(spans, [[0, 3]]);
  for (const b of ceilingBeams(L, "coffered")) {
    for (const [x, z] of [[b.x - b.w / 2 + 0.01, b.z], [b.x + b.w / 2 - 0.01, b.z], [b.x, b.z - b.d / 2 + 0.01], [b.x, b.z + b.d / 2 - 0.01]]) {
      assert.ok(!(x > 3.05 && z > 3.05), `beam reaches the missing corner at ${x},${z}`);
    }
  }
  // "beams" run across the short side only
  const beams = ceilingBeams(sq(0, 0, 6, 4), "beams");
  assert.ok(beams.length >= 3 && beams.every(b => b.d > b.w), "spanning the 4 m side");
});

test("stored ceilings and panelling are checked", () => {
  assert.equal(cleanCeilingSpec({ style: "flat" }), null);
  assert.equal(cleanCeilingSpec({ style: "dome" }), null);
  assert.deepEqual(cleanCeilingSpec({ style: "tray", drop: 9 }), { style: "tray", drop: 0.6, inset: 0.55, led: true, ledTone: "warm" });
  assert.deepEqual(cleanPanelSpec({ style: "fluted" }), { style: "fluted", color: undefined });
  assert.equal(cleanPanelSpec({ style: "gothic" }), null);
});

test("panelling fits the wall it is given", () => {
  const box = panelPieces("box", 0, 4, 2.8, 2.8, 1);
  assert.ok(box.length > 8);
  assert.ok(box.every(p => p.a0 >= 0 && p.a1 <= 4 && p.y0 >= 0 && p.y1 <= 2.8));
  // under a window (top 0.9 m) only the lower part
  const under = panelPieces("box", 0, 2, 0.9, 2.8, 1);
  assert.ok(under.every(p => p.y1 <= 0.9));
  const fluted = panelPieces("fluted", 0, 1, 2.8, 2.8, 1);
  assert.equal(fluted.length, 17);  // 4.5 cm slats, 1.2 cm gaps
  assert.deepEqual(panelPieces("wainscot", 0, 0.05, 2.8, 2.8, 1), []);
});
