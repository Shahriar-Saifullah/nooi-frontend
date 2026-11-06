/** Round 2: made-to-measure pricing, options, kitchen quotes, window styles — `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanOptionGroups, cleanPricing, configKey, normalizeConfig, priceLine } from "@/lib/listings/configure";
import { clampWidth, lineConfig, shopPiecePrice } from "@/lib/listings/cartLine";
import { quoteKitchen, cleanKitchenPrices, DEFAULT_KITCHEN_PRICES, handlesFor } from "@/lib/kitchen/pricing";
import { windowParts, windowSpanY, WINDOW_STYLES, frameFinish } from "@/lib/walls/windowStyles";
import { placeOpening, type PlanOpening } from "@/lib/walls/openings";
import { pricingProblem, pricingPayload, EMPTY_PRICING } from "@/lib/listings/pricingForm";
import { catalogById } from "@/lib/furniture/catalog";

const sofa = {
  price_unit: "metre" as const, min_width_cm: 160, max_width_cm: 400, width_cm: 240,
  options: cleanOptionGroups([
    { name: "Fabric", kind: "fabric", choices: [{ name: "Linen" }, { name: "Velvet green", code: "VG-12", price_delta: 150 }] },
  ]),
};

test("per-metre price follows the width; deltas per metre", () => {
  const r = priceLine(sofa, 1000, { width_cm: 320, options: { fabric: "velvet-green" } });
  assert.ok(r.ok);
  assert.equal(r.unit_price, 1150 * 3.2);
  assert.equal(r.label, "320 cm wide · Fabric: Velvet green (VG-12)");
  assert.equal((priceLine(sofa, 1000, { width_cm: 420 }) as { error: string }).error, "WIDTH_OUT_OF_RANGE");
});

test("lines always carry a width for per-metre listings, clamped to the range", () => {
  assert.deepEqual(lineConfig(sofa, 240, {}), { width_cm: 240 });
  assert.deepEqual(lineConfig(sofa, 240, { width_cm: 999 }), { width_cm: 400 });
  assert.deepEqual(lineConfig({ price_unit: "unit" }, 240, { width_cm: 300 }), {});
  assert.equal(clampWidth(sofa, 100.4), 160);
  assert.equal(configKey(lineConfig(sofa, 240, { width_cm: 300, options: { fabric: "linen" } })), "w300|fabric=linen");
  assert.equal(configKey(normalizeConfig({})), "");
});

test("a stretched shop piece is priced at its drawn width", () => {
  const p = shopPiecePrice({ price: 1000, priceUnit: "metre", minWidthCm: 160, maxWidthCm: 400 }, 240, 300.2);
  assert.equal(p.widthCm, 300);
  assert.equal(p.unitPrice, 3000);
  const q = shopPiecePrice({ price: 800 }, 240, 300);
  assert.equal(q.unitPrice, 800);
  assert.equal(q.perMetre, false);
});

test("vendor pricing form: checks and payload", () => {
  assert.equal(pricingProblem(EMPTY_PRICING, 200), null);
  assert.match(pricingProblem({ ...EMPTY_PRICING, price_unit: "metre", min_width_cm: "300", max_width_cm: "200" }, 200)!, /bigger/);
  assert.match(pricingProblem({ ...EMPTY_PRICING, price_unit: "metre", min_width_cm: "250" }, 200)!, /below/);
  assert.match(pricingProblem({ ...EMPTY_PRICING, options: [{ name: "", kind: "legs", choices: [] }] }, 200)!, /name/);
  const pay = pricingPayload({ price_unit: "metre", min_width_cm: "160", max_width_cm: "", options: [{ name: "Legs", kind: "legs", choices: [{ name: "Brass", price_delta: "40" }] }] });
  assert.equal(pay.min_width_cm, 160);
  assert.equal(pay.max_width_cm, undefined);
  assert.equal(cleanOptionGroups(pay.options)[0].choices[0].price_delta, 40);
  assert.deepEqual(cleanPricing(pay, 200), { price_unit: "metre", min_width_cm: 160, max_width_cm: 500 });
});

test("kitchen quote: per metre, countertop skips tall units, appliances optional", () => {
  const data = {
    runs: [{ modules: [
      { kind: "sink-base", width: 0.8, upper: "cabinet" as const },
      { kind: "cooktop-gas", width: 0.75, upper: "hood" as const },
      { kind: "fridge-single", width: 0.76, upper: null },
    ] }],
    style: { frontStyle: "shaker", handleStyle: "bar", front: "wood-oak", countertop: "quartz-white", hardware: "brass" },
  };
  const p = DEFAULT_KITCHEN_PRICES;
  const q = quoteKitchen(data, p);
  const top = q.lines.find(l => l.key === "countertop")!;
  assert.equal(top.qty, 1.55);
  assert.equal(q.lines.find(l => l.key === "hood")!.qty, 1);
  const f = 1.12 * 1.2;
  assert.equal(q.lines.find(l => l.key === "cab:sink-base")!.amount, Math.round(0.8 * 1700 * f * 100) / 100);
  assert.equal(q.lines.some(l => l.key.startsWith("app:")), false);
  const withApps = quoteKitchen(data, p, { includeAppliances: true });
  assert.ok(withApps.total > q.total);
  assert.equal(withApps.lines.filter(l => l.key.startsWith("app:")).length, 3);
  assert.equal(handlesFor({ kind: "sink-base", width: 0.8, upper: "cabinet" }), 4);
  assert.equal(q.metres, 2.31);
});

test("kitchen price list keeps defaults for anything bad", () => {
  const c = cleanKitchenPrices({ upper_per_m: "abc", countertop_per_m: { "new-stone": 1500 } });
  assert.equal(c.upper_per_m, DEFAULT_KITCHEN_PRICES.upper_per_m);
  assert.equal(c.countertop_per_m["new-stone"], 1500);
  assert.deepEqual(cleanKitchenPrices(null), DEFAULT_KITCHEN_PRICES);
});

test("window styles: every style has a frame inside the opening", () => {
  for (const s of WINDOW_STYLES) {
    const span = windowSpanY(s.id, 0.9, 2.1, 2.8);
    const parts = windowParts(s.id, 1, 2.2, span.sill, span.head, 0.2);
    assert.ok(parts.some(p => p.mat === "glass"), s.id);
    for (const p of parts) {
      assert.ok(p.a0 >= 1 - 1e-9 && p.a1 <= 2.2 + 1e-9, `${s.id} along`);
      assert.ok(p.y0 >= span.sill - 1e-9 && p.y1 <= span.head + 1e-9, `${s.id} height`);
    }
  }
  assert.deepEqual(windowSpanY("full-height", 0.9, 2.1, 2.8), { sill: 0.04, head: 2.4 });
  assert.equal(frameFinish("nope").id, "wood");
  assert.ok(windowParts("mashrabiya", 0, 1.2, 0.9, 2.1, 0.2).filter(p => p.mat === "lattice").length > 10);
});

test("moving a window keeps its style", () => {
  const walls = [{ x1: 10, y1: 20, x2: 90, y2: 20, thickness: 1.2 }];
  const size = { totalW: 10, totalD: 8 };
  const ops: PlanOpening[] = [{ type: "window", wall: "horizontal", x: 500, y: 200, width: 100, wall_id: "w0", style: "mashrabiya", frame: "black" }];
  const moved = placeOpening({ openings: ops, walls, size, wallIndex: 0, centre: 1, widthM: 1.2, type: "window", skip: 0 });
  assert.ok(moved);
  assert.equal(moved!.style, "mashrabiya");
  assert.equal(moved!.frame, "black");
});

test("appliances are in the catalogue with the right mounts", () => {
  assert.equal(catalogById("ac-split-18k")?.mountType, "wall");
  assert.equal(catalogById("ac-floor-48k")?.mountType, "floor");
  assert.equal(catalogById("fan-ceiling-52")?.mountType, "ceiling");
  assert.equal(catalogById("socket-double")?.procedural, "socket");
  assert.equal(catalogById("switch-3gang")?.category, "appliances");
});
