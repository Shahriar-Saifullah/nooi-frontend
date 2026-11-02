/**
 * Furniture specification sheet → PDF — lib/export/furnitureSheetPdf.ts
 * ============================================================================
 * Draws the sheet from furnitureSheet.ts with jsPDF, in the browser:
 *
 *   page 1…   header, then every room's pieces as a table (picture, size,
 *             finish, how it is mounted, quantity), then a summary
 *   last      the floor plan, landscape, with each piece's footprint and its
 *             item number — the same numbers as the list
 *
 * jsPDF is loaded on demand so it never weighs on the canvas bundle. Its
 * built-in Helvetica only covers Latin-1, so text is cleaned first (a name
 * that would print as garbage falls back to the piece's type).
 */

import type { jsPDF as JsPDF } from "jspdf";
import {
  footprint, roomPolygonScene, polygonArea,
  type FurnitureSheet, type SheetLine, type SheetRoomInput,
} from "./furnitureSheet";
import { wallLine, wallIndexOf, openingSpan, type PlanOpening, type PlanWallLike } from "@/lib/walls/openings";

export interface SheetPlan {
  totalW: number; totalD: number;           // scene metres
  visualScale: number;
  walls: PlanWallLike[];
  openings: PlanOpening[];
  rooms: SheetRoomInput[];
}

const BRAND = "#004643";
const INK = "#1f2421";
const MUTED = "#737373";
const LINE = "#e3e3e0";
const ROOM_BAR = "#eef3ef";

const M = 14;                                 // page margin, mm

/** Latin-1 only (Helvetica); anything else is dropped. */
const clean = (s: string | null | undefined) =>
  (s ?? "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-")
    .replace(/×/g, "x").replace(/[^\x20-\x7E\xA0-\xFF]/g, "").replace(/\s+/g, " ").trim();

const fmt1 = (v: number) => (Math.round(v * 10) / 10).toLocaleString("en-US", { maximumFractionDigits: 1 });

// ── pictures ────────────────────────────────────────────────────────────────

/** A picture as a small square JPEG (jsPDF can't embed webp), or null. */
function loadThumb(url: string): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const done = (v: string | null) => { clearTimeout(timer); resolve(v); };
    const timer = setTimeout(() => done(null), 6000);
    img.onload = () => {
      try {
        const S = 200;
        const c = document.createElement("canvas");
        c.width = S; c.height = S;
        const g = c.getContext("2d");
        if (!g) return done(null);
        g.fillStyle = "#ffffff";
        g.fillRect(0, 0, S, S);
        const k = Math.min(S / img.naturalWidth, S / img.naturalHeight);
        const w = img.naturalWidth * k, h = img.naturalHeight * k;
        g.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
        done(c.toDataURL("image/jpeg", 0.85));
      } catch { done(null); }       // tainted canvas (no CORS) → no picture
    };
    img.onerror = () => done(null);
    img.src = url;
  });
}

// ── list pages ──────────────────────────────────────────────────────────────

// column x offsets (from the margin) and widths, mm — 182 mm in all
const COLS = {
  no:    { x: 0,   w: 8 },
  pic:   { x: 8,   w: 19 },
  item:  { x: 27,  w: 46 },
  size:  { x: 73,  w: 30 },
  finish:{ x: 103, w: 48 },
  place: { x: 151, w: 22 },
  qty:   { x: 173, w: 9 },
};
const ROW_H = 21;

function drawColumnHeader(doc: JsPDF, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(MUTED);
  const label = (k: keyof typeof COLS, s: string, align: "left" | "center" = "left") =>
    doc.text(s, M + COLS[k].x + (align === "center" ? COLS[k].w / 2 : 1), y + 3.5, { align });
  label("no", "NO.", "center");
  label("pic", "PICTURE");
  label("item", "ITEM");
  label("size", "SIZE (W x D x H)");
  label("finish", "COLOUR & MATERIAL");
  label("place", "PLACEMENT");
  label("qty", "QTY", "center");
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.2);
  doc.line(M, y + 5.5, M + 182, y + 5.5);
  return y + 6.5;
}

function drawRoomBar(doc: JsPDF, y: number, name: string, right: string): number {
  doc.setFillColor(ROOM_BAR);
  doc.roundedRect(M, y, 182, 9, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(BRAND);
  doc.text(clean(name) || "Room", M + 3, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text(right, M + 179, y + 6, { align: "right" });
  return y + 11;
}

function drawRow(doc: JsPDF, y: number, l: SheetLine, thumb: string | null) {
  const cx = (k: keyof typeof COLS) => M + COLS[k].x;

  // number
  doc.setFillColor(BRAND);
  doc.circle(cx("no") + 4, y + 5, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor("#ffffff");
  doc.text(String(l.no), cx("no") + 4, y + 6.1, { align: "center" });

  // picture
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.2);
  if (thumb) {
    try { doc.addImage(thumb, "JPEG", cx("pic") + 1, y + 1, 17, 17); } catch { /* skip a bad image */ }
    doc.rect(cx("pic") + 1, y + 1, 17, 17, "S");
  } else {
    doc.setFillColor("#f5f5f3");
    doc.rect(cx("pic") + 1, y + 1, 17, 17, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(MUTED);
    doc.text("no picture", cx("pic") + 9.5, y + 10.2, { align: "center" });
  }

  // item
  const name = clean(l.name) || clean(l.type) || "Furniture";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(INK);
  const nameLines = (doc.splitTextToSize(name, COLS.item.w - 2) as string[]).slice(0, 2);
  doc.text(nameLines, cx("item") + 1, y + 4.5);
  let iy = y + 4.5 + nameLines.length * 3.6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(MUTED);
  const kind = [clean(l.type), clean(l.category)].filter((s, i, a) => s && a.indexOf(s) === i).join(" - ");
  if (kind) { doc.text((doc.splitTextToSize(kind, COLS.item.w - 2) as string[])[0], cx("item") + 1, iy); iy += 3.3; }
  const src = l.source === "Marketplace" && clean(l.vendor) ? `Marketplace - ${clean(l.vendor)}` : l.source;
  doc.text((doc.splitTextToSize(src, COLS.item.w - 2) as string[])[0], cx("item") + 1, iy);

  // size
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.3);
  doc.setTextColor(INK);
  doc.text(`${l.sizeCm.w} x ${l.sizeCm.d} x ${l.sizeCm.h} cm`, cx("size") + 1, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(MUTED);
  doc.text(`Width ${l.sizeCm.w} cm`, cx("size") + 1, y + 9);
  doc.text(`Depth ${l.sizeCm.d} cm`, cx("size") + 1, y + 12.2);
  doc.text(`Height ${l.sizeCm.h} cm`, cx("size") + 1, y + 15.4);

  // finish: each main part as "Material - Colour", with its swatch and code
  const parts = l.parts.slice(0, 3);
  let fy = y + 4.2;
  for (const p of parts) {
    const fx = cx("finish") + 1;
    if (p.colour.hex) {
      doc.setFillColor(p.colour.hex);
      doc.setDrawColor("#bdbdbd");
      doc.setLineWidth(0.2);
      doc.rect(fx, fy - 2.7, 3.4, 3.4, "FD");
    }
    doc.setFontSize(7.2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(INK);
    const mat = clean(p.material) || "Not specified";
    // shrink a long label to fit before cutting it
    const label = `${mat} - ${clean(p.colour.name)}`;
    const avail = COLS.finish.w - 8;
    if (doc.getTextWidth(label) > avail) doc.setFontSize(6.3);
    const head = (doc.splitTextToSize(label, avail) as string[])[0];
    doc.text(head, fx + 5, fy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(MUTED);
    const share = parts.length > 1 ? `   about ${Math.max(5, Math.round(p.share * 20) * 5)}% of the piece` : "";
    const code = p.colour.hex ? p.colour.hex.toUpperCase() : "";
    if (code || share) doc.text(`${code}${share}`.trim(), fx + 5, fy + 2.8);
    fy += 5.8;
  }

  // placement
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(INK);
  const place = l.mount === "wall" ? "Wall-hung" : l.mount === "ceiling" ? "Ceiling" : "Floor";
  doc.text(place, cx("place") + 1, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(MUTED);
  const note = l.mount === "wall" && l.mountHeightCm !== null
    ? `Bottom edge ${l.mountHeightCm} cm above floor`
    : l.mount === "ceiling" ? "Hangs from the ceiling" : "Stands on the floor";
  doc.text(doc.splitTextToSize(note, COLS.place.w - 2) as string[], cx("place") + 1, y + 8.6);

  // qty
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(INK);
  doc.text(String(l.qty), cx("qty") + COLS.qty.w / 2, y + 6, { align: "center" });

  doc.setDrawColor(LINE);
  doc.setLineWidth(0.2);
  doc.line(M, y + ROW_H - 1, M + 182, y + ROW_H - 1);
}

// ── plan page ───────────────────────────────────────────────────────────────

function drawPlanPage(doc: JsPDF, sheet: FurnitureSheet, plan: SheetPlan) {
  doc.addPage("a4", "landscape");
  const PW = 297, PH = 210;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(INK);
  doc.text("Floor plan - where each piece goes", M, M + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text("Layout guide, not to scale. Numbers match the item list; shapes show each piece's footprint seen from above. Build from the sizes in the list.", M, M + 9);

  const size = { totalW: plan.totalW, totalD: plan.totalD };
  const lines = plan.walls.map((w, i) => wallLine(w, i, size));
  const roomPolys = plan.rooms
    .map(r => ({ r, poly: roomPolygonScene(r, plan.totalW, plan.totalD) }))
    .filter((x): x is { r: SheetRoomInput; poly: [number, number][] } => !!x.poly);

  // bounds of everything drawn
  const xs: number[] = [], zs: number[] = [];
  for (const L of lines) {
    if (L.horiz) { xs.push(L.a0 - L.t, L.a1 + L.t); zs.push(L.c - L.t, L.c + L.t); }
    else { zs.push(L.a0 - L.t, L.a1 + L.t); xs.push(L.c - L.t, L.c + L.t); }
  }
  for (const { poly } of roomPolys) for (const [x, z] of poly) { xs.push(x); zs.push(z); }
  for (const room of sheet.rooms) for (const l of room.lines) for (const p of l.pieces) { xs.push(p.x); zs.push(p.z); }
  if (!xs.length) { xs.push(-plan.totalW / 2, plan.totalW / 2); zs.push(-plan.totalD / 2, plan.totalD / 2); }
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);

  const box = { x: M, y: M + 14, w: PW - 2 * M, h: PH - 2 * M - 26 };
  const k = Math.min(box.w / Math.max(maxX - minX, 0.1), box.h / Math.max(maxZ - minZ, 0.1));
  const ox = box.x + (box.w - (maxX - minX) * k) / 2;
  const oy = box.y + (box.h - (maxZ - minZ) * k) / 2;
  const P = (x: number, z: number): [number, number] => [ox + (x - minX) * k, oy + (z - minZ) * k];

  const poly = (pts: [number, number][], style: "F" | "S" | "FD") => {
    if (pts.length < 3) return;
    const q = pts.map(([x, z]) => P(x, z));
    const segs = q.slice(1).map((p, i) => [p[0] - q[i][0], p[1] - q[i][1]]);
    doc.lines(segs, q[0][0], q[0][1], [1, 1], style, true);
  };

  // rooms
  doc.setLineWidth(0.15);
  for (const { poly: rp } of roomPolys) {
    doc.setFillColor("#f6f4ee");
    doc.setDrawColor("#e2ddd2");
    poly(rp, "FD");
  }

  // furniture footprints (under the walls' lines, over the floors)
  const labels: { x: number; y: number; no: number }[] = [];
  for (const room of sheet.rooms) {
    for (const l of room.lines) {
      const wM = l.sizeCm.w / 100, dM = Math.max(l.sizeCm.d / 100, 0.04);
      for (const p of l.pieces) {
        const fp = footprint(p.x, p.z, wM, dM, p.rotation);
        doc.setLineWidth(0.25);
        if (l.mount === "ceiling") {
          doc.setDrawColor("#8a7bb0");
          doc.setLineDashPattern([1, 0.8], 0);
          const [cx, cy] = P(p.x, p.z);
          doc.circle(cx, cy, Math.max(1.6, (Math.min(wM, dM) / 2) * k), "S");
          doc.setLineDashPattern([], 0);
        } else {
          doc.setFillColor(l.mount === "wall" ? "#efe6d6" : "#dbe9e2");
          doc.setDrawColor(l.mount === "wall" ? "#b48a4a" : BRAND);
          poly(fp, "FD");
        }
        const [lx, ly] = P(p.x, p.z);
        labels.push({ x: lx, y: ly, no: l.no });
      }
    }
  }

  // walls, with door / window gaps
  doc.setFillColor("#3a3f3c");
  for (const L of lines) {
    const [x0, y0] = L.horiz ? P(L.a0 - L.t / 2, L.c - L.t / 2) : P(L.c - L.t / 2, L.a0 - L.t / 2);
    const [x1, y1] = L.horiz ? P(L.a1 + L.t / 2, L.c + L.t / 2) : P(L.c + L.t / 2, L.a1 + L.t / 2);
    doc.rect(x0, y0, Math.max(x1 - x0, 0.3), Math.max(y1 - y0, 0.3), "F");
  }
  for (const op of plan.openings) {
    const wi = wallIndexOf(op, plan.walls, size);
    const L = lines[wi];
    if (!L) continue;
    const { centre, half } = openingSpan(op, size);
    const [x0, y0] = L.horiz ? P(centre - half, L.c - L.t / 2 - 0.01) : P(L.c - L.t / 2 - 0.01, centre - half);
    const [x1, y1] = L.horiz ? P(centre + half, L.c + L.t / 2 + 0.01) : P(L.c + L.t / 2 + 0.01, centre + half);
    doc.setFillColor("#ffffff");
    doc.rect(x0, y0, x1 - x0, y1 - y0, "F");
    doc.setDrawColor(op.type === "door" ? "#d08a2e" : "#3f8fd2");
    doc.setLineWidth(op.type === "door" ? 0.5 : 0.35);
    if (L.horiz) { const ym = (y0 + y1) / 2; doc.line(x0, ym, x1, ym); }
    else { const xm = (x0 + x1) / 2; doc.line(xm, y0, xm, y1); }
  }

  // room names
  for (const { r, poly: rp } of roomPolys) {
    const cx = (Math.min(...rp.map(p => p[0])) + Math.max(...rp.map(p => p[0]))) / 2;
    // along the bottom edge: wall-hung pieces (TVs, art) crowd the top
    const bottomZ = Math.max(...rp.map(p => p[1]));
    const [tx, ty] = P(cx, bottomZ);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor("#8c8678");
    const area = polygonArea(rp) / (plan.visualScale * plan.visualScale);
    doc.text(`${clean(r.name) || "Room"}  ${fmt1(area)} sq m`, tx, ty - 2.2, { align: "center" });
  }

  // item numbers, nudged apart where pieces share a spot (rug under a bed)
  const placed: { x: number; y: number }[] = [];
  for (const lb of labels) {
    let { x, y } = lb;
    for (let n = 0; n < 6 && placed.some(p => Math.hypot(p.x - x, p.y - y) < 4.6); n++) { x += 3.4; y -= 1.6; }
    placed.push({ x, y });
    doc.setFillColor(BRAND);
    doc.circle(x, y, 2.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor("#ffffff");
    doc.text(String(lb.no), x, y + 0.75, { align: "center" });
  }

  // legend + scale bar
  const ly = PH - M - 6;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED);
  let lx = M;
  const key = (fill: string | null, stroke: string, label: string, dashed = false) => {
    doc.setLineWidth(0.25);
    doc.setDrawColor(stroke);
    if (dashed) doc.setLineDashPattern([1, 0.8], 0);
    if (fill) { doc.setFillColor(fill); doc.rect(lx, ly - 2.6, 5, 3.2, "FD"); }
    else doc.rect(lx, ly - 2.6, 5, 3.2, "S");
    doc.setLineDashPattern([], 0);
    doc.text(label, lx + 6.5, ly);
    lx += 7 + doc.getTextWidth(label) + 6;
  };
  key("#dbe9e2", BRAND, "Floor piece");
  key("#efe6d6", "#b48a4a", "Wall-hung");
  key(null, "#8a7bb0", "Ceiling", true);
  doc.setDrawColor("#d08a2e"); doc.setLineWidth(0.6); doc.line(lx, ly - 1, lx + 5, ly - 1);
  doc.text("Door", lx + 6.5, ly); lx += 7 + doc.getTextWidth("Door") + 6;
  doc.setDrawColor("#3f8fd2"); doc.setLineWidth(0.4); doc.line(lx, ly - 1, lx + 5, ly - 1);
  doc.text("Window", lx + 6.5, ly);

}

// ── entry point ─────────────────────────────────────────────────────────────

export async function downloadFurnitureSheetPdf(opts: {
  sheet: FurnitureSheet;
  projectName: string;
  fileName: string;
  plan: SheetPlan;
}): Promise<void> {
  const { sheet, plan } = opts;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const PH = 297;
  const project = clean(opts.projectName) || "My design";

  // pictures first, in parallel (one fetch per distinct picture)
  // each line tries its candidates in order; a candidate is fetched once
  const cache = new Map<string, Promise<string | null>>();
  const load = (u: string) => { if (!cache.has(u)) cache.set(u, loadThumb(u)); return cache.get(u)!; };
  const lines = sheet.rooms.flatMap(r => r.lines);
  const thumbs = new Map<number, string | null>();
  await Promise.all(lines.map(async l => {
    for (const u of l.thumbnails) {
      const img = await load(u);
      if (img) { thumbs.set(l.no, img); return; }
    }
    thumbs.set(l.no, null);
  }));

  // ── header ──
  let y = M;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(BRAND);
  doc.text("nooi", M, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(MUTED);
  doc.text("FURNITURE SPECIFICATION", M + 182, y + 3, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), M + 182, y + 7, { align: "right" });
  y += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(INK);
  doc.text((doc.splitTextToSize(project, 182) as string[])[0], M, y);
  y += 6;
  const roomCount = sheet.rooms.filter(r => r.name !== "Other areas").length;
  const meta = [
    `Plan ${fmt1(sheet.planSizeM.w)} x ${fmt1(sheet.planSizeM.d)} m`,
    sheet.totalAreaM2 !== null ? `Floor area ${fmt1(sheet.totalAreaM2)} sq m` : null,
    `${sheet.totalPieces} piece${sheet.totalPieces === 1 ? "" : "s"}`,
    roomCount ? `${roomCount} room${roomCount === 1 ? "" : "s"}` : null,
  ].filter(Boolean).join("   |   ");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  doc.text(meta, M, y);
  y += 5;
  doc.setFontSize(7.3);
  const note = doc.splitTextToSize(
    "Sizes are the design sizes in centimetres: width x depth x height. Measure the space on site before you build or order anything. Colours and materials are read from each piece's 3D model, or are the ones chosen in the design. Item numbers match the floor plan on the last page.",
    176) as string[];
  const noteH = 3.2 + note.length * 3.1;
  doc.setFillColor("#fbf7ec");
  doc.roundedRect(M, y, 182, noteH, 1.5, 1.5, "F");
  doc.setTextColor("#7a6a3a");
  doc.text(note, M + 3, y + 3.8);
  y += noteH + 4.5;

  // ── rooms ──
  const bottom = PH - 16;
  for (const room of sheet.rooms) {
    const pieces = room.lines.reduce((a, l) => a + l.qty, 0);
    const right = [room.areaM2 !== null ? `${fmt1(room.areaM2)} sq m` : null, `${pieces} piece${pieces === 1 ? "" : "s"}`]
      .filter(Boolean).join("  |  ");
    // keep a room bar with at least its first row
    if (y + 11 + 6.5 + ROW_H > bottom) { doc.addPage("a4", "portrait"); y = M; }
    y = drawRoomBar(doc, y, room.name, right);
    y = drawColumnHeader(doc, y);
    for (const l of room.lines) {
      if (y + ROW_H > bottom) {
        doc.addPage("a4", "portrait");
        y = M;
        y = drawRoomBar(doc, y, `${room.name} (continued)`, right);
        y = drawColumnHeader(doc, y);
      }
      drawRow(doc, y, l, thumbs.get(l.no) ?? null);
      y += ROW_H;
    }
    y += 4;
  }

  // ── summary ──
  const sumH = 12 + (sheet.rooms.length + 1) * 6;
  if (y + sumH > bottom) { doc.addPage("a4", "portrait"); y = M; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(BRAND);
  doc.text("Summary", M, y + 5);
  y += 9;
  doc.setFontSize(6.5);
  doc.setTextColor(MUTED);
  doc.text("ROOM", M + 1, y + 3.5);
  doc.text("DIFFERENT ITEMS", M + 120, y + 3.5, { align: "right" });
  doc.text("PIECES", M + 181, y + 3.5, { align: "right" });
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.2);
  doc.line(M, y + 5.5, M + 182, y + 5.5);
  y += 6.5;
  doc.setFontSize(8.5);
  for (const room of sheet.rooms) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(INK);
    doc.text(clean(room.name) || "Room", M + 1, y + 4);
    doc.text(String(room.lines.length), M + 120, y + 4, { align: "right" });
    doc.text(String(room.lines.reduce((a, l) => a + l.qty, 0)), M + 181, y + 4, { align: "right" });
    doc.line(M, y + 6, M + 182, y + 6);
    y += 6;
  }
  doc.setFont("helvetica", "bold");
  doc.text("Total", M + 1, y + 4.5);
  doc.text(String(sheet.totalLines), M + 120, y + 4.5, { align: "right" });
  doc.text(String(sheet.totalPieces), M + 181, y + 4.5, { align: "right" });

  // ── floor plan ──
  drawPlanPage(doc, sheet, plan);

  // ── footers ──
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor("#a3a3a3");
    doc.text(`Nooi  |  ${project}  |  Furniture specification`, M, h - 8);
    doc.text(`Page ${i} of ${n}`, w - M, h - 8, { align: "right" });
  }

  doc.save(opts.fileName);
}
