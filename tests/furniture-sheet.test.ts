/** Furniture list for building elsewhere (lib/export/furnitureSheet) — run with `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFurnitureSheet, colourName, footprint, OTHER_AREA, type SheetFurniture } from "@/lib/export/furnitureSheet";

// plan drawn 2× life size: 20 × 10 scene metres = 10 × 5 m real
const plan = { totalW: 20, totalD: 10, visualScale: 2 };
const rooms = [
  { id: "a", name: "Bedroom", polygon: [[0, 0], [50, 0], [50, 100], [0, 100]] as [number, number][] },   // x −10..0
  { id: "b", name: "Living", box: { left: 50, top: 0, width: 50, height: 100 } },                        // x 0..10
];
const bed = (id: string, x: number, extra: Partial<SheetFurniture> = {}): SheetFurniture =>
  ({ id, name: "Bed", modelId: "bed-custom-real", position: [x, 0, 0], rotation: 0, ...extra });

test("pieces are grouped by the room they stand in, with real sizes", () => {
  const s = buildFurnitureSheet({ furniture: [bed("1", -5), bed("2", 5, { sizeScale: 0.9 })], rooms, ...plan });
  assert.deepEqual(s.rooms.map(r => r.name), ["Bedroom", "Living"]);
  assert.deepEqual(s.rooms[0].lines[0].sizeCm, { w: 200, d: 220, h: 100 });
  assert.deepEqual(s.rooms[1].lines[0].sizeCm, { w: 180, d: 198, h: 90 });   // resized 90 %
  assert.equal(s.rooms[0].lines[0].type, "Bed");
  assert.equal(s.rooms[0].lines[0].source, "Nooi library");
  // plan and area come back in real units
  assert.deepEqual(s.planSizeM, { w: 10, d: 5 });
  assert.equal(s.rooms[0].areaM2, 25);
  assert.equal(s.totalAreaM2, 50);
});

test("identical pieces in a room merge into one line with a quantity", () => {
  const s = buildFurnitureSheet({
    furniture: [bed("1", -6), bed("2", -3), bed("3", -4, { color: "#1e2a50" })], rooms, ...plan,
  });
  const lines = s.rooms[0].lines;
  assert.equal(lines.length, 2);
  const plain = lines.find(l => !l.customised)!;
  assert.equal(plain.qty, 2);
  assert.equal(plain.pieces.length, 2);
  const navy = lines.find(l => l.customised)!;
  assert.equal(navy.parts[0].colour.name, "Navy");
  assert.equal(s.totalPieces, 3);
  assert.equal(s.totalLines, 2);
  // numbers run through the whole document
  assert.deepEqual(lines.map(l => l.no).sort(), [1, 2]);
});

test("wall pieces report their hanging height; pieces outside rooms go to Other areas", () => {
  const tv: SheetFurniture = { id: "t", name: "TV", modelId: "tv-55", position: [3, 1.2, -4.9], rotation: 0, mountType: "wall" };
  const lost = bed("x", 0, { position: [30, 0, 30] });
  const s = buildFurnitureSheet({ furniture: [tv, lost], rooms, ...plan });
  const tvLine = s.rooms.find(r => r.name === "Living")!.lines[0];
  assert.equal(tvLine.mount, "wall");
  assert.equal(tvLine.mountHeightCm, 120);
  assert.equal(s.rooms.at(-1)!.name, OTHER_AREA);
});

test("floor pieces come before wall and ceiling pieces, larger first", () => {
  const tv: SheetFurniture = { id: "t", name: "TV", modelId: "tv-55", position: [-5, 1.2, 0], mountType: "wall" };
  const small = bed("s", -5, { sizeScale: 0.5 });
  const s = buildFurnitureSheet({ furniture: [tv, small, bed("b", -5)], rooms, ...plan });
  assert.deepEqual(s.rooms[0].lines.map(l => [l.mount, l.sizeCm.w]), [["floor", 200], ["floor", 100], ["wall", 123]]);
});

test("unknown models still list (custom box), duplicate room names stay distinct", () => {
  const box: SheetFurniture = { id: "c", name: "Shelf", position: [-5, 0, 0], width: 80, depth: 30, height: 180 };
  const twoBeds = [{ ...rooms[0] }, { ...rooms[1], name: "Bedroom" }];
  const s = buildFurnitureSheet({ furniture: [box, bed("b", 5)], rooms: twoBeds, ...plan });
  assert.deepEqual(s.rooms.map(r => r.name), ["Bedroom", "Bedroom (2)"]);
  assert.equal(s.rooms[0].lines[0].source, "Custom");
  assert.deepEqual(s.rooms[0].lines[0].sizeCm, { w: 80, d: 30, h: 180 });
});

test("colour names and footprints", () => {
  assert.equal(colourName("#ffffff"), "White");
  assert.equal(colourName("#6e4c32"), "Walnut brown");
  // a 2 × 1 piece turned 90°: its long side now runs along z
  const fp = footprint(0, 0, 2, 1, Math.PI / 2);
  const xs = fp.map(p => p[0]), zs = fp.map(p => p[1]);
  assert.ok(Math.abs(Math.max(...xs) - Math.min(...xs) - 1) < 1e-9);
  assert.ok(Math.abs(Math.max(...zs) - Math.min(...zs) - 2) < 1e-9);
});

test("colour & material come from the model, restyled the way the user chose", () => {
  const finishes = new Map([["bed-custom-real", [
    { material: "Fabric", colour: { hex: "#d6c4a5", name: "Beige" }, share: 0.7 },
    { material: "Walnut wood", colour: { hex: "#6e4c32", name: "Walnut brown" }, share: 0.3 },
  ]]]);
  const s = buildFurnitureSheet({
    furniture: [bed("1", -5), bed("2", -4, { color: "#1e2a50" }), bed("3", -3, { materialPreset: "leather" })],
    rooms, ...plan, finishes,
  });
  const [own, navy, leather] = ["1", "2", "3"].map(id => s.rooms[0].lines.find(l => l.pieces[0].id === id)!);
  assert.deepEqual(own.parts.map(p => `${p.material} - ${p.colour.name}`), ["Fabric - Beige", "Walnut wood - Walnut brown"]);
  assert.equal(own.customised, false);
  // a chosen colour tints every part; materials stay the model's
  assert.deepEqual(navy.parts.map(p => `${p.material} - ${p.colour.name}`), ["Fabric - Navy", "Walnut wood - Navy"]);
  // a chosen material replaces every part's; the colours stay the model's
  assert.deepEqual(leather.parts.map(p => `${p.material} - ${p.colour.name}`), ["Leather - Beige", "Leather - Walnut brown"]);
});

test("without a readable model: drawn pieces and catalogue hints", () => {
  const tv: SheetFurniture = { id: "t", name: "TV", modelId: "tv-55", position: [-5, 1.2, 0], mountType: "wall" };
  const s = buildFurnitureSheet({ furniture: [tv, bed("b", -5)], rooms, ...plan });
  const tvLine = s.rooms[0].lines.find(l => l.mount === "wall")!;
  assert.match(tvLine.parts[0].material, /screen/i);
  assert.equal(tvLine.parts[0].colour.name, "Black");
});

test("a model we couldn't read doesn't invent a colour", () => {
  const s = buildFurnitureSheet({ furniture: [bed("b", -5)], rooms, ...plan, finishes: new Map([["bed-custom-real", null]]) });
  const p = s.rooms[0].lines[0].parts[0];
  assert.equal(p.colour.hex, "");
  assert.equal(p.colour.name, "As in the picture");
});
