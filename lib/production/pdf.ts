/**
 * The order PDF — lib/production/pdf.ts
 * ============================================================================
 * One printable document for the factory to check by eye: cover with the
 * order and totals, the plan and each wall elevation (at a true scale where
 * one fits A4), the cabinet schedule, the cut list, hardware, worktops,
 * appliances and the construction rules used. A4 landscape.
 */

import { jsPDF } from "jspdf";
import { bounds, LAYERS, type Drawing, type Ent } from "./drawing";
import { bandingTotals, countertopName, frontFinishName, hardwareName, materialTotals, type KitchenParts } from "./parts";
import type { KitchenOrderInput } from "./placement";
import type { ProductionRules } from "./rules";
import { rulesRows } from "./workbook";
import { SPEC_FIELDS, type SpecKey } from "./spec";

const PAGE_W = 297, PAGE_H = 210, M = 12;
const BRAND: [number, number, number] = [0, 56, 50];
const ACCENT: [number, number, number] = [199, 222, 125];

/** jsPDF's built-in fonts are Latin-1 only. */
const t = (s: unknown) => String(s ?? "")
  .replace(/[–—]/g, "-").replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/•/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .replace(/[^\x20-\xff]/g, "?");

const ACI: Record<number, [number, number, number]> = {
  1: [205, 40, 40], 2: [190, 140, 0], 3: [40, 140, 60], 4: [0, 140, 160], 5: [40, 80, 200], 6: [160, 40, 160],
  7: [20, 20, 20], 8: [120, 120, 120], 9: [170, 170, 170], 30: [210, 110, 20],
};

const SCALES = [10, 20, 25, 30, 40, 50, 75, 100, 125, 150, 200, 250];

function frame(doc: jsPDF, title: string, input: KitchenOrderInput, page: number) {
  doc.setDrawColor(...BRAND); doc.setLineWidth(0.4); doc.setLineDashPattern([], 0);
  doc.line(M, PAGE_H - 10, PAGE_W - M, PAGE_H - 10);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...BRAND);
  doc.text("nooi", M, PAGE_H - 5.5);
  doc.setFont("helvetica", "normal"); doc.setTextColor(90, 90, 90);
  doc.text(t(`${title}  |  ${input.order.project}  |  Order ${input.order.orderNo}  |  ${input.order.date}`), M + 10, PAGE_H - 5.5);
  doc.text(`Page ${page}`, PAGE_W - M, PAGE_H - 5.5, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

function heading(doc: jsPDF, s: string, y = M + 6) {
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...BRAND);
  doc.text(t(s), M, y);
  doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal");
}

/** Draw a drawing into a box, at the largest standard scale that fits (or just fitted). */
function drawDrawing(doc: jsPDF, d: Drawing, box: { x: number; y: number; w: number; h: number }): string {
  const [x0, y0, x1, y1] = bounds(d.ents);
  const fit = Math.min(box.w / (x1 - x0 || 1), box.h / (y1 - y0 || 1));
  const std = SCALES.find(n => 1 / n <= fit);
  const s = std ? 1 / std : fit;
  const w = (x1 - x0) * s, h = (y1 - y0) * s;
  const ox = box.x + (box.w - w) / 2, oy = box.y + (box.h - h) / 2;
  const X = (x: number) => ox + (x - x0) * s;
  const Y = (y: number) => oy + (y1 - y) * s;
  const style = (e: Ent) => {
    const L = LAYERS[e.layer];
    const c = ACI[L.color] ?? [0, 0, 0];
    doc.setDrawColor(...c); doc.setTextColor(...c);
    doc.setLineDashPattern(L.dashed ? [1.2, 0.8] : [], 0);
    doc.setLineWidth(e.layer === "WALLS" ? 0.35 : e.layer === "DIMS" || e.layer === "HANDLES" ? 0.12 : 0.2);
  };
  for (const e of d.ents) {
    style(e);
    if (e.t === "line") doc.line(X(e.a[0]), Y(e.a[1]), X(e.b[0]), Y(e.b[1]));
    else if (e.t === "poly") {
      const pts = e.pts.map(([x, y]) => [X(x), Y(y)] as [number, number]);
      for (let i = 0; i < pts.length - (e.closed ? 0 : 1); i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        doc.line(a[0], a[1], b[0], b[1]);
      }
    } else {
      const pt = Math.max(3.5, (e.h * s * 2.835) / 0.72);
      doc.setFontSize(pt);
      doc.text(t(e.text), X(e.at[0]), Y(e.at[1]), { align: e.align ?? "left", angle: e.rot ?? 0 });
    }
  }
  doc.setLineDashPattern([], 0); doc.setTextColor(0, 0, 0); doc.setDrawColor(0, 0, 0);
  return std ? `Scale 1:${std} on A4` : "Not to scale";
}

/** A simple table with a repeated header row; returns the page count used. */
function table(
  doc: jsPDF, startY: number, cols: { title: string; w: number; align?: "left" | "right" }[], rows: unknown[][],
  newPage: () => void, size = 7.5,
): void {
  const lh = size * 0.42 + 1.6;
  let y = startY;
  const header = () => {
    doc.setFillColor(230, 239, 208); doc.rect(M, y - lh + 1.2, PAGE_W - 2 * M, lh, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(size);
    let x = M + 1;
    for (const c of cols) { doc.text(t(c.title), c.align === "right" ? x + c.w - 2 : x, y, { align: c.align ?? "left" }); x += c.w; }
    doc.setFont("helvetica", "normal");
    y += lh;
  };
  header();
  for (const r of rows) {
    // wrap long cells
    const cells = r.map((v, i) => doc.splitTextToSize(t(v), cols[i].w - 2) as string[]);
    const lines = Math.max(1, ...cells.map(c => c.length));
    if (y + lines * lh > PAGE_H - 14) { newPage(); y = M + 14; header(); }
    doc.setFontSize(size);
    let x = M + 1;
    cells.forEach((c, i) => {
      c.forEach((line, j) => doc.text(line, cols[i].align === "right" ? x + cols[i].w - 2 : x, y + j * lh, { align: cols[i].align ?? "left" }));
      x += cols[i].w;
    });
    doc.setDrawColor(225, 225, 225); doc.setLineWidth(0.1);
    doc.line(M, y + (lines - 1) * lh + 1.4, PAGE_W - M, y + (lines - 1) * lh + 1.4);
    y += lines * lh;
  }
}

export function orderPdf(
  input: KitchenOrderInput, k: KitchenParts, rules: ProductionRules, drawings: { plan: Drawing; elevations: Drawing[] },
  opts: { parts: boolean; spec: Record<SpecKey, string> },
): Uint8Array {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  let page = 1;
  const next = (title: string) => { doc.addPage(); page++; frame(doc, title, input, page); };
  const o = input.order, s = input.style;

  // ── cover ──
  doc.setFillColor(...BRAND); doc.rect(0, 0, PAGE_W, 34, "F");
  doc.setFillColor(...ACCENT); doc.rect(0, 34, PAGE_W, 1.5, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(22);
  doc.text(opts.parts ? "Kitchen order pack" : "Kitchen order: drawings", M, 17);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  doc.text(t(`${o.project}  |  Order ${o.orderNo}`), M, 26);
  doc.setTextColor(0, 0, 0);
  const kv = (label: string, value: unknown, x: number, y: number) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text(t(label), x, y);
    doc.setFont("helvetica", "normal"); doc.text(doc.splitTextToSize(t(value), 92) as string[], x + 36, y);
  };
  let y = 48;
  [["Client", o.client], ["Project", o.project], ["Order", o.orderNo], ["Date", o.date], ...(o.designer ? [["Designer", o.designer]] : []),
    ["Fronts", frontFinishName(s)], ["Handles", `${s.handleStyle}, ${hardwareName(s)}`], ["Worktop", countertopName(s.countertop)],
    ...(opts.parts ? [["Rules", rules.name]] : [])].forEach(([a, b]) => { kv(a, b, M, y); y += 7; });

  y = 48;
  const x2 = 160;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...BRAND); doc.text("In this order", x2, y); doc.setTextColor(0, 0, 0);
  y += 7;
  const counts: [string, unknown][] = [
    ["Runs", k.runs.map(r => `${r.code} (${r.length} mm)`).join(", ")],
    ["Cabinets", k.cabinets.filter(c => c.type !== "appliance" && c.type !== "filler").length],
    ...(opts.parts ? [["Boards", `${k.parts.length} pieces`] as [string, unknown]] : []),
    ["Worktop", `${k.worktops.length} piece${k.worktops.length === 1 ? "" : "s"}`],
    ["Appliances", k.appliances.length],
  ];
  counts.forEach(([a, b]) => { kv(a, b, x2, y); y += 6; });
  y += 3;
  if (opts.parts) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("Boards", x2, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    for (const m of materialTotals(k.parts)) { doc.text(doc.splitTextToSize(t(`${m.material}, ${m.thickness} mm: ${m.pieces} pcs, ${m.areaM2} m²`), PAGE_W - M - x2) as string[], x2, y); y += 5; }
    for (const b of bandingTotals(k.parts, rules)) { doc.text(t(`${b.material}: ${b.metres} m`), x2, y); y += 5; }
  }

  y = Math.max(y, 120) + 4;
  doc.setFillColor(248, 246, 238); doc.rect(M, y - 5, PAGE_W - 2 * M, 8 + k.warnings.length * 5.5 + 12, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...BRAND); doc.text("Please check", M + 3, y + 1); doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  k.warnings.forEach((w, i) => doc.text(t(`- ${w}`), M + 3, y + 7 + i * 5.5));
  doc.text(t(opts.parts
    ? "The parts list uses Nooi's standard construction rules (last page). Mark up anything your factory does differently and we will match it."
    : "Drawings and details for the factory to confirm. Sizes and options are guidance; a parts list can be added on request."), M + 3, y + 7 + k.warnings.length * 5.5 + 2);
  frame(doc, "Cover", input, page);

  // ── drawings ──
  next("Plan");
  heading(doc, "Plan");
  const sc = drawDrawing(doc, drawings.plan, { x: M, y: M + 10, w: PAGE_W - 2 * M, h: PAGE_H - M - 34 });
  doc.setFontSize(8); doc.setTextColor(90, 90, 90); doc.text(sc, PAGE_W - M, M + 6, { align: "right" }); doc.setTextColor(0, 0, 0);
  for (const e of drawings.elevations) {
    next(e.title);
    heading(doc, e.title);
    const sc2 = drawDrawing(doc, e, { x: M, y: M + 10, w: PAGE_W - 2 * M, h: PAGE_H - M - 34 });
    doc.setFontSize(8); doc.setTextColor(90, 90, 90); doc.text(sc2, PAGE_W - M, M + 6, { align: "right" }); doc.setTextColor(0, 0, 0);
  }

  // ── schedules ──
  next("Cabinets");
  heading(doc, "Cabinet schedule");
  table(doc, M + 16, [
    { title: "Cabinet", w: 20 }, { title: "Type", w: 18 }, { title: "Description", w: 32 }, { title: "W", w: 14, align: "right" },
    { title: "H", w: 14, align: "right" }, { title: "D", w: 14, align: "right" }, { title: "From start", w: 20, align: "right" },
    { title: "Doors", w: 13, align: "right" }, { title: "Drawers", w: 15, align: "right" }, { title: "Contents / notes", w: 113 },
  ], k.cabinets.map(c => [c.code, c.type, c.label, c.width, c.height, c.depth, c.x, c.fronts.filter(f => f.kind === "door").length,
    c.fronts.filter(f => f.kind === "drawer").length, [c.contents, c.notes].filter(Boolean).join(" ")]), () => next("Cabinets"));

  next("Factory details");
  heading(doc, "Details for the factory");
  doc.setFontSize(8.5); doc.setTextColor(90, 90, 90);
  doc.text(t("From the design. \"To confirm\" means the client and the factory agree it; the Excel file has the same list with Chinese labels."), M, M + 12);
  doc.setTextColor(0, 0, 0);
  table(doc, M + 20, [{ title: "Item", w: 75 }, { title: "Value", w: 198 }], SPEC_FIELDS.map(f => [f.label, opts.spec[f.key] ?? ""]), () => next("Factory details"), 8.5);

  if (opts.parts) {
  next("Cut list");
  heading(doc, "Cut list");
  const bandShort = (e: string) => (e === "F" ? "F" : e === "C" ? "C" : "");
  doc.setFontSize(7.5); doc.setTextColor(90, 90, 90);
  doc.text(t(`Sizes in mm. Edges: F = ${rules.frontBanding.material}; C = ${rules.carcassBanding.material}. Full list with notes in the Excel file.`), M, M + 12);
  doc.setTextColor(0, 0, 0);
  table(doc, M + 19, [
    { title: "Part", w: 22 }, { title: "Name", w: 30 }, { title: "Material", w: 72 }, { title: "T", w: 8, align: "right" },
    { title: "Length", w: 16, align: "right" }, { title: "Width", w: 16, align: "right" }, { title: "Qty", w: 9, align: "right" },
    { title: "L1", w: 7 }, { title: "L2", w: 7 }, { title: "W1", w: 7 }, { title: "W2", w: 7 },
    { title: "Cut L", w: 15, align: "right" }, { title: "Cut W", w: 15, align: "right" }, { title: "Grain", w: 42 },
  ], k.parts.map(p => [p.id, p.name, p.material, p.thickness, p.length, p.width, p.qty, bandShort(p.edges.L1), bandShort(p.edges.L2),
    bandShort(p.edges.W1), bandShort(p.edges.W2), p.cutLength, p.cutWidth, p.grain === "length" ? "along length" : ""]), () => next("Cut list"), 7);

  next("Hardware, worktops, appliances");
  heading(doc, "Hardware");
  table(doc, M + 16, [{ title: "Item", w: 110 }, { title: "Finish", w: 30 }, { title: "Qty", w: 15, align: "right" }, { title: "Used in", w: 118 }],
    k.hardware.map(h => [h.item, h.finish, h.qty, h.usedIn.join(", ")]), () => next("Hardware"));
  }
  next("Worktops and appliances");
  heading(doc, "Worktops");
  table(doc, M + 16, [
    { title: "Piece", w: 18 }, { title: "Material", w: 36 }, { title: "L x D x T", w: 34 }, { title: "Cut-out", w: 34 },
    { title: "Centre from left", w: 26, align: "right" }, { title: "From front", w: 20, align: "right" }, { title: "Size", w: 24 }, { title: "Notes", w: 81 },
  ], k.worktops.flatMap(w => (w.cutouts.length ? w.cutouts : [null]).map((c, i) => [
    i ? "" : w.id, i ? "" : w.material, i ? "" : `${w.length} x ${w.depth} x ${w.thickness}`, c?.label ?? "", c?.x ?? "", c?.fromFront ?? "",
    c ? `${c.width} x ${c.depth}` : "", i ? "" : w.notes])), () => next("Worktops"));
  const yApp = M + 30 + Math.max(1, k.worktops.reduce((a, w) => a + Math.max(1, w.cutouts.length), 0)) * 5;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...BRAND); doc.text("Appliances", M, yApp); doc.setTextColor(0, 0, 0);
  table(doc, yApp + 8, [{ title: "Cabinet", w: 20 }, { title: "Appliance", w: 70 }, { title: "Size", w: 60 }, { title: "Notes", w: 123 }],
    k.appliances.map(a => [a.cabinet, a.item, a.size, a.notes]), () => next("Appliances"));

  if (!opts.parts) return new Uint8Array(doc.output("arraybuffer"));
  next("Construction rules");
  heading(doc, "Construction rules used");
  doc.setFontSize(8.5); doc.setTextColor(90, 90, 90);
  doc.text(t("Nooi's standard rules until your factory's own are set. Tell us what differs and every future order will follow your rules."), M, M + 12);
  doc.setTextColor(0, 0, 0);
  table(doc, M + 20, [{ title: "Rule", w: 60 }, { title: "Value", w: 213 }], rulesRows(rules), () => next("Construction rules"), 8.5);

  return new Uint8Array(doc.output("arraybuffer"));
}
