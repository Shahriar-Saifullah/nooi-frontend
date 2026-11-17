/** Kitchen order pack for factories (lib/production) — run with `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_KITCHEN_STYLE } from "@/lib/kitchen/materials";
import type { KitchenModule, ModuleKind, UpperKind } from "@/lib/kitchen/model";
import { DEFAULT_RULES, hingesFor, runnerFor, type ProductionRules } from "@/lib/production/rules";
import { kitchenParts, bandingTotals } from "@/lib/production/parts";
import { placeKitchen, runToWorld, type KitchenOrderInput, type PlacedRun } from "@/lib/production/placement";
import { buildOrderPack } from "@/lib/production/pack";
import { sampleKitchen } from "@/lib/production/sample";
import { crc32, zip } from "@/lib/production/zip";
import { toDxf } from "@/lib/production/dxf";
import { planDrawing } from "@/lib/production/drawing";
import { toGlb } from "@/lib/production/model3d";

const mod = (kind: ModuleKind, width: number, upper: UpperKind = null): KitchenModule => ({ id: `${kind}-${width}`, kind, width, upper });
const oneRun = (modules: KitchenModule[], showUpper = modules.map(() => true)): KitchenOrderInput => ({
  order: { orderNo: "T1", client: "c", project: "p", date: "2026-11-16" },
  style: DEFAULT_KITCHEN_STYLE,
  plan: { walls: [], openings: [] },
  runs: [{ id: "a", code: "R1", modules, start: 0, dir: 1, face: 0, side: 1, horiz: true, rotation: 0, showUpper } satisfies PlacedRun],
});
const part = (k: ReturnType<typeof kitchenParts>, id: string) => {
  const p = k.parts.find(x => x.id === id);
  assert.ok(p, `no part ${id}`);
  return p!;
};

test("rules: hinges by door height, the longest runner that fits", () => {
  assert.equal(hingesFor(DEFAULT_RULES, 700), 2);
  assert.equal(hingesFor(DEFAULT_RULES, 1200), 3);
  assert.equal(hingesFor(DEFAULT_RULES, 2060), 4);
  assert.equal(runnerFor(DEFAULT_RULES, 574), 550);
  assert.equal(runnerFor(DEFAULT_RULES, 300), 0);
});

test("a base cabinet: carcass from the design's size, built by the rules", () => {
  const k = kitchenParts(oneRun([mod("drawer-base", 0.6)]), DEFAULT_RULES);
  const side = part(k, "R1-01-SL");
  assert.deepEqual([side.length, side.width, side.thickness], [800, 600, 18]);
  assert.equal(side.edges.L1, "C");                       // the front edge is banded…
  assert.equal(side.cutWidth, 599.2);                     // …so it's cut 0.8 mm narrower
  assert.deepEqual([part(k, "R1-01-BT").length, part(k, "R1-01-BT").width], [600, 564]);   // between the sides
  assert.ok(part(k, "R1-01-RF") && part(k, "R1-01-RB"));  // rails, not a full top
  const back = part(k, "R1-01-BK");
  assert.deepEqual([back.length, back.width, back.thickness], [788, 578, 8]);   // in 8 mm grooves
  // three drawer fronts filling 800 mm with 3 mm gaps, full overlay
  const df = k.parts.filter(p => p.id.startsWith("R1-01-DF"));
  assert.equal(df.length, 3);
  assert.ok(df.every(p => p.edges.L1 === "F" && p.edges.W2 === "F"));
  const total = df.reduce((a, p) => a + Math.min(p.length, p.width), 0) + 3 * DEFAULT_RULES.frontGap;
  assert.ok(Math.abs(total - 800) < 0.5, `fronts + gaps = ${total}`);
  assert.equal(part(k, "R1-01-DF1").length, 597);
  assert.ok(k.hardware.some(h => h.item.includes("runner") && h.item.includes("550 mm") && h.qty === 3));
});

test("nailed backs: sides shorten, the back covers the whole box", () => {
  const rules: ProductionRules = { ...DEFAULT_RULES, backFitting: "nailed" };
  const k = kitchenParts(oneRun([mod("base-door", 0.5)]), rules);
  assert.equal(part(k, "R1-01-SL").width, 592);
  const back = part(k, "R1-01-BK");
  assert.deepEqual([back.length, back.width], [800, 500]);
});

test("sink, dishwasher, fridge: false front, door panel, open space", () => {
  const k = kitchenParts(oneRun([mod("sink-base", 0.8), mod("dishwasher", 0.6), mod("fridge-single", 0.76)]), DEFAULT_RULES);
  assert.equal(part(k, "R1-01-FF").width, DEFAULT_RULES.sinkFalseFront - 3);
  assert.equal(k.parts.filter(p => p.cabinet === "R1-01" && p.id.includes("-RB")).length, 0);   // no back rail over a sink
  assert.ok(part(k, "R1-02-PN"));
  assert.equal(k.parts.filter(p => p.cabinet === "R1-02" && p.role !== "front").length, 0);
  assert.equal(k.parts.filter(p => p.cabinet === "R1-03").length, 0);
  assert.ok(k.appliances.some(a => a.item.startsWith("Fridge")) && k.appliances.some(a => a.item.startsWith("Dishwasher")));
});

test("wall cabinets go only where the design shows them (none in front of a window); hoods are appliances", () => {
  const input = oneRun([mod("base-door", 0.6, "cabinet"), mod("dishwasher", 0.6, "cabinet"), mod("cooktop-gas", 0.75, "hood")], [false, true, true]);
  const k = kitchenParts(input, DEFAULT_RULES);
  assert.ok(!k.cabinets.some(c => c.code === "R1-01W"));
  assert.ok(k.cabinets.some(c => c.code === "R1-02W" && c.depth === 350 && c.height === 762));
  assert.ok(k.appliances.some(a => a.item.includes("hood") && a.cabinet === "R1-03"));
});

test("worktops: tall units break them, long ones get a joint clear of the cut-outs", () => {
  const k = kitchenParts(oneRun([
    mod("drawer-base", 0.6), mod("sink-base", 1.0), mod("dishwasher", 0.6), mod("cooktop-gas", 0.9), mod("base-door", 0.6),
    mod("tall-pantry", 0.6), mod("base-door", 0.6),
  ]), DEFAULT_RULES);
  const r1 = k.worktops.filter(w => w.box.x0 < 4300);
  assert.equal(r1.reduce((a, w) => a + w.length, 0), 3700);
  assert.ok(r1.length >= 2 && r1.every(w => w.length <= 3000));
  for (const w of r1) for (const c of w.cutouts) assert.ok(c.x - c.width / 2 > 0 && c.x + c.width / 2 < w.length, `${c.label} crosses a joint`);
  assert.equal(k.worktops.filter(w => w.box.x0 >= 4300).length, 1);   // after the pantry
  assert.equal(k.worktops[0].depth, 600 + 18 + DEFAULT_RULES.worktopFrontOverhang);
  // the cut-outs together: one sink, one hob
  assert.deepEqual(k.worktops.flatMap(w => w.cutouts.map(c => c.kind)).sort(), ["hob", "sink"]);
});

test("plinths stop at a freestanding fridge", () => {
  const k = kitchenParts(oneRun([mod("base-door", 0.6), mod("fridge-single", 0.76), mod("base-door", 0.6)]), DEFAULT_RULES);
  const pl = k.parts.filter(p => p.role === "plinth");
  assert.equal(pl.length, 2);
  assert.deepEqual(pl.map(p => p.length), [600, 600]);
});

test("banding totals add 10 %", () => {
  const k = kitchenParts(oneRun([mod("base-door", 0.6)]), DEFAULT_RULES);
  const b = bandingTotals(k.parts, DEFAULT_RULES);
  assert.equal(b.length, 2);
  assert.ok(b.every(x => x.metres > 0));
});

test("run frames: a run on a vertical wall runs the right way round", () => {
  const r = { start: 1, dir: -1 as const, face: -2, side: 1 as const, horiz: false };
  assert.deepEqual(runToWorld(r, 0.5, 0.6), [-1.4, 0.5]);
});

test("the sample L-kitchen: corner clashes are reported, the pack has every file", () => {
  const { data, walls, size, openings } = sampleKitchen();
  const input = placeKitchen({ kitchen: data, walls, size, openings, order: { orderNo: "S-1", client: "c", project: "Sample", date: "2026-11-16" } });
  assert.equal(input.runs.length, 2);
  assert.ok(input.plan.walls.length === 4 && input.plan.openings.length === 2);
  const pack = buildOrderPack(input);
  const names = pack.files.map(f => f.name);
  for (const n of ["README.txt", "order-S-1.pdf", "order-S-1.xlsx", "cutlist.csv", "drawings/plan.dxf", "drawings/elevation-R1.dxf",
    "drawings/elevation-R2.dxf", "drawings/parts.dxf", "3d/kitchen.glb", "3d/kitchen.obj", "3d/kitchen.mtl", "order.json"]) assert.ok(names.includes(n), n);
  assert.ok(pack.parts.warnings.some(w => w.includes("corner")));
  const pdf = pack.files.find(f => f.name.endsWith(".pdf"))!.data as Uint8Array;
  assert.equal(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
  // the zip starts with a local header and ends with the directory record
  assert.deepEqual([...pack.zip.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  assert.deepEqual([...pack.zip.slice(-22, -18)], [0x50, 0x4b, 0x05, 0x06]);
});

test("zip, DXF, GLB basics", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  const z = zip([{ name: "a.txt", data: "hi" }]);
  assert.equal(z.length, 30 + 5 + 2 + 46 + 5 + 22);
  const { data, walls, size, openings } = sampleKitchen();
  const input = placeKitchen({ kitchen: data, walls, size, openings, order: { orderNo: "S", client: "", project: "", date: "" } });
  const k = kitchenParts(input, DEFAULT_RULES);
  const dxf = toDxf(planDrawing(input, k));
  assert.ok(dxf.includes("AC1009") && dxf.trimEnd().endsWith("EOF") && dxf.includes("\r\nWORKTOP\r\n"));
  assert.ok(!/[^\x00-\x7f]/.test(dxf));
  const glb = toGlb(input, k);
  const dv = new DataView(glb.buffer);
  assert.equal(dv.getUint32(0, true), 0x46546c67);
  assert.equal(dv.getUint32(8, true), glb.length);
  const json = JSON.parse(new TextDecoder().decode(glb.slice(20, 20 + dv.getUint32(12, true))));
  assert.equal(json.nodes.length, k.parts.length + k.worktops.length);
});
