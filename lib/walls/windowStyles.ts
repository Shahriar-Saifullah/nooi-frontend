/**
 * Window styles — lib/walls/windowStyles.ts
 * ============================================================================
 * A window opening can be drawn as one of several styles, with a frame
 * finish. Stored on the opening itself (PlanOpening.style / .frame) so it
 * moves and resizes with it. Pure: `windowParts` returns the boxes to draw,
 * in wall coordinates, and the scene turns them into meshes.
 *
 *   along   metres along the wall's axis (same as the wall cut)
 *   y       metres above the floor
 *   z       offset across the wall from its centreline, metres
 */

export type WindowStyle = "fixed" | "casement" | "sliding" | "grid" | "full-height" | "mashrabiya";
export type FrameFinish = "white" | "black" | "bronze" | "wood" | "silver";

export const WINDOW_STYLES: { id: WindowStyle; name: string; hint: string }[] = [
  { id: "fixed", name: "Picture", hint: "One fixed pane" },
  { id: "casement", name: "Casement", hint: "Two side-hung sashes" },
  { id: "sliding", name: "Sliding", hint: "Two panels that slide past each other" },
  { id: "grid", name: "Grid", hint: "Divided panes (Georgian)" },
  { id: "full-height", name: "Floor to ceiling", hint: "Tall glazing from the floor" },
  { id: "mashrabiya", name: "Mashrabiya", hint: "Wooden lattice screen over the glass" },
];

export const FRAME_FINISHES: { id: FrameFinish; name: string; hex: string; metal: boolean }[] = [
  { id: "white", name: "White", hex: "#f1f1ed", metal: false },
  { id: "black", name: "Black", hex: "#232628", metal: true },
  { id: "bronze", name: "Bronze", hex: "#6b5a45", metal: true },
  { id: "silver", name: "Silver", hex: "#b9bec2", metal: true },
  { id: "wood", name: "Wood", hex: "#8a7360", metal: false },
];

export const DEFAULT_WINDOW_STYLE: WindowStyle = "fixed";
export const DEFAULT_FRAME: FrameFinish = "wood";

export const isWindowStyle = (s: unknown): s is WindowStyle =>
  typeof s === "string" && WINDOW_STYLES.some(w => w.id === s);
export const isFrameFinish = (s: unknown): s is FrameFinish =>
  typeof s === "string" && FRAME_FINISHES.some(f => f.id === s);

export const frameFinish = (id: unknown) =>
  FRAME_FINISHES.find(f => f.id === id) ?? FRAME_FINISHES.find(f => f.id === DEFAULT_FRAME)!;

export type PartMaterial = "frame" | "glass" | "lattice";

export interface WindowPart {
  a0: number; a1: number;
  y0: number; y1: number;
  /** centre offset across the wall, metres */
  z: number;
  /** thickness across the wall, metres */
  depth: number;
  mat: PartMaterial;
}

/** Where the glazing starts and stops, metres above the floor. */
export function windowSpanY(style: WindowStyle, sill: number, head: number, wallH: number): { sill: number; head: number } {
  if (style === "full-height") return { sill: 0.04, head: Math.min(wallH - 0.15, head + 0.3) };
  return { sill, head };
}

const F = 0.05;        // outer frame
const BAR = 0.035;     // mullions, sash stiles
const MUNTIN = 0.02;   // glazing bars

/**
 * The boxes that make up a window of this style, between `start` and `end`
 * along the wall. `t` is the wall's thickness.
 */
export function windowParts(
  style: WindowStyle, start: number, end: number, sill: number, head: number, t: number,
): WindowPart[] {
  const parts: WindowPart[] = [];
  const fd = Math.min(0.09, t * 0.7);           // frame depth
  const gd = 0.012;                             // glass
  const push = (a0: number, a1: number, y0: number, y1: number, mat: PartMaterial, z = 0, depth = fd) => {
    if (a1 - a0 > 1e-4 && y1 - y0 > 1e-4) parts.push({ a0, a1, y0, y1, z, depth, mat });
  };
  const w = end - start;

  // outer frame
  push(start, start + F, sill, head, "frame");
  push(end - F, end, sill, head, "frame");
  push(start + F, end - F, sill, sill + F, "frame");
  push(start + F, end - F, head - F, head, "frame");

  const i0 = start + F, i1 = end - F;           // inside the frame
  const y0 = sill + F, y1 = head - F;
  const mid = (start + end) / 2;

  switch (style) {
    case "casement": {
      push(mid - BAR / 2, mid + BAR / 2, y0, y1, "frame");
      push(i0, mid - BAR / 2, y0, y1, "glass", 0, gd);
      push(mid + BAR / 2, i1, y0, y1, "glass", 0, gd);
      // handles on the meeting stiles
      const hy = (y0 + y1) / 2;
      push(mid - BAR / 2 - 0.03, mid - BAR / 2 - 0.012, hy - 0.06, hy + 0.06, "frame", fd / 2 + 0.01, 0.02);
      push(mid + BAR / 2 + 0.012, mid + BAR / 2 + 0.03, hy - 0.06, hy + 0.06, "frame", fd / 2 + 0.01, 0.02);
      break;
    }
    case "sliding": {
      const overlap = 0.04;
      const half = (i1 - i0) / 2;
      const off = fd * 0.25;
      ([[i0, i0 + half + overlap / 2, -off], [i1 - half - overlap / 2, i1, off]] as const).forEach(([a, b, z]) => {
        push(a, a + BAR, y0, y1, "frame", z, fd * 0.4);
        push(b - BAR, b, y0, y1, "frame", z, fd * 0.4);
        push(a + BAR, b - BAR, y0, y0 + BAR, "frame", z, fd * 0.4);
        push(a + BAR, b - BAR, y1 - BAR, y1, "frame", z, fd * 0.4);
        push(a + BAR, b - BAR, y0 + BAR, y1 - BAR, "glass", z, gd);
      });
      break;
    }
    case "grid": {
      push(i0, i1, y0, y1, "glass", 0, gd);
      const cols = Math.max(2, Math.round(w / 0.4));
      const rows = Math.max(2, Math.round((y1 - y0) / 0.4));
      for (let k = 1; k < cols; k++) {
        const a = i0 + ((i1 - i0) * k) / cols;
        push(a - MUNTIN / 2, a + MUNTIN / 2, y0, y1, "frame", 0, fd * 0.45);
      }
      for (let k = 1; k < rows; k++) {
        const y = y0 + ((y1 - y0) * k) / rows;
        push(i0, i1, y - MUNTIN / 2, y + MUNTIN / 2, "frame", 0, fd * 0.45);
      }
      break;
    }
    case "full-height": {
      push(i0, i1, y0, y1, "glass", 0, gd);
      // a mullion every ~1.2 m, and a transom at door height
      const bays = Math.max(1, Math.round(w / 1.2));
      for (let k = 1; k < bays; k++) {
        const a = i0 + ((i1 - i0) * k) / bays;
        push(a - BAR / 2, a + BAR / 2, y0, y1, "frame");
      }
      const tr = Math.min(y1 - 0.3, 2.1);
      if (tr > y0 + 0.5) push(i0, i1, tr - BAR / 2, tr + BAR / 2, "frame");
      break;
    }
    case "mashrabiya": {
      push(i0, i1, y0, y1, "glass", -fd * 0.2, gd);
      // a square lattice of turned-wood bars, standing proud on the room side
      const step = 0.09;
      const z = fd * 0.3;
      const nA = Math.max(2, Math.round((i1 - i0) / step));
      const nY = Math.max(2, Math.round((y1 - y0) / step));
      for (let k = 1; k < nA; k++) {
        const a = i0 + ((i1 - i0) * k) / nA;
        push(a - 0.008, a + 0.008, y0, y1, "lattice", z, 0.02);
      }
      for (let k = 1; k < nY; k++) {
        const y = y0 + ((y1 - y0) * k) / nY;
        push(i0, i1, y - 0.008, y + 0.008, "lattice", z + 0.006, 0.02);
      }
      break;
    }
    case "fixed":
    default:
      push(i0, i1, y0, y1, "glass", 0, gd);
  }
  return parts;
}
