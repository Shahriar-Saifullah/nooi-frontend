/** Naming materials and summarising a model's parts (lib/export/finishParts). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { materialKind, summariseParts, styledParts } from "@/lib/export/finishParts";

const look = (o: Partial<Parameters<typeof materialKind>[0]>) =>
  materialKind({ name: "", metalness: 0, roughness: 0.5, opacity: 1, transmission: 0, textured: false, hex: "#888888", ...o });

test("the model's own names win", () => {
  assert.equal(look({ name: "Sofa_Fabric_01" }), "Fabric");
  assert.equal(look({ name: "M_WalnutVeneer" }), "Walnut wood");
  assert.equal(look({ name: "legs_chrome" }), "Metal (chrome)");
  assert.equal(look({ name: "velvet-cushion" }), "Velvet");
  assert.equal(look({ name: "Glass.001" }), "Glass");
  assert.equal(look({ name: "Material.003 marble_white.jpg" }), "Marble");
});

test("unnamed materials are judged by how they render", () => {
  assert.equal(look({ name: "Material.001", metalness: 0.9 }), "Metal");
  assert.equal(look({ name: "Material.002", transmission: 0.8 }), "Glass");
  assert.equal(look({ name: "mat1", textured: true, hex: "#8a5a32" }), "Wood");
  assert.equal(look({ name: "mat2", textured: true, roughness: 0.95, hex: "#7080a0" }), "Fabric");
  assert.equal(look({ name: "mat3", roughness: 0.2 }), "Gloss finish");
});

test("parts merge, slivers drop, shares add up", () => {
  const c = (name: string) => ({ hex: "#000000", name });
  const out = summariseParts([
    { material: "Fabric", colour: c("Beige"), share: 50 },
    { material: "Fabric", colour: c("Beige"), share: 20 },
    { material: "Oak wood", colour: c("Oak brown"), share: 25 },
    { material: "Metal", colour: c("Black"), share: 5 },     // 5 %: dropped
  ]);
  assert.deepEqual(out.map(p => p.material), ["Fabric", "Oak wood"]);
  assert.ok(Math.abs(out.reduce((a, p) => a + p.share, 0) - 1) < 1e-9);
  const st = styledParts(out, "#ffffff", "Leather");
  assert.equal(st.length, 1);
  assert.equal(st[0].colour.name, "White");
});

test("timber is named by its tone", async () => {
  const { partColourName } = await import("@/lib/export/colourName");
  assert.equal(partColourName("#f3cca8", "Wood"), "Light oak");
  assert.equal(partColourName("#5c4831", "Walnut wood"), "Walnut");
  assert.equal(partColourName("#f3cca8", "Fabric"), "Beige");
});
