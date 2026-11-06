/** Kitchen builder rules (lib/kitchen/model) — run with `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addModuleAt, changeRun, freeInterval, frameOf, moduleSpans, newModule, runEdits, runFrame, runProblem,
  runSpan, upperVisible, windowSpans, type KitchenData,
} from "@/lib/kitchen/model";
import { wallLine } from "@/lib/walls/openings";
import { DEFAULT_KITCHEN_STYLE } from "@/lib/kitchen/materials";

// a 6 × 4.8 m room in a 10 × 8 m plan: back wall z = −2.4, left wall x = −3
const size = { totalW: 10, totalD: 8 };
const walls = [
  { x1: 20, y1: 20, x2: 80, y2: 20, thickness: 1.2 },   // w0 back
  { x1: 80, y1: 20, x2: 80, y2: 80, thickness: 1.2 },   // w1 right
  { x1: 20, y1: 80, x2: 80, y2: 80, thickness: 1.2 },   // w2 front
  { x1: 20, y1: 20, x2: 20, y2: 80, thickness: 1.2 },   // w3 left
];
const window0 = { type: "window" as const, wall: "horizontal" as const, x: 500, y: 200, width: 100, wall_id: "w0" };  // x −0.5..0.5
const doorLeft = { type: "door" as const, wall: "vertical" as const, x: 200, y: 600, width: 90, wall_id: "w3" };       // z 0.35..1.25
const openings = [window0, doorLeft];
const empty: KitchenData = { runs: [], style: DEFAULT_KITCHEN_STYLE };
const ctx = { walls, size, openings };
const ok = <T,>(r: T | { error: string }): T => { assert.ok(!("error" in (r as object)), (r as { error: string }).error); return r as T; };

test("a run's fronts face the room and run left to right as you face the wall", () => {
  const back = runFrame(wallLine(walls[0], 0, size), 1);
  assert.equal(back.dir, 1);
  assert.ok(Math.abs(back.rotation) < 1e-9);                   // faces +z, into the room
  const right = runFrame(wallLine(walls[1], 1, size), -1);
  assert.equal(right.dir, 1);                                   // facing +x wall from inside: left→right is −z→+z
  assert.ok(Math.abs(right.rotation + Math.PI / 2) < 1e-9);
});

test("units join into one run when added next to it", () => {
  const a = ok(addModuleAt({ data: empty, kind: "base-door", ...ctx, wallIndex: 0, side: 1, along: -2 }));
  const b = ok(addModuleAt({ data: { ...empty, runs: a.runs }, kind: "sink-base", ...ctx, wallIndex: 0, side: 1, along: -1.4 }));
  assert.equal(b.runs.length, 1);
  assert.deepEqual(b.runs[0].modules.map(m => m.kind), ["base-door", "sink-base"]);
  assert.equal(b.index, 1);
  // near the corner it snaps tight to the side wall
  const c = ok(addModuleAt({ data: empty, kind: "base-door", ...ctx, wallIndex: 0, side: 1, along: -2.7 }));
  const f = frameOf(c.runs[0], walls, size)!;
  assert.ok(Math.abs(runSpan(c.runs[0], f)[0] - (-3 + 0.06)) < 1e-6);
});

test("doorways, corners and other runs bound the free wall", () => {
  const free = freeInterval({ walls, size, openings, runs: [], wallIndex: 3, side: 1, along: -1 })!;
  assert.ok(Math.abs(free[0] - (-2.4 + 0.06)) < 1e-6, "starts at the back wall's face");
  assert.ok(Math.abs(free[1] - (0.35 - 0.05)) < 1e-6, "stops before the door");
  // a run in the back-left corner takes the corner square from the left wall
  const back = ok(addModuleAt({ data: empty, kind: "base-door", ...ctx, wallIndex: 0, side: 1, along: -2.7 }));
  const after = freeInterval({ walls, size, openings, runs: back.runs, wallIndex: 3, side: 1, along: -1 })!;
  assert.ok(after[0] >= -2.34 + 0.6 - 1e-6, `left wall now starts past the cabinets' depth (${after[0]})`);
  // a unit straddling the door is refused or slid clear
  const d = addModuleAt({ data: empty, kind: "base-door", ...ctx, wallIndex: 3, side: 1, along: 0.8 });
  if ("runs" in d) {
    const run = d.runs[0]; const [lo, hi] = runSpan(run, frameOf(run, walls, size)!);
    assert.ok(hi <= 0.3 + 1e-6 || lo >= 1.3 - 1e-6, "clear of the doorway");
  }
});

test("tall units can't stand in front of a window; uppers skip it", () => {
  const fridge = addModuleAt({ data: empty, kind: "fridge-single", ...ctx, wallIndex: 0, side: 1, along: 0 });
  assert.ok("error" in fridge && /window/.test(fridge.error));
  const sink = ok(addModuleAt({ data: empty, kind: "sink-base", ...ctx, wallIndex: 0, side: 1, along: 0 }));
  const run = sink.runs[0], f = frameOf(run, walls, size)!;
  assert.deepEqual(upperVisible(run, f, windowSpans(walls, size, openings, 0)), [false]);
});

test("editing a unit keeps the rest in place and respects the walls", () => {
  let data: KitchenData = empty;
  for (const along of [-2.7, -2.1, -1.5]) data = { ...data, runs: ok(addModuleAt({ data, kind: "base-door", ...ctx, wallIndex: 0, side: 1, along })).runs };
  assert.equal(data.runs.length, 1);
  const run = data.runs[0], f = frameOf(run, walls, size)!;
  const before = moduleSpans(run, f);
  // the first unit is in the corner: widening it can't grow left, so it grows right
  const fits = (r: typeof run) => runProblem({ run: r, ...ctx, runs: data.runs }) === null;
  const wider = runEdits.width(run, 0, 0.9, f.dir, fits)!;
  assert.ok(Math.abs(moduleSpans(wider, f)[0][0] - before[0][0]) < 1e-9);
  // removing the first unit leaves the others where they stand
  const fewer = runEdits.remove(run, 0, f.dir)!;
  const close = (a: [number, number][], b: [number, number][]) =>
    a.length === b.length && a.every((s, i) => Math.abs(s[0] - b[i][0]) < 1e-9 && Math.abs(s[1] - b[i][1]) < 1e-9);
  assert.ok(close(moduleSpans(fewer, f), before.slice(1)));
  // inserting on the left of the first unit would push into the side wall: refused
  const res = changeRun(data, run.id, r => runEdits.insert(r, 0, "left", newModule("base-door"), f.dir), ctx);
  assert.ok("error" in res);
  // the last unit removed takes the run with it
  const gone = changeRun({ ...data, runs: [fewer] }, run.id, () => null, ctx);
  assert.ok("runs" in gone && gone.runs.length === 0);
});
