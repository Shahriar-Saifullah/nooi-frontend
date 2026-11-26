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
import { kitchenSpec } from "./spec";
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

/**
 * `parts: false` (default): drawings + structured details — the plan and
 * elevations (PDF + DXF), cabinet schedule, factory details form, worktops
 * and appliances. `parts: true` adds the cut list, edge banding, hardware,
 * flat parts drawing, cutting CSV, 3D parts model and the rules used.
 */
export function buildOrderPack(input: KitchenOrderInput, rules: ProductionRules = DEFAULT_RULES, opts: { parts?: boolean } = {}): OrderPack {
  const parts = opts.parts ?? false;
  if (!input.runs.length) throw new Error("This design has no kitchen cabinets yet.");
  const k = kitchenParts(input, rules);
  const plan = planDrawing(input, k);
  const elevations = elevationDrawings(input, k);
  const base = `order-${safe(input.order.orderNo)}`;
  const spec = kitchenSpec(input, k, rules);

  const files: ZipEntry[] = [
    { name: "README.txt", data: readme(input, k, rules, base, elevations.map(e => e.name), parts) },
    { name: `${base}.pdf`, data: orderPdf(input, k, rules, { plan, elevations }, { parts, spec }) },
    { name: `${base}.xlsx`, data: xlsx(orderSheets(input, k, rules, { parts, spec })) },
    { name: "drawings/plan.dxf", data: toDxf(plan) },
    ...elevations.map(e => ({ name: `drawings/${e.name}.dxf`, data: toDxf(e) })),
  ];
  if (parts) {
    const { obj, mtl } = toObj(input, k);
    files.push(
      { name: "cutlist.csv", data: csv(cutListRows(k, rules)) },
      { name: "drawings/parts.dxf", data: toDxf(partsDrawing(k)) },
      { name: "3d/kitchen.glb", data: toGlb(input, k) },
      { name: "3d/kitchen.obj", data: obj },
      { name: "3d/kitchen.mtl", data: mtl },
    );
  }
  files.push({ name: "order.json", data: JSON.stringify({ rules: rules.id, parts, factory_details: spec, ...input }, null, 2) });
  const folder = `${base}/`;
  return { filename: `${base}.zip`, zip: zip(files.map(f => ({ name: folder + f.name, data: f.data }))), files, parts: k };
}

function readme(input: KitchenOrderInput, k: KitchenParts, rules: ProductionRules, base: string, elevations: string[], parts: boolean): string {
  const o = input.order;
  const cabinets = k.cabinets.filter(c => c.type !== "appliance" && c.type !== "filler").length;
  return [
    parts ? `NOOI KITCHEN ORDER PACK (drawings + parts list)` : `NOOI KITCHEN ORDER: DRAWINGS AND DETAILS`,
    `Order ${o.orderNo} | ${o.project} | ${o.client} | ${o.date}`,
    ``,
    `All sizes are in millimetres and come from the design; please confirm them.`,
    `Cabinet codes (R1-01 ...) are the same in every file: R = run (one wall of cabinets),`,
    `then the unit number from the left; W = the wall cabinet above it; FL = corner filler.`,
    ...(parts ? [
      `Part IDs add the part: SL/SR sides, BT bottom, TP top, RF/RB top rails, BK back, FS fixed shelf,`,
      `SH shelf, DR door, DF drawer front, FF false front, PN dishwasher panel, PL plinth, WT worktop.`,
    ] : []),
    ``,
    `FILES`,
    `  ${base}.pdf            Plan, elevations, cabinet schedule, details for the factory, worktops, appliances${parts ? ", cut list, hardware, rules" : ""}.`,
    `  ${base}.xlsx           The same as sheets: cabinets, factory details (with Chinese labels), worktops, appliances${parts ? ", cut list, edge banding, hardware, rules" : ""}.`,
    `  drawings/plan.dxf      The kitchen in the room (DXF R12, opens in AutoCAD and most CAD software).`,
    ...elevations.map(e => `  drawings/${e}.dxf  Front view of ${e.replace("elevation-", "run ")}, dimensioned.`),
    ...(parts ? [
      `  cutlist.csv            The cut list alone, for cutting optimisers (UTF-8, comma separated).`,
      `  drawings/parts.dxf     Every board flat with its ID and size; red lines = banded edges.`,
      `  3d/kitchen.glb         3D model of every part in place (metres). Each part is named by its ID.`,
      `  3d/kitchen.obj/.mtl    The same model in millimetres, for CAD software.`,
    ] : []),
    `  order.json             The design data this was made from.`,
    ``,
    `TOTALS`,
    `  ${cabinets} cabinets, ${k.worktops.length} worktop piece(s), ${k.appliances.length} appliance(s)${parts ? `, ${k.parts.length} boards` : ""}.`,
    ``,
    ...(parts ? [
      `CONSTRUCTION RULES`,
      `  The parts list uses "${rules.name}". The full list is on the last page of the PDF`,
      `  and on the Rules sheet. If your factory builds differently (board thickness, back`,
      `  fitting, gaps, hinges, banding ...), tell us and every future order will use your rules.`,
      ``,
    ] : [
      `PARTS LIST`,
      `  Nooi can add a full parts list (cut list, edge banding, hardware, 3D parts) if it helps.`,
      ``,
    ]),
    `PLEASE CHECK`,
    ...k.warnings.map(w => `  - ${w}`),
    ``,
  ].join("\r\n");
}
