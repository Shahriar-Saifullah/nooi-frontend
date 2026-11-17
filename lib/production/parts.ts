/**
 * Kitchen → parts — lib/production/parts.ts
 * ============================================================================
 * Breaks an approved kitchen into what a factory makes and buys:
 *
 *   cabinets    one row per carcass (and per appliance space), with its size
 *   parts       every board: sides, bottoms, tops/rails, backs, shelves,
 *               fronts, plinths — finished size, cut size, edge banding
 *   worktops    pieces with cut-outs and joints
 *   hardware    hinges, runners, handles, legs, hangers, shelf pins
 *   appliances  sink, hob, oven, microwave, dishwasher, fridge, hood
 *
 * Cabinet outside sizes and the doors/drawers in each come from the design
 * (the same presets the 3D view draws, lib/kitchen/pascal/presets). How each
 * box is built comes from the rules (./rules.ts).
 *
 * Coordinates for drawings and the 3D model are in each run's own frame, in
 * millimetres: x along the run from its left end, y up from the floor, z out
 * from the wall (0 = wall face).
 */

import { MODULES, BASE_DEPTH, PLINTH, CARCASS, UPPER_BOTTOM, UPPER_DEPTH, TALL_TOP, type KitchenModule } from "@/lib/kitchen/model";
import { cabinetPresetById } from "@/lib/kitchen/pascal/presets";
import { compartmentDoorType, normalizeCabinetStack } from "@/lib/kitchen/pascal/stack";
import { COUNTERTOPS, FRONT_FINISHES, HARDWARE, type KitchenStyle } from "@/lib/kitchen/materials";
import { hingesFor, runnerFor, worktopMaxLength, worktopThickness, type ProductionRules } from "./rules";
import { runToWorld, type KitchenOrderInput, type PlacedRun } from "./placement";

export interface Box { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }

export type PartRole = "carcass" | "back" | "shelf" | "front" | "plinth";
export type Grain = "length" | "none";

export interface Part {
  id: string;
  run: string;
  cabinet: string;
  name: string;
  role: PartRole;
  material: string;
  thickness: number;
  /** finished size; length runs with the grain when there is one, else it's the longer side */
  length: number;
  width: number;
  qty: number;
  grain: Grain;
  /** banding per edge: the two long edges, the two short edges ("" = none) */
  edges: { L1: string; L2: string; W1: string; W2: string };
  /** size to cut the board to, before banding */
  cutLength: number;
  cutWidth: number;
  notes: string;
  /** where it sits, run frame, mm */
  box: Box;
}

export interface FrontRect { x: number; y: number; w: number; h: number; kind: "door" | "drawer" | "false" | "panel" }

export interface Cabinet {
  code: string;
  run: string;
  kind: string;
  label: string;
  type: "base" | "wall" | "tall" | "appliance";
  width: number;
  height: number;
  depth: number;
  /** left end along the run, and bottom above the floor (mm) */
  x: number;
  y: number;
  fronts: FrontRect[];
  /** what goes in it (appliance housings etc.) */
  contents: string;
  notes: string;
}

export interface Cutout { kind: "sink" | "hob"; label: string; x: number; fromFront: number; width: number; depth: number }

export interface Worktop {
  id: string;
  run: string;
  material: string;
  materialId: string;
  length: number;
  depth: number;
  thickness: number;
  cutouts: Cutout[];
  notes: string;
  box: Box;
}

export interface HardwareLine { item: string; finish: string; qty: number; usedIn: string[] }
export interface ApplianceLine { cabinet: string; run: string; item: string; size: string; notes: string }

export interface RunSummary { code: string; length: number; units: number }

export interface KitchenParts {
  runs: RunSummary[];
  cabinets: Cabinet[];
  parts: Part[];
  worktops: Worktop[];
  hardware: HardwareLine[];
  appliances: ApplianceLine[];
  /** things the factory should check */
  warnings: string[];
}

const mm = (m: number) => Math.round(m * 2000) / 2;          // metres → mm, to 0.5 mm
const r1 = (v: number) => Math.round(v * 10) / 10;

export const frontFinishName = (s: KitchenStyle) => {
  const f = FRONT_FINISHES.find(x => x.id === s.front);
  const style = { slab: "slab (flat)", shaker: "shaker", "raised-arch": "raised arch" }[s.frontStyle] ?? s.frontStyle;
  return `${style}, ${f ? f.name : s.front}${s.front.startsWith("#") ? ` ${s.front}` : ""}`;
};
export const countertopName = (id: string) => COUNTERTOPS.find(c => c.id === id)?.name ?? id;
export const hardwareName = (s: KitchenStyle) => HARDWARE.find(h => h.id === s.hardware)?.name ?? s.hardware;

/** Standard hob cut-outs by hob width (mm) — always checked against the appliance's own template. */
const HOB_CUTOUT: Record<number, [number, number]> = { 600: [560, 490], 750: [720, 490], 900: [850, 490] };

const APPLIANCE: Partial<Record<KitchenModule["kind"], (w: number) => { item: string; size: string; notes: string }>> = {
  "sink-base": w => ({ item: "Sink (single bowl) + mixer tap", size: `for a ${w} mm cabinet`, notes: "Cut-out to the sink's template." }),
  "dishwasher": w => ({ item: "Dishwasher, fully integrated", size: `${w} mm wide, ${mm(CARCASS)} mm niche`, notes: "Takes the door panel listed in the cut list." }),
  "cooktop-gas": w => ({ item: "Gas hob", size: `${w} mm`, notes: "Cut-out to the hob's template." }),
  "cooktop-induction": w => ({ item: "Induction hob", size: `${w} mm`, notes: "Cut-out to the hob's template." }),
  "fridge-single": w => ({ item: "Fridge, freestanding", size: `${w} mm wide space`, notes: "No carcass — the space is left open." }),
};

export function kitchenParts(input: KitchenOrderInput, rules: ProductionRules): KitchenParts {
  const out: KitchenParts = { runs: [], cabinets: [], parts: [], worktops: [], hardware: [], appliances: [], warnings: [] };
  const style = input.style;
  const t = rules.carcassBoard.thickness;
  const bt = rules.backBoard.thickness;
  const ft = rules.frontBoard.thickness;
  const gap = rules.frontGap;
  const wood = style.front.startsWith("wood");
  const frontMaterial = `${rules.frontBoard.material} — ${frontFinishName(style)}`;
  const handles = style.handleStyle === "bar" || style.handleStyle === "knob";
  const hw = new Map<string, HardwareLine>();
  const addHw = (item: string, finish: string, qty: number, cab: string) => {
    if (qty <= 0) return;
    const key = `${item}|${finish}`;
    const line = hw.get(key) ?? { item, finish, qty: 0, usedIn: [] };
    line.qty += qty;
    if (!line.usedIn.includes(cab)) line.usedIn.push(cab);
    hw.set(key, line);
  };

  // inside depth (front of the back panel to the front edge)
  const backSpace = rules.backFitting === "grooved" ? rules.backGroove.setback + bt : bt;

  for (const run of input.runs) {
    let x = 0;                                   // mm along the run
    const runLen = mm(run.modules.reduce((a, m) => a + m.width, 0));
    out.runs.push({ code: run.code, length: runLen, units: run.modules.length });

    run.modules.forEach((m, i) => {
      const info = MODULES[m.kind];
      const code = `${run.code}-${String(i + 1).padStart(2, "0")}`;
      const W = mm(m.width);
      const preset = cabinetPresetById(m.kind).createPatch(undefined) as Parameters<typeof normalizeCabinetStack>[0] & { carcassHeight?: number; depth?: number };
      const tall = info.tall;
      const H = mm(preset.carcassHeight ?? (tall ? TALL_TOP - PLINTH : CARCASS));
      const D = mm(BASE_DEPTH);
      const y0 = mm(PLINTH);
      const appliance = APPLIANCE[m.kind]?.(W);
      if (appliance) out.appliances.push({ cabinet: code, run: run.code, ...appliance });

      const addUpper = () => {
        // ── the wall cabinet above ───────────────────────────────────────────
        if (m.upper === "cabinet" && run.showUpper[i] && !tall) {
          const uc = `${code}W`;
          const UH = mm(0.762), UD = mm(UPPER_DEPTH), uy = mm(UPPER_BOTTOM);
          const up: Part[] = carcass({ code: uc, run: run.code, x, y0: uy, W, H: UH, D: UD, base: false, sink: false, rules });
          const uf: FrontRect[] = [];
          const wall = cabinetPresetById("wall-cabinet").createPatch(undefined) as { stack?: { doorType?: string }[] };
          const dbl = (wall.stack?.[0]?.doorType ?? (m.width > 0.5 ? "double" : "single")) === "double";
          if (dbl) {
            const lw = (W - 2 * gap) / 2;
            uf.push({ x: x + gap / 2, y: uy + gap / 2, w: lw, h: UH - gap, kind: "door" }, { x: x + gap / 2 + lw + gap, y: uy + gap / 2, w: lw, h: UH - gap, kind: "door" });
          } else uf.push({ x: x + gap / 2, y: uy + gap / 2, w: W - gap, h: UH - gap, kind: "door" });
          [1, 2].forEach(s => up.push(board(uc, run.code, `Shelf ${s}`, "shelf",
            W - 2 * t - 2 * rules.shelf.sideClearance, UD - backSpace - rules.shelf.frontSetback, t, rules, { L1: true },
            { x0: x + t + 1, x1: x + W - t - 1, y0: uy + (s * UH) / 3 - t / 2, y1: uy + (s * UH) / 3 + t / 2, z0: backSpace, z1: UD - rules.shelf.frontSetback }, undefined, `${uc}-SH${s}`)));
          addFronts(uc, run.code, uf, UD, ft, frontMaterial, wood, rules, up);
          out.cabinets.push({ code: uc, run: run.code, kind: "wall-cabinet", label: "Wall cabinet", type: "wall", width: W, height: UH, depth: UD, x, y: uy, fronts: uf, contents: "", notes: "" });
          out.parts.push(...up);
          hardwareFor(uc, uf, uf.length, 0, 2, UD - backSpace, W, "wall", style, rules, addHw, handles);
        } else if (m.upper === "hood" && run.showUpper[i] && !tall) {
          out.appliances.push({ cabinet: code, run: run.code, item: "Chimney cooker hood", size: `${W} mm`, notes: "Duct to the ceiling; extract route to be confirmed on site." });
        }
      };

      // ── spaces with no carcass ───────────────────────────────────────────
      if (m.kind === "fridge-single") {
        out.cabinets.push({ code, run: run.code, kind: m.kind, label: info.label, type: "appliance", width: W, height: H, depth: D, x, y: y0, fronts: [], contents: "Freestanding fridge", notes: "Open space, no carcass." });
        x += W;
        return;
      }
      if (m.kind === "dishwasher") {
        const panel: FrontRect = { x: x + gap / 2, y: y0 + gap / 2, w: W - gap, h: mm(CARCASS) - gap, kind: "panel" };
        out.cabinets.push({ code, run: run.code, kind: m.kind, label: info.label, type: "appliance", width: W, height: mm(CARCASS), depth: D, x, y: y0, fronts: [panel], contents: "Integrated dishwasher", notes: "No carcass: the panel fixes to the dishwasher door." });
        const pn = front(code, run.code, "Dishwasher door panel", panel, D, ft, frontMaterial, wood, rules, "Fixing holes to the dishwasher's template.");
        pn.id = `${code}-PN`;
        out.parts.push(pn);
        if (handles) addHw(`Handle (${style.handleStyle})`, hardwareName(style), 1, code);
        addUpper();
        x += W;
        return;
      }

      // ── the carcass ──────────────────────────────────────────────────────
      const type: Cabinet["type"] = tall ? "tall" : "base";
      const rows = normalizeCabinetStack({ ...preset, width: m.width, carcassHeight: H / 1000 } as Parameters<typeof normalizeCabinetStack>[0]);
      const sink = rows.some(r => r.compartment.type === "sink");
      const fronts: FrontRect[] = [];
      const contents: string[] = [];
      const parts: Part[] = [];
      parts.push(...carcass({ code, run: run.code, x, y0, W, H, D, base: !tall, sink, rules }));

      // fixed decks between compartments, fronts in each
      let doors = 0, drawers = 0;
      const shelves: number[] = [];
      rows.forEach((row, k) => {
        const ry0 = y0 + mm(row.y0), rh = mm(row.height);
        const c = row.compartment;
        if (k > 0 && row.height > 0 && rows[k - 1].height > 0) {
          parts.push(board(code, run.code, `Fixed shelf ${k}`, "carcass", W - 2 * t, D - backSpace, t, rules, { L1: true },
            { x0: x + t, x1: x + W - t, y0: ry0 - t / 2, y1: ry0 + t / 2, z0: backSpace, z1: D }, undefined, `${code}-FS${k}`));
        }
        if (c.type === "drawer") {
          const n = (c as { drawerCount?: number }).drawerCount ?? 1;
          const h = (rh - n * gap) / n;
          for (let d = 0; d < n; d++) fronts.push({ x: x + gap / 2, y: ry0 + gap / 2 + d * (h + gap), w: W - gap, h, kind: "drawer" });
          drawers += n;
        } else if (c.type === "door") {
          let dh = rh;
          const dy = ry0;
          if (sink && rules.sinkFalseFront > 0) {
            dh = rh - rules.sinkFalseFront;
            fronts.push({ x: x + gap / 2, y: ry0 + dh + gap / 2, w: W - gap, h: rules.sinkFalseFront - gap, kind: "false" });
          }
          const double = compartmentDoorType(c, m.width) === "double" || compartmentDoorType(c, m.width) === "glass";
          if (double) {
            const lw = (W - 2 * gap) / 2;
            fronts.push({ x: x + gap / 2, y: dy + gap / 2, w: lw, h: dh - gap, kind: "door" });
            fronts.push({ x: x + gap / 2 + lw + gap, y: dy + gap / 2, w: lw, h: dh - gap, kind: "door" });
            doors += 2;
          } else {
            fronts.push({ x: x + gap / 2, y: dy + gap / 2, w: W - gap, h: dh - gap, kind: "door" });
            doors += 1;
          }
          const sc = (c as { shelfCount?: number }).shelfCount ?? 0;
          for (let s = 0; s < sc; s++) shelves.push(ry0 + ((s + 1) * rh) / (sc + 1));
        } else if (c.type === "oven") contents.push("Built-in oven (600 × 595 housing)");
        else if (c.type === "microwave") contents.push("Built-in microwave (390 mm housing)");
        else if (c.type === "sink") contents.push("Sink");
        else if (c.type === "cooktop-gas" || c.type === "cooktop-induction") contents.push("Hob above (in the worktop)");
      });
      if (contents.some(c => c.startsWith("Built-in oven"))) out.appliances.push({ cabinet: code, run: run.code, item: "Built-in oven", size: "600 mm, 595 mm high", notes: "Housing 560–568 mm wide inside." });
      if (contents.some(c => c.startsWith("Built-in microwave"))) out.appliances.push({ cabinet: code, run: run.code, item: "Built-in microwave", size: "600 mm, 390 mm high", notes: "" });

      shelves.forEach((sy, s) => parts.push(board(code, run.code, `Shelf ${s + 1}`, "shelf",
        W - 2 * t - 2 * rules.shelf.sideClearance, D - backSpace - rules.shelf.frontSetback, t, rules, { L1: true },
        { x0: x + t + 1, x1: x + W - t - 1, y0: sy - t / 2, y1: sy + t / 2, z0: backSpace, z1: D - rules.shelf.frontSetback }, undefined, `${code}-SH${s + 1}`)));
      addFronts(code, run.code, fronts, D, ft, frontMaterial, wood, rules, parts);

      out.cabinets.push({ code, run: run.code, kind: m.kind, label: info.label, type, width: W, height: H, depth: D, x, y: y0, fronts, contents: contents.join("; "), notes: sink ? "Back: cut out on site for plumbing." : "" });
      out.parts.push(...parts);
      hardwareFor(code, fronts, doors, drawers, shelves.length, D - backSpace, W, "floor", style, rules, addHw, handles);

      addUpper();
      x += W;
    });

    // ── plinths: one length per stretch of floor cabinets (a freestanding fridge breaks it) ──
    const pt = rules.plinthBoard.thickness;
    let px = 0, seg = 0, from = 0;
    const plinthSegs: [number, number][] = [];
    run.modules.forEach((m, i) => {
      const w = mm(m.width);
      if (m.kind === "fridge-single") { if (px > from) plinthSegs.push([from, px]); from = px + w; }
      px += w;
      if (i === run.modules.length - 1 && px > from) plinthSegs.push([from, px]);
    });
    for (const [a, b] of plinthSegs) {
      for (const [p0, p1] of splitLength(a, b, 2800)) {
        seg++;
        out.parts.push(board(`${run.code}-PL${seg}`, run.code, "Plinth", "plinth", p1 - p0, mm(PLINTH) - 3, pt, rules, { L1: true },
          { x0: p0, x1: p1, y0: 0, y1: mm(PLINTH) - 3, z0: mm(BASE_DEPTH) - rules.plinthSetback - pt, z1: mm(BASE_DEPTH) - rules.plinthSetback },
          rules.plinthBoard.material, `${run.code}-PL${seg}`));
      }
      addHw("Plinth clip", "", Math.max(2, Math.ceil((b - a) / 500)) * 1, `${run.code}-PL`);
    }

    // ── worktops: one stretch per run of under-counter units (tall units break it) ──
    const tops: { a: number; b: number; mods: { m: KitchenModule; x: number; code: string }[] }[] = [];
    let wx = 0, cur: (typeof tops)[number] | null = null;
    run.modules.forEach((m, i) => {
      const w = mm(m.width);
      const code = `${run.code}-${String(i + 1).padStart(2, "0")}`;
      if (MODULES[m.kind].tall) cur = null;
      else {
        if (!cur) { cur = { a: wx, b: wx, mods: [] }; tops.push(cur); }
        cur.b = wx + w;
        cur.mods.push({ m, x: wx, code });
      }
      wx += w;
    });
    const tt = worktopThickness(rules, style.countertop);
    const depth = mm(BASE_DEPTH) + ft + rules.worktopFrontOverhang;
    const maxLen = worktopMaxLength(rules, style.countertop);
    let wn = 0;
    for (const top of tops) {
      const cutouts: (Cutout & { at: number })[] = [];
      for (const { m, x: mx, code } of top.mods) {
        const w = mm(m.width);
        if (m.kind === "sink-base") cutouts.push({ kind: "sink", label: `Sink (${code})`, at: mx + w / 2, x: 0, fromFront: 70, width: w - 100, depth: 430 });
        if (m.kind === "cooktop-gas" || m.kind === "cooktop-induction") {
          const [cw, cd] = HOB_CUTOUT[w] ?? [w - 40, 490];
          cutouts.push({ kind: "hob", label: `Hob (${code})`, at: mx + w / 2, x: 0, fromFront: 60, width: cw, depth: cd });
        }
      }
      // joints at cabinet boundaries, clear of cut-outs, so no piece is longer than the slab
      const bounds = top.mods.map(t2 => t2.x).concat(top.b);
      const pieces: [number, number][] = [];
      let a = top.a;
      while (top.b - a > maxLen + 0.5) {
        const ok = bounds.filter(p => p > a + 300 && p <= a + maxLen && !cutouts.some(c => Math.abs(c.at - p) < c.width / 2 + 100));
        let cut = ok.length ? Math.max(...ok) : Math.min(a + maxLen, top.b - 600);
        // never through a cut-out: move left, clear of it
        for (let guard = 0; guard < 8; guard++) {
          const hit = cutouts.find(c => Math.abs(c.at - cut) < c.width / 2 + 100);
          if (!hit) break;
          cut = hit.at - hit.width / 2 - 100;
        }
        if (cut <= a + 300) cut = a + maxLen;
        pieces.push([a, cut]);
        a = cut;
      }
      pieces.push([a, top.b]);
      pieces.forEach(([p0, p1], k) => {
        wn++;
        const id = `${run.code}-WT${wn}`;
        const mine = cutouts.filter(c => c.at > p0 && c.at < p1).map(c => ({ kind: c.kind, label: c.label, x: r1(c.at - p0), fromFront: c.fromFront, width: c.width, depth: c.depth }));
        const notes: string[] = [];
        if (pieces.length > 1) notes.push(k === 0 ? "Joint at the right end." : k === pieces.length - 1 ? "Joint at the left end." : "Joints at both ends.");
        if (mine.length) notes.push("Cut-outs: check against each appliance's template.");
        out.worktops.push({
          id, run: run.code, material: countertopName(style.countertop), materialId: style.countertop,
          length: r1(p1 - p0), depth, thickness: tt, cutouts: mine, notes: notes.join(" "),
          box: { x0: p0, x1: p1, y0: mm(PLINTH + CARCASS), y1: mm(PLINTH + CARCASS) + tt, z0: 0, z1: depth },
        });
      });
    }
  }

  out.hardware = [...hw.values()].sort((a, b) => a.item.localeCompare(b.item));
  const tt = worktopThickness(rules, style.countertop);
  if (out.worktops.length && tt !== 20) out.warnings.push(`Worktop is ${tt} mm thick, so the counter stands at ${mm(PLINTH + CARCASS) + tt} mm (the 3D design shows ${mm(PLINTH + CARCASS) + 20} mm).`);
  out.warnings.push(...cornerClashes(input, out));
  out.warnings.push("Cut-outs for the sink and hob are standard sizes; confirm each against the appliance's own template before cutting.");
  out.warnings.push("Fillers and end panels are not included yet; any gap between a run and a wall is left open.");
  return out;
}

// ── helpers ─────────────────────────────────────────────────────────────────

function splitLength(a: number, b: number, max: number): [number, number][] {
  const n = Math.max(1, Math.ceil((b - a) / max));
  const step = (b - a) / n;
  return Array.from({ length: n }, (_, i) => [r1(a + i * step), r1(a + (i + 1) * step)] as [number, number]);
}

type Edges = { L1?: boolean; L2?: boolean; W1?: boolean; W2?: boolean };

/** One board. `length`/`width` as finished; the longer side becomes the length unless `grainAlong` says otherwise. */
function board(
  cabinet: string, run: string, name: string, role: PartRole, a: number, b: number, thickness: number,
  rules: ProductionRules, edgesOnA: Edges, box: Box, material?: string, id?: string, grain: Grain = "none",
): Part {
  // edgesOnA.L1/L2 band the edges that run along side `a`
  const swap = grain === "none" && b > a;
  const length = swap ? b : a, width = swap ? a : b;
  const e: Edges = swap ? { L1: edgesOnA.W1, L2: edgesOnA.W2, W1: edgesOnA.L1, W2: edgesOnA.L2 } : edgesOnA;
  const band = role === "front" ? rules.frontBanding : rules.carcassBanding;
  const code = role === "front" ? "F" : "C";
  const bt = rules.deductBanding ? band.thickness : 0;
  const edges = { L1: e.L1 ? code : "", L2: e.L2 ? code : "", W1: e.W1 ? code : "", W2: e.W2 ? code : "" };
  const mat = material ?? (role === "back" ? rules.backBoard.material : rules.carcassBoard.material);
  return {
    id: id ?? `${cabinet}-${name.replace(/[^A-Za-z0-9]+/g, "").slice(0, 6).toUpperCase()}`,
    run, cabinet, name, role, material: mat, thickness, length: r1(length), width: r1(width), qty: 1, grain, edges,
    cutLength: r1(length - (e.W1 ? bt : 0) - (e.W2 ? bt : 0)),
    cutWidth: r1(width - (e.L1 ? bt : 0) - (e.L2 ? bt : 0)),
    notes: "", box,
  };
}

/** Sides, bottom, top (or rails) and back of one box. */
function carcass(a: { code: string; run: string; x: number; y0: number; W: number; H: number; D: number; base: boolean; sink: boolean; rules: ProductionRules }): Part[] {
  const { code, run, x, y0, W, H, D, base, sink, rules } = a;
  const t = rules.carcassBoard.thickness, bt = rules.backBoard.thickness;
  const grooved = rules.backFitting === "grooved";
  const sideD = grooved ? D : D - bt;
  const z0 = D - sideD;
  const parts: Part[] = [];
  const groove = grooved ? `Groove ${bt + 0.5} × ${rules.backGroove.depth} mm, ${rules.backGroove.setback} mm from the rear edge.` : "";
  const sideL = board(code, run, "Side left", "carcass", H, sideD, t, rules, { W1: false, L1: true }, { x0: x, x1: x + t, y0, y1: y0 + H, z0, z1: D }, undefined, `${code}-SL`);
  const sideR = board(code, run, "Side right", "carcass", H, sideD, t, rules, { L1: true }, { x0: x + W - t, x1: x + W, y0, y1: y0 + H, z0, z1: D }, undefined, `${code}-SR`);
  sideL.notes = sideR.notes = [groove, "32 mm system holes for hinges/runners per hardware."].filter(Boolean).join(" ");
  parts.push(sideL, sideR);
  const bottom = board(code, run, "Bottom", "carcass", W - 2 * t, sideD, t, rules, { L1: true }, { x0: x + t, x1: x + W - t, y0, y1: y0 + t, z0, z1: D }, undefined, `${code}-BT`);
  bottom.notes = groove;
  parts.push(bottom);
  if (base) {
    const rw = rules.baseTopRails.width;
    parts.push(board(code, run, "Top rail front", "carcass", W - 2 * t, rw, t, rules, { L1: true }, { x0: x + t, x1: x + W - t, y0: y0 + H - t, y1: y0 + H, z0: D - rw, z1: D }, undefined, `${code}-RF`));
    if (!sink) parts.push(board(code, run, "Top rail back", "carcass", W - 2 * t, rw, t, rules, {}, { x0: x + t, x1: x + W - t, y0: y0 + H - t, y1: y0 + H, z0, z1: z0 + rw }, undefined, `${code}-RB`));
  } else {
    const top = board(code, run, "Top", "carcass", W - 2 * t, sideD, t, rules, { L1: true }, { x0: x + t, x1: x + W - t, y0: y0 + H - t, y1: y0 + H, z0, z1: D }, undefined, `${code}-TP`);
    top.notes = groove;
    parts.push(top);
  }
  // back panel
  const g = rules.backGroove.depth;
  const bw = grooved ? W - 2 * t + 2 * g - 2 : W;
  const bh = grooved ? (base ? H - t + g - 2 : H - 2 * t + 2 * g - 2) : H;
  const bz = grooved ? rules.backGroove.setback : 0;
  const back = board(code, run, "Back", "back", bh, bw, bt, rules, {}, { x0: x + (W - bw) / 2, x1: x + (W + bw) / 2, y0: y0 + (grooved ? t - g + 1 : 0), y1: y0 + (grooved ? t - g + 1 : 0) + bh, z0: bz, z1: bz + bt }, rules.backBoard.material, `${code}-BK`);
  back.notes = grooved ? "Slides into the grooves." : "Nailed/screwed to the rear edges.";
  parts.push(back);
  return parts;
}

function front(cabinet: string, run: string, name: string, f: FrontRect, D: number, ft: number, material: string, wood: boolean, rules: ProductionRules, notes = ""): Part {
  const grainAlongHeight = wood && f.kind !== "drawer";
  const a = grainAlongHeight || !wood ? f.h : f.w;
  const b = grainAlongHeight || !wood ? f.w : f.h;
  const p = board(cabinet, run, name, "front", a, b, ft, rules, { L1: true, L2: true, W1: true, W2: true },
    { x0: f.x, x1: f.x + f.w, y0: f.y, y1: f.y + f.h, z0: D, z1: D + ft }, material, undefined, wood ? "length" : "none");
  p.notes = [wood ? (f.kind === "drawer" ? "Grain across (horizontal)." : "Grain vertical.") : "", notes].filter(Boolean).join(" ");
  return p;
}

function addFronts(code: string, run: string, fronts: FrontRect[], D: number, ft: number, material: string, wood: boolean, rules: ProductionRules, parts: Part[]) {
  let d = 0, k = 0;
  // drawers numbered bottom to top, doors left to right
  for (const f of fronts) {
    if (f.kind === "drawer") { d++; const p = front(code, run, `Drawer front ${d}`, f, D, ft, material, wood, rules); p.id = `${code}-DF${d}`; parts.push(p); }
    else if (f.kind === "door") { k++; const p = front(code, run, `Door ${k}`, f, D, ft, material, wood, rules, ""); p.id = `${code}-DR${k}`; parts.push(p); }
    else if (f.kind === "false") { const p = front(code, run, "False front (sink)", f, D, ft, material, wood, rules, "Fixed, no hinges."); p.id = `${code}-FF`; parts.push(p); }
  }
}

function hardwareFor(
  code: string, fronts: FrontRect[], doors: number, drawers: number, shelves: number, insideDepth: number, W: number,
  mount: "floor" | "wall", style: KitchenStyle, rules: ProductionRules,
  addHw: (item: string, finish: string, qty: number, cab: string) => void, handles: boolean,
) {
  for (const f of fronts.filter(f2 => f2.kind === "door")) addHw(rules.hingeName, "", hingesFor(rules, f.h), code);
  const runner = runnerFor(rules, insideDepth);
  if (drawers) addHw(`${rules.runnerName}, ${runner} mm`, "", drawers, code);
  if (handles) addHw(`Handle (${style.handleStyle})`, hardwareName(style), doors + drawers, code);
  if (shelves) addHw("Shelf support pin", "", shelves * rules.shelfPinsPerShelf, code);
  if (mount === "floor") addHw(rules.legName, "", W > rules.legs.wideFrom ? rules.legs.wide : rules.legs.normal, code);
  else addHw(rules.wallHangerName, "", 1, code);
}

// ── totals for the summary sheet ────────────────────────────────────────────

export interface MaterialTotal { material: string; thickness: number; pieces: number; areaM2: number }

export function materialTotals(parts: Part[]): MaterialTotal[] {
  const m = new Map<string, MaterialTotal>();
  for (const p of parts) {
    const k = `${p.material}|${p.thickness}`;
    const row = m.get(k) ?? { material: p.material, thickness: p.thickness, pieces: 0, areaM2: 0 };
    row.pieces += p.qty;
    row.areaM2 += (p.length * p.width * p.qty) / 1e6;
    m.set(k, row);
  }
  return [...m.values()].map(r => ({ ...r, areaM2: Math.round(r.areaM2 * 100) / 100 }));
}

export function bandingTotals(parts: Part[], rules: ProductionRules): { material: string; metres: number }[] {
  let c = 0, f = 0;
  for (const p of parts) {
    const len = (e: string, l: number) => (e ? l : 0);
    const sum = len(p.edges.L1, p.length) + len(p.edges.L2, p.length) + len(p.edges.W1, p.width) + len(p.edges.W2, p.width);
    if (p.role === "front") f += sum * p.qty; else c += sum * p.qty;
  }
  // 10 % extra for trimming
  return [
    { material: rules.carcassBanding.material, metres: Math.ceil((c / 1000) * 1.1 * 10) / 10 },
    { material: rules.frontBanding.material, metres: Math.ceil((f / 1000) * 1.1 * 10) / 10 },
  ].filter(r => r.metres > 0);
}

export const runOf = (input: KitchenOrderInput, code: string): PlacedRun | undefined => input.runs.find(r => r.code === code);

// ── corners ─────────────────────────────────────────────────────────────────

type Rect2 = { x0: number; x1: number; z0: number; z1: number };

/** A run-frame rectangle (mm, x along, z out) as a world rectangle in mm (runs are axis-aligned). */
function worldRect(r: PlacedRun, x0: number, x1: number, z0: number, z1: number): Rect2 {
  const a = runToWorld(r, x0 / 1000, z0 / 1000), b = runToWorld(r, x1 / 1000, z1 / 1000);
  return { x0: Math.min(a[0], b[0]) * 1000, x1: Math.max(a[0], b[0]) * 1000, z0: Math.min(a[1], b[1]) * 1000, z1: Math.max(a[1], b[1]) * 1000 };
}
const overlap = (a: Rect2, b: Rect2) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 1 && Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > 1;
const depthInto = (a: Rect2, b: Rect2) => Math.round(Math.min(Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0)));

/**
 * Where two runs meet in a corner: a worktop that runs into the other run's
 * cabinets, and doors or drawers that would open against them. The design
 * tool keeps the cabinets themselves apart; these are the details a fitter
 * solves with a filler or a blind corner unit, so the factory is told.
 */
function cornerClashes(input: KitchenOrderInput, k: KitchenParts): string[] {
  const out: string[] = [];
  const run = (code: string) => input.runs.find(r => r.code === code)!;
  const bodies = k.cabinets.filter(c => c.type !== "wall").map(c => {
    const r = run(c.run);
    const front = c.fronts.length ? 20 : 0;
    return { c, rect: worldRect(r, c.x, c.x + c.width, 0, c.depth + front) };
  });
  for (const w of k.worktops) {
    const wr = worldRect(run(w.run), w.box.x0, w.box.x1, 0, w.depth);
    for (const b of bodies) {
      if (b.c.run === w.run || !overlap(wr, b.rect)) continue;
      out.push(`Worktop ${w.id} runs ${depthInto(wr, b.rect)} mm into ${b.c.code} at the corner: notch the worktop or fit a filler between the runs.`);
    }
  }
  for (const a of bodies) {
    if (!a.c.fronts.length) continue;
    // the space the doors and drawers swing or slide into
    const swing = worldRect(run(a.c.run), a.c.x + 25, a.c.x + a.c.width - 25, a.c.depth + 20, a.c.depth + 420);
    for (const b of bodies) {
      if (b.c.run === a.c.run || !overlap(swing, b.rect)) continue;
      out.push(`${a.c.code}'s doors/drawers open against ${b.c.code} at the corner: add a corner filler (at least 50 mm) or use a blind corner unit.`);
    }
  }
  return out;
}
