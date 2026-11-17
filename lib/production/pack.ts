/**
 * Kitchen order pack — lib/production/pack.ts
 * ============================================================================
 * One zip per order, for the factory:
 *
 *   README.txt                  what each file is
 *   <order>.pdf                 cover, plan, elevations, schedules, rules
 *   <order>.xlsx                cabinets, cut list, banding, hardware, worktops, appliances, rules
 *   cutlist.csv                 the cut list for cutting optimisers
 *   drawings/plan.dxf           the kitchen in the room
 *   drawings/elevation-R*.dxf   each wall of cabinets, dimensioned
 *   drawings/parts.dxf          every board flat, labelled, banded edges marked
 *   3d/kitchen.glb              the parts in place (metres), one node per part
 *   3d/kitchen.obj + .mtl       the same (millimetres)
 *   order.json                  the design data the pack was made from
 *
 * Pure apart from jsPDF, so the browser makes it today and the server can
 * make the same pack for the factory API later.
 */

import { kitchenParts, type KitchenParts } from "./parts";
import { DEFAULT_RULES, type ProductionRules } from "./rules";
import { elevationDrawings, partsDrawing, planDrawing } from "./drawing";
import { toDxf } from "./dxf";
import { toGlb, toObj } from "./model3d";
import { orderPdf } from "./pdf";
import { cutListRows, orderSheets } from "./workbook";
import { csv, xlsx } from "./xlsx";
import { zip, type ZipEntry } from "./zip";
import type { KitchenOrderInput } from "./placement";

export interface OrderPack {
  filename: string;
  zip: Uint8Array;
  files: ZipEntry[];
  parts: KitchenParts;
}

const safe = (s: string) => s.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "order";

export function buildOrderPack(input: KitchenOrderInput, rules: ProductionRules = DEFAULT_RULES): OrderPack {
  if (!input.runs.length) throw new Error("This design has no kitchen cabinets yet.");
  const k = kitchenParts(input, rules);
  const plan = planDrawing(input, k);
  const elevations = elevationDrawings(input, k);
  const flat = partsDrawing(k);
  const base = `order-${safe(input.order.orderNo)}`;
  const { obj, mtl } = toObj(input, k);

  const files: ZipEntry[] = [
    { name: "README.txt", data: readme(input, k, rules, base, elevations.map(e => e.name)) },
    { name: `${base}.pdf`, data: orderPdf(input, k, rules, { plan, elevations }) },
    { name: `${base}.xlsx`, data: xlsx(orderSheets(input, k, rules)) },
    { name: "cutlist.csv", data: csv(cutListRows(k, rules)) },
    { name: "drawings/plan.dxf", data: toDxf(plan) },
    ...elevations.map(e => ({ name: `drawings/${e.name}.dxf`, data: toDxf(e) })),
    { name: "drawings/parts.dxf", data: toDxf(flat) },
    { name: "3d/kitchen.glb", data: toGlb(input, k) },
    { name: "3d/kitchen.obj", data: obj },
    { name: "3d/kitchen.mtl", data: mtl },
    { name: "order.json", data: JSON.stringify({ rules: rules.id, ...input }, null, 2) },
  ];
  const folder = `${base}/`;
  return { filename: `${base}.zip`, zip: zip(files.map(f => ({ name: folder + f.name, data: f.data }))), files, parts: k };
}

function readme(input: KitchenOrderInput, k: KitchenParts, rules: ProductionRules, base: string, elevations: string[]): string {
  const o = input.order;
  return [
    `NOOI KITCHEN ORDER PACK`,
    `Order ${o.orderNo} | ${o.project} | ${o.client} | ${o.date}`,
    ``,
    `All sizes are in millimetres. Cabinet codes (R1-01 ...) are the same in every file:`,
    `R = run (one wall of cabinets), then the unit number from the left; W = the wall cabinet above it.`,
    `Part IDs add the part: SL/SR sides, BT bottom, TP top, RF/RB top rails, BK back, FS fixed shelf,`,
    `SH shelf, DR door, DF drawer front, FF false front, PN dishwasher panel, PL plinth, WT worktop.`,
    ``,
    `FILES`,
    `  ${base}.pdf            Everything to check by eye: plan, elevations, schedules, cut list, rules.`,
    `  ${base}.xlsx           Cabinets, cut list, edge banding, hardware, worktops, appliances, rules.`,
    `  cutlist.csv            The cut list alone, for cutting optimisers (UTF-8, comma separated).`,
    `  drawings/plan.dxf      The kitchen in the room (DXF R12).`,
    ...elevations.map(e => `  drawings/${e}.dxf  Front view of ${e.replace("elevation-", "run ")}, dimensioned.`),
    `  drawings/parts.dxf     Every board flat with its ID and size; red lines = banded edges.`,
    `  3d/kitchen.glb         3D model of every part in place (metres). Each part is named by its ID.`,
    `  3d/kitchen.obj/.mtl    The same model in millimetres, for CAD software.`,
    `  order.json             The design data this pack was made from.`,
    ``,
    `TOTALS`,
    `  ${k.cabinets.filter(c => c.type !== "appliance").length} cabinets, ${k.parts.length} boards, ${k.worktops.length} worktop piece(s), ${k.appliances.length} appliance(s).`,
    ``,
    `CONSTRUCTION RULES`,
    `  This pack uses "${rules.name}". The full list is on the last page of the PDF`,
    `  and on the Rules sheet. If your factory builds differently (board thickness, back`,
    `  fitting, gaps, hinges, banding ...), tell us and every future order will use your rules.`,
    ``,
    `PLEASE CHECK`,
    ...k.warnings.map(w => `  - ${w}`),
    ``,
  ].join("\r\n");
}
