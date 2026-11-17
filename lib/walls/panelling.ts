/**
 * Wall panelling — lib/walls/panelling.ts
 * ============================================================================
 * Mouldings and panels on one side of a wall, saved per side
 * (room_data.wallPanels["wallKey:A"]). Pure layout: a list of thin boxes in
 * the wall face's own coordinates, which the 3D scene turns into one mesh.
 *
 *   along   distance along the wall (scene units, like the wall itself)
 *   y       height above the floor (metres)
 *   proud   how far the piece stands off the face (metres)
 *
 * Styles
 *   box         classic box mouldings: frames below and above a chair rail
 *   chair-rail  a rail at 90 cm with frames below it only
 *   wainscot    flat panelling to 1 m with a cap rail
 *   fluted      vertical slats floor to ceiling
 */

export type PanelStyle = "box" | "chair-rail" | "wainscot" | "fluted";
export interface PanelSpec { style: PanelStyle; color?: string }

export const PANEL_STYLES: { id: PanelStyle; label: string }[] = [
  { id: "box", label: "Box mouldings" },
  { id: "chair-rail", label: "Chair rail" },
  { id: "wainscot", label: "Wainscot" },
  { id: "fluted", label: "Fluted slats" },
];

export function cleanPanelSpec(raw: unknown): PanelSpec | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (!PANEL_STYLES.some(p => p.id === r.style)) return null;
  const color = typeof r.color === "string" && /^#[0-9a-f]{6}$/i.test(r.color) ? r.color : undefined;
  return { style: r.style as PanelStyle, color };
}

export interface PanelPiece { a0: number; a1: number; y0: number; y1: number; proud: number }

const MOULD = 0.03;          // moulding width (m)
const MOULD_PROUD = 0.015;
const RAIL_Y = 0.9, RAIL_H = 0.05, RAIL_PROUD = 0.022;
const SKIRT_TOP = 0.12;      // above the skirting board

/** One rectangular moulding frame as four strips. */
function frame(a0: number, a1: number, y0: number, y1: number, mw: number, out: PanelPiece[]) {
  if (a1 - a0 < mw * 3 || y1 - y0 < MOULD * 3) return;
  out.push({ a0, a1, y0, y1: y0 + MOULD, proud: MOULD_PROUD });
  out.push({ a0, a1, y0: y1 - MOULD, y1, proud: MOULD_PROUD });
  out.push({ a0, a1: a0 + mw, y0: y0 + MOULD, y1: y1 - MOULD, proud: MOULD_PROUD });
  out.push({ a0: a1 - mw, a1, y0: y0 + MOULD, y1: y1 - MOULD, proud: MOULD_PROUD });
}

/** Frames side by side along [a0, a1], about `target` wide each (in scene units). */
function frameRow(a0: number, a1: number, y0: number, y1: number, scale: number, out: PanelPiece[], target = 0.95) {
  const len = a1 - a0;
  const margin = 0.1 * scale, gap = 0.1 * scale;
  if (len < 0.4 * scale || y1 - y0 < 0.25) return;
  const n = Math.max(1, Math.round((len - margin * 2) / (target * scale)));
  const w = (len - margin * 2 - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const s = a0 + margin + i * (w + gap);
    frame(s, s + w, y0, y1, MOULD * scale, out);
  }
}

/**
 * The pieces for one solid stretch of wall from a0 to a1.
 * `top` is how high the stretch goes (the ceiling, or the underside of a
 * window); `full` says whether it runs floor to ceiling.
 */
export function panelPieces(style: PanelStyle, a0: number, a1: number, top: number, ceiling: number, scale: number): PanelPiece[] {
  const out: PanelPiece[] = [];
  if (a1 - a0 < 0.15 * scale) return out;
  const full = top >= ceiling - 0.01;
  switch (style) {
    case "box":
    case "chair-rail": {
      const railTop = Math.min(top - 0.02, RAIL_Y + RAIL_H);
      if (railTop > RAIL_Y) out.push({ a0, a1, y0: RAIL_Y, y1: railTop, proud: RAIL_PROUD });
      frameRow(a0, a1, SKIRT_TOP + 0.06, Math.min(RAIL_Y - 0.08, top - 0.08), scale, out);
      if (style === "box" && full) frameRow(a0, a1, RAIL_Y + RAIL_H + 0.12, ceiling - 0.3, scale, out);
      break;
    }
    case "wainscot": {
      const capY = Math.min(1.0, top - 0.02);
      if (capY < 0.3) break;
      out.push({ a0, a1, y0: 0, y1: capY - 0.04, proud: 0.012 });
      out.push({ a0, a1, y0: capY - 0.04, y1: capY, proud: 0.028 });
      // vertical boards: shallow grooves read as joints between boards
      const step = 0.12 * scale;
      for (let a = a0 + step; a < a1 - step / 2; a += step) out.push({ a0: a - 0.004 * scale, a1: a + 0.004 * scale, y0: 0.09, y1: capY - 0.05, proud: 0.016 });
      break;
    }
    case "fluted": {
      const w = 0.045 * scale, gap = 0.012 * scale;
      const yTop = full ? ceiling - 0.05 : top - 0.02;
      for (let a = a0; a + w <= a1 + 1e-6; a += w + gap) out.push({ a0: a, a1: a + w, y0: 0.0, y1: yTop, proud: 0.02 });
      break;
    }
  }
  return out;
}
