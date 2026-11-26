/**
 * Order drawings — lib/production/drawing.ts
 * ============================================================================
 * The plan, the wall elevations and the flat part sheets as plain lists of
 * lines, rectangles and text in millimetres. The same lists go to the DXF
 * files (./dxf.ts) and to the PDF (./pdf.ts), so both always agree.
 *
 * Plan: X = scene x, Y = −scene z (north up, as on the uploaded plan).
 * Elevations: X along the run from its left end, Y up from the floor.
 */

import { MODULES, PLINTH, CARCASS, UPPER_BOTTOM, TALL_TOP } from "@/lib/kitchen/model";
import { runToWorld, type KitchenOrderInput, type PlacedRun } from "./placement";
import type { Cabinet, KitchenParts, Part } from "./parts";

export type Layer =
  | "WALLS" | "DOORS" | "WINDOWS" | "CABINETS" | "UPPERS" | "TALL" | "WORKTOP" | "CUTOUTS"
  | "FRONTS" | "HANDLES" | "PLINTH" | "APPLIANCES" | "DIMS" | "TEXT" | "PARTS" | "BANDING" | "BORDER";

/** Colours (AutoCAD index) and dashed or not, per layer. */
export const LAYERS: Record<Layer, { color: number; dashed?: boolean }> = {
  WALLS: { color: 8 }, DOORS: { color: 30 }, WINDOWS: { color: 4 }, CABINETS: { color: 7 }, UPPERS: { color: 5, dashed: true },
  TALL: { color: 7 }, WORKTOP: { color: 3 }, CUTOUTS: { color: 1, dashed: true }, FRONTS: { color: 7 }, HANDLES: { color: 9 },
  PLINTH: { color: 8 }, APPLIANCES: { color: 6 }, DIMS: { color: 2 }, TEXT: { color: 7 }, PARTS: { color: 7 }, BANDING: { color: 1 }, BORDER: { color: 8 },
};

export type P2 = [number, number];
export type Ent =
  | { t: "line"; a: P2; b: P2; layer: Layer }
  | { t: "poly"; pts: P2[]; closed: boolean; layer: Layer }
  | { t: "text"; at: P2; h: number; text: string; layer: Layer; align?: "left" | "center" | "right"; rot?: number };

export interface Drawing { name: string; title: string; ents: Ent[] }

const rect = (x: number, y: number, w: number, h: number, layer: Layer): Ent =>
  ({ t: "poly", pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], closed: true, layer });
const text = (at: P2, h: number, s: string, align: "left" | "center" | "right" = "center", layer: Layer = "TEXT", rot = 0): Ent =>
  ({ t: "text", at, h, text: s, layer, align, rot });
const fmt = (v: number) => (Math.round(v * 10) / 10).toString();

/** A horizontal dimension from x0 to x1, drawn at height y (extension lines from `from`). */
export function dimH(x0: number, x1: number, y: number, from: number, h = 60): Ent[] {
  const tick = h * 0.5;
  return [
    { t: "line", a: [x0, from], b: [x0, y + Math.sign(y - from || 1) * tick], layer: "DIMS" },
    { t: "line", a: [x1, from], b: [x1, y + Math.sign(y - from || 1) * tick], layer: "DIMS" },
    { t: "line", a: [x0, y], b: [x1, y], layer: "DIMS" },
    { t: "line", a: [x0 - tick, y - tick], b: [x0 + tick, y + tick], layer: "DIMS" },
    { t: "line", a: [x1 - tick, y - tick], b: [x1 + tick, y + tick], layer: "DIMS" },
    text([(x0 + x1) / 2, y + h * 0.4], h, fmt(Math.abs(x1 - x0)), "center", "DIMS"),
  ];
}

/** A vertical dimension from y0 to y1 at x (extension lines from `from`). */
export function dimV(y0: number, y1: number, x: number, from: number, h = 60): Ent[] {
  const tick = h * 0.5;
  return [
    { t: "line", a: [from, y0], b: [x + Math.sign(x - from || 1) * tick, y0], layer: "DIMS" },
    { t: "line", a: [from, y1], b: [x + Math.sign(x - from || 1) * tick, y1], layer: "DIMS" },
    { t: "line", a: [x, y0], b: [x, y1], layer: "DIMS" },
    { t: "line", a: [x - tick, y0 - tick], b: [x + tick, y0 + tick], layer: "DIMS" },
    { t: "line", a: [x - tick, y1 - tick], b: [x + tick, y1 + tick], layer: "DIMS" },
    text([x - h * 0.4, (y0 + y1) / 2], h, fmt(Math.abs(y1 - y0)), "center", "DIMS", 90),
  ];
}

export function bounds(ents: Ent[]): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = ([x, y]: P2) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for (const e of ents) {
    if (e.t === "line") { add(e.a); add(e.b); }
    else if (e.t === "poly") e.pts.forEach(add);
    else {
      const w = e.text.length * e.h * 0.6;
      const dx = e.align === "center" ? w / 2 : e.align === "right" ? w : 0;
      if (e.rot === 90) { add([e.at[0] - e.h, e.at[1] - dx]); add([e.at[0], e.at[1] - dx + w]); }
      else { add([e.at[0] - dx, e.at[1]]); add([e.at[0] - dx + w, e.at[1] + e.h]); }
    }
  }
  return Number.isFinite(x0) ? [x0, y0, x1, y1] : [0, 0, 1, 1];
}

// ── plan ────────────────────────────────────────────────────────────────────

const toPlan = (r: PlacedRun, x: number, z: number): P2 => {
  const [wx, wz] = runToWorld(r, x / 1000, z / 1000);
  return [Math.round(wx * 10000) / 10, Math.round(-wz * 10000) / 10];
};
const footprint = (r: PlacedRun, x0: number, x1: number, z0: number, z1: number, layer: Layer): Ent =>
  ({ t: "poly", pts: [toPlan(r, x0, z0), toPlan(r, x1, z0), toPlan(r, x1, z1), toPlan(r, x0, z1)], closed: true, layer });

export function planDrawing(input: KitchenOrderInput, k: KitchenParts): Drawing {
  const ents: Ent[] = [];
  const pr = (x0: number, z0: number, x1: number, z1: number): P2[] =>
    [[x0 * 1000, -z0 * 1000], [x1 * 1000, -z0 * 1000], [x1 * 1000, -z1 * 1000], [x0 * 1000, -z1 * 1000]];
  for (const w of input.plan.walls) ents.push({ t: "poly", pts: pr(w.x0, w.z0, w.x1, w.z1), closed: true, layer: "WALLS" });
  for (const o of input.plan.openings) {
    const pts = pr(o.x0, o.z0, o.x1, o.z1);
    ents.push({ t: "poly", pts, closed: true, layer: o.type === "door" ? "DOORS" : "WINDOWS" });
    if (o.type === "window") {
      const horiz = o.x1 - o.x0 > o.z1 - o.z0;
      const m = horiz ? -((o.z0 + o.z1) / 2) * 1000 : ((o.x0 + o.x1) / 2) * 1000;
      ents.push(horiz
        ? { t: "line", a: [o.x0 * 1000, m], b: [o.x1 * 1000, m], layer: "WINDOWS" }
        : { t: "line", a: [m, -o.z0 * 1000], b: [m, -o.z1 * 1000], layer: "WINDOWS" });
    }
  }
  for (const r of input.runs) {
    const cabs = k.cabinets.filter(c => c.run === r.code);
    for (const c of cabs) {
      const layer: Layer = c.type === "wall" ? "UPPERS" : c.type === "tall" ? "TALL" : c.type === "appliance" ? "APPLIANCES" : "CABINETS";
      ents.push(footprint(r, c.x, c.x + c.width, 0, c.depth, layer));
      if (c.type !== "wall" && c.type !== "filler") {
        const mid = toPlan(r, c.x + c.width / 2, c.depth / 2);
        ents.push(text([mid[0], mid[1] - 40], 70, c.code));
      }
    }
    for (const w of k.worktops.filter(x => x.run === r.code)) {
      ents.push(footprint(r, w.box.x0, w.box.x1, 0, w.depth, "WORKTOP"));
      for (const c of w.cutouts) {
        const cx = w.box.x0 + c.x, z1 = w.depth - c.fromFront, z0 = z1 - c.depth;
        ents.push(footprint(r, cx - c.width / 2, cx + c.width / 2, z0, z1, "CUTOUTS"));
      }
    }
    // the run's overall length, along its front
    const len = cabs.filter(c => c.type !== "wall" && c.type !== "filler").reduce((a, c) => Math.max(a, c.x + c.width), 0);
    const a = toPlan(r, 0, 900), b = toPlan(r, len, 900);
    const a0 = toPlan(r, 0, 650), b0 = toPlan(r, len, 650);
    ents.push({ t: "line", a: a0, b: a, layer: "DIMS" }, { t: "line", a: b0, b, layer: "DIMS" }, { t: "line", a, b, layer: "DIMS" });
    const mid: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const vertical = Math.abs(a[0] - b[0]) < 1;
    ents.push(text(vertical ? [mid[0] - 30, mid[1]] : [mid[0], mid[1] + 30], 80, `${r.code}: ${fmt(len)}`, "center", "DIMS", vertical ? 90 : 0));
  }
  const [x0, y0, x1] = bounds(ents);
  ents.push(text([x0, y0 - 250], 70, "Plan, mm. Blue dashed: wall cabinets above", "left"));
  ents.push(text([x0, y0 - 370], 70, "Red dashed: worktop cut-outs", "left"));
  void x1;
  return { name: "plan", title: "Plan", ents };
}

// ── elevations ──────────────────────────────────────────────────────────────

function handleMarks(c: Cabinet, style: KitchenOrderInput["style"]): Ent[] {
  if (style.handleStyle !== "bar" && style.handleStyle !== "knob") return [];
  const out: Ent[] = [];
  for (const f of c.fronts) {
    if (f.kind === "false") continue;
    if (f.kind === "drawer" || f.kind === "panel") {
      const y = f.y + f.h - Math.min(40, f.h * 0.25), cx = f.x + f.w / 2, half = style.handleStyle === "bar" ? Math.min(80, f.w * 0.25) : 8;
      out.push(rect(cx - half, y - 6, half * 2, 12, "HANDLES"));
    } else {
      // doors: by the opening edge — the edge nearer the cabinet's middle for pairs
      const left = f.x + f.w / 2 > c.x + c.width / 2;
      const hx = left ? f.x + 30 : f.x + f.w - 42;
      const len = style.handleStyle === "bar" ? Math.min(160, f.h * 0.3) : 12;
      // wall cabinets: near the bottom; tall units: about 1 m up; base units: near the top
      const hy = c.type === "wall" ? f.y + 40
        : c.type === "tall" ? Math.max(f.y + 40, Math.min(f.y + f.h - 40 - len, 1000))
        : f.y + f.h - 40 - len;
      out.push(rect(hx, hy, 12, len, "HANDLES"));
    }
  }
  return out;
}

export function elevationDrawings(input: KitchenOrderInput, k: KitchenParts): Drawing[] {
  return input.runs.map(r => {
    const ents: Ent[] = [];
    const cabs = k.cabinets.filter(c => c.run === r.code);
    const len = cabs.reduce((a, c) => Math.max(a, c.x + c.width), 0);
    const x0 = cabs.reduce((a, c) => Math.min(a, c.x), 0);     // a corner filler can sit left of 0
    const plinth = PLINTH * 1000;
    ents.push({ t: "line", a: [-300, 0], b: [len + 300, 0], layer: "WALLS" });
    for (const c of cabs) {
      const layer: Layer = c.type === "wall" ? "UPPERS" : c.type === "appliance" ? "APPLIANCES" : c.type === "tall" ? "TALL" : "CABINETS";
      if (c.kind === "fridge-single") {
        ents.push(rect(c.x + 10, 0, c.width - 20, c.height + plinth, "APPLIANCES"));
        ents.push(text([c.x + c.width / 2, (c.height + plinth) / 2], 70, "FRIDGE"));
        ents.push(text([c.x + c.width / 2, (c.height + plinth) / 2 - 110], 55, "freestanding"));
      } else {
        ents.push(rect(c.x, c.y, c.width, c.height, layer === "UPPERS" ? "CABINETS" : layer));
        for (const f of c.fronts) ents.push(rect(f.x, f.y, f.w, f.h, "FRONTS"));
        ents.push(...handleMarks(c, input.style));
        if (c.kind === "oven-tower") {
          // the housings: oven above the drawers, microwave above the oven
          const y0 = c.y + 420, oy = y0 + 595;
          ents.push(rect(c.x + 18, y0, c.width - 36, 595, "APPLIANCES"), text([c.x + c.width / 2, y0 + 270], 60, "OVEN"));
          ents.push(rect(c.x + 18, oy, c.width - 36, 390, "APPLIANCES"), text([c.x + c.width / 2, oy + 170], 55, "MICROWAVE"));
        }
        if (c.kind === "dishwasher") ents.push(text([c.x + c.width / 2, c.y + c.height / 2], 55, "DISHWASHER"));
      }
      const labelY = c.type === "wall" ? c.y + c.height + 50 : c.type === "base" || c.type === "appliance" ? c.y + c.height + 120 : c.y + c.height + 50;
      if (c.kind !== "fridge-single" && c.type !== "filler") ents.push(text([c.x + c.width / 2, labelY], 50, c.code));
      if (c.type === "filler" && c.label === "Corner filler") ents.push(text([c.x + c.width / 2, c.y + c.height + 50], 40, "filler"));
    }
    // plinth and worktops
    for (const p of k.parts.filter(x => x.run === r.code && x.role === "plinth")) ents.push(rect(p.box.x0, 0, p.box.x1 - p.box.x0, plinth - 3, "PLINTH"));
    for (const w of k.worktops.filter(x => x.run === r.code)) {
      ents.push(rect(w.box.x0, w.box.y0, w.length, w.thickness, "WORKTOP"));
      for (const c of w.cutouts) ents.push(text([w.box.x0 + c.x, w.box.y1 + 40], 45, c.kind === "sink" ? "sink" : "hob"));
    }
    // hoods
    r.modules.forEach((m, i) => {
      if (m.upper !== "hood" || !r.showUpper[i] || MODULES[m.kind].tall) return;
      const x = cabs.find(c => c.code === `${r.code}-${String(i + 1).padStart(2, "0")}`)?.x ?? 0;
      const w = m.width * 1000, y = (UPPER_BOTTOM + 0.2) * 1000;
      ents.push({ t: "poly", pts: [[x, y], [x + w, y], [x + w / 2 + 160, y + 380], [x + w / 2 - 160, y + 380]], closed: true, layer: "APPLIANCES" });
      ents.push(rect(x + w / 2 - 140, y + 380, 280, 2800 - y - 380, "APPLIANCES"));
      ents.push(text([x + w / 2, y + 130], 55, "HOOD"));
    });
    // dimensions: each unit under the floor line, the run, and the heights
    const base = cabs.filter(c => c.type !== "wall");
    base.forEach(c => ents.push(...dimH(c.x, c.x + c.width, -180, -10, 55)));
    ents.push(...dimH(x0, len, -380, -200, 70));
    const counter = (PLINTH + CARCASS) * 1000 + (k.worktops.find(w => w.run === r.code)?.thickness ?? 20);
    const hasUpper = cabs.some(c => c.type === "wall");
    const hasTall = cabs.some(c => c.type === "tall");
    ents.push(...dimV(0, plinth, -150, 0, 50));
    if (k.worktops.some(w => w.run === r.code)) ents.push(...dimV(0, counter, -330, 0, 55));
    if (hasUpper) ents.push(...dimV(UPPER_BOTTOM * 1000, (UPPER_BOTTOM + 0.762) * 1000, -150, 0, 50));
    if (hasTall || hasUpper) ents.push(...dimV(0, TALL_TOP * 1000, -510, 0, 55));
    ents.push(text([0, -620], 80, `Elevation ${r.code}, all sizes in mm`, "left"));
    return { name: `elevation-${r.code}`, title: `Elevation ${r.code}`, ents };
  });
}

// ── flat parts ──────────────────────────────────────────────────────────────

/** Every board flat, grouped by material, labelled with its id and cut size. Banded edges drawn red. */
export function partsDrawing(k: KitchenParts): Drawing {
  const ents: Ent[] = [];
  const groups = new Map<string, Part[]>();
  for (const p of k.parts) {
    const key = `${p.material} — ${p.thickness} mm`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const rowWidth = 9000, gap = 120;
  let y = 0;
  for (const [title, list] of groups) {
    ents.push(text([0, y], 140, title, "left"));
    y -= 260;
    let x = 0, rowH = 0;
    for (const p of [...list].sort((a, b) => b.length - a.length)) {
      const w = p.length, h = p.width;
      if (x + w > rowWidth && x > 0) { x = 0; y -= rowH + gap + 140; rowH = 0; }
      const top = y - h;
      ents.push(rect(x, top, w, h, "PARTS"));
      const inset = 8;
      if (p.edges.L1) ents.push({ t: "line", a: [x, top + inset], b: [x + w, top + inset], layer: "BANDING" });
      if (p.edges.L2) ents.push({ t: "line", a: [x, y - inset], b: [x + w, y - inset], layer: "BANDING" });
      if (p.edges.W1) ents.push({ t: "line", a: [x + inset, top], b: [x + inset, y], layer: "BANDING" });
      if (p.edges.W2) ents.push({ t: "line", a: [x + w - inset, top], b: [x + w - inset, y], layer: "BANDING" });
      const th = Math.max(18, Math.min(60, h / 6, w / 14));
      ents.push(text([x + w / 2, top + h / 2 + th * 0.2], th, p.id));
      ents.push(text([x + w / 2, top + h / 2 - th * 1.2], th * 0.8, `${fmt(p.length)} x ${fmt(p.width)}`));
      x += w + gap;
      rowH = Math.max(rowH, h);
    }
    y -= rowH + gap + 500;
  }
  ents.push(text([0, y], 110, "Flat parts at finished size (mm; cut sizes are in the cut list) — length left to right; red lines mark banded edges. Not a nesting plan.", "left"));
  return { name: "parts", title: "Parts", ents };
}
