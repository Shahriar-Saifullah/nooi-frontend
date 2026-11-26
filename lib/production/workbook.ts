/**
 * The order workbook — lib/production/workbook.ts
 * ============================================================================
 * Sheets: Summary · Cabinets · Cut list · Edge banding · Hardware · Worktops ·
 * Appliances · Rules. The cut list uses the column layout cutting optimisers
 * import (part, material, thickness, length, width, qty, grain, banding per
 * edge), and is also written as cutlist.csv.
 */

import { bandingTotals, countertopName, frontFinishName, hardwareName, materialTotals, type KitchenParts } from "./parts";
import type { KitchenOrderInput } from "./placement";
import type { ProductionRules } from "./rules";
import type { Cell, Sheet } from "./xlsx";
import { specRows, type SpecKey } from "./spec";

export const CUT_HEADER = ["Part ID", "Cabinet", "Part", "Material", "Thickness", "Length", "Width", "Qty", "Grain",
  "Edge L1", "Edge L2", "Edge W1", "Edge W2", "Cut length", "Cut width", "Notes"];

export function cutListRows(k: KitchenParts, rules: ProductionRules): Cell[][] {
  const band = (code: string) => (code === "F" ? rules.frontBanding.material : code === "C" ? rules.carcassBanding.material : "");
  return [CUT_HEADER, ...k.parts.map(p => [
    p.id, p.cabinet, p.name, p.material, p.thickness, p.length, p.width, p.qty, p.grain === "length" ? "Along length" : "None",
    band(p.edges.L1), band(p.edges.L2), band(p.edges.W1), band(p.edges.W2), p.cutLength, p.cutWidth, p.notes,
  ])];
}

/**
 * `parts: false` (the default pack) is drawings + structured details only:
 * what the first factories asked for. `parts: true` adds the cut list, edge
 * banding, hardware and the construction rules behind them.
 */
export function orderSheets(input: KitchenOrderInput, k: KitchenParts, rules: ProductionRules, opts: { parts: boolean; spec: Record<SpecKey, string> }): Sheet[] {
  const o = input.order, s = input.style;
  const mats = materialTotals(k.parts);
  const bands = bandingTotals(k.parts, rules);
  const summary: Cell[][] = [
    ["Nooi kitchen order pack", ""],
    ["Order", o.orderNo], ["Client", o.client], ["Project", o.project], ["Date", o.date],
    ...(o.designer ? [["Designer", o.designer]] : []),
    ...(opts.parts ? [["Construction rules", rules.name]] : []),
    ["", ""],
    ["Fronts", frontFinishName(s)], ["Handles", `${s.handleStyle}, ${hardwareName(s)}`], ["Worktop", countertopName(s.countertop)],
    ["", ""],
    ["Runs", k.runs.map(r => `${r.code} ${r.length} mm`).join(", ")],
    ["Cabinets", k.cabinets.filter(c => c.type !== "appliance" && c.type !== "filler").length],
    ["Worktop pieces", k.worktops.length],
    ...(opts.parts ? [
      ["Boards (pieces)", k.parts.length],
      ["", ""],
      ["Board", "Pieces", "Area m²"],
      ...mats.map(m => [`${m.material}, ${m.thickness} mm`, m.pieces, m.areaM2]),
      ["", ""],
      ["Edge banding", "Metres (incl. 10 % extra)"],
      ...bands.map(b => [b.material, b.metres]),
    ] : []),
    ["", ""],
    ["Please check", ""],
    ...k.warnings.map(w => ["•", w]),
    ...(o.notes ? [["", ""], ["Notes", o.notes]] : []),
  ];
  const boldRows = summary.map((r, i) => (i === 0 || ["Board", "Edge banding", "Please check"].includes(String(r[0])) ? i : -1)).filter(i => i >= 0);

  return [
    { name: "Summary", rows: summary, header: false, widths: [34, 70, 12], bold: boldRows },
    {
      name: "Cabinets",
      rows: [["Cabinet", "Run", "Type", "Description", "Width", "Height", "Depth", "From run start", "Bottom above floor", "Doors", "Drawers", "Contents", "Notes"],
        ...k.cabinets.map(c => [c.code, c.run, c.type, c.label, c.width, c.height, c.depth, c.x, c.y,
          c.fronts.filter(f => f.kind === "door").length, c.fronts.filter(f => f.kind === "drawer").length, c.contents, c.notes])],
    },
    { name: "Factory details", rows: [["Item", "中文", "Value"], ...specRows(opts.spec)], widths: [40, 22, 90] },
    ...(opts.parts ? partSheets(k, rules) : []),
    {
      name: "Worktops",
      rows: [["Piece", "Run", "Material", "Length", "Depth", "Thickness", "Cut-out", "Centre from left end", "Front edge to cut-out", "Cut-out width", "Cut-out depth", "Notes"],
        ...k.worktops.flatMap(w => (w.cutouts.length ? w.cutouts : [null]).map((c, i) => [
          i === 0 ? w.id : "", i === 0 ? w.run : "", i === 0 ? w.material : "", i === 0 ? w.length : "", i === 0 ? w.depth : "", i === 0 ? w.thickness : "",
          c?.label ?? "", c?.x ?? "", c?.fromFront ?? "", c?.width ?? "", c?.depth ?? "", i === 0 ? w.notes : ""]))],
    },
    { name: "Appliances", rows: [["Cabinet", "Run", "Appliance", "Size", "Notes"], ...k.appliances.map(a => [a.cabinet, a.run, a.item, a.size, a.notes])] },
    ...(opts.parts ? [{ name: "Rules", rows: [["Rule", "Value"], ...rulesRows(rules)], widths: [36, 70] }] : []),
  ];
}

function partSheets(k: KitchenParts, rules: ProductionRules): Sheet[] {
  return [
    { name: "Cut list", rows: cutListRows(k, rules), widths: [13, 9, 20, 36, 10, 9, 9, 5, 12, 18, 18, 18, 18, 11, 11, 50] },
    {
      name: "Edge banding",
      rows: [["Part ID", "Material", "Edge", "Length mm"], ...k.parts.flatMap(p => (["L1", "L2", "W1", "W2"] as const)
        .filter(e => p.edges[e])
        .map(e => [p.id, p.edges[e] === "F" ? rules.frontBanding.material : rules.carcassBanding.material, e, e.startsWith("L") ? p.length : p.width]))],
    },
    { name: "Hardware", rows: [["Item", "Finish", "Qty", "Used in"], ...k.hardware.map(h => [h.item, h.finish, h.qty, h.usedIn.join(", ")])] },
  ];
}

export function rulesRows(r: ProductionRules): Cell[][] {
  return [
    ["Rule set", r.name],
    ["Carcass board", `${r.carcassBoard.material}, ${r.carcassBoard.thickness} mm`],
    ["Back panel", `${r.backBoard.material}, ${r.backBoard.thickness} mm, ${r.backFitting === "grooved" ? `in a ${r.backGroove.depth} mm groove ${r.backGroove.setback} mm from the rear` : "nailed on"}`],
    ["Fronts", `${r.frontBoard.material}, ${r.frontBoard.thickness} mm, full overlay`],
    ["Plinth", `${r.plinthBoard.material}, ${r.plinthBoard.thickness} mm, set back ${r.plinthSetback} mm`],
    ["Base cabinet top", `two rails ${r.baseTopRails.width} mm wide (front rail only on sink cabinets)`],
    ["Gap between fronts", `${r.frontGap} mm`],
    ["Sink false front", r.sinkFalseFront ? `${r.sinkFalseFront} mm` : "none"],
    ["Shelves", `set back ${r.shelf.frontSetback} mm, ${r.shelf.sideClearance} mm clearance each side`],
    ["Carcass edge banding", `${r.carcassBanding.material} on visible front edges`],
    ["Front edge banding", `${r.frontBanding.material} on all four edges`],
    ["Cut sizes", r.deductBanding ? "finished size minus banding thickness on each banded edge" : "same as finished size"],
    ["Worktop overhang", `${r.worktopFrontOverhang} mm past the fronts`],
    ["Worktop thickness", Object.entries(r.worktopThickness).map(([k2, v]) => `${k2}: ${v} mm`).join(", ")],
    ["Longest worktop piece", Object.entries(r.worktopMaxLength).map(([k2, v]) => `${k2}: ${v} mm`).join(", ")],
    ["Hinges per door", r.hinges.map(h => (h.upTo >= 99999 ? `taller: ${h.count}` : `up to ${h.upTo} mm: ${h.count}`)).join(", ")],
    ["Hinge", r.hingeName],
    ["Drawer runners", `${r.runnerName}; lengths ${r.runnerLengths.join("/")} mm`],
    ["Legs", `${r.legs.normal} per cabinet, ${r.legs.wide} when wider than ${r.legs.wideFrom} mm`],
  ];
}
