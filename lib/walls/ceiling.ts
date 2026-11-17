/**
 * Ceiling designs — lib/walls/ceiling.ts
 * ============================================================================
 * Saved per room (rooms[].ceiling). The flat ceiling stays the default.
 *
 *   tray       a dropped border (bulkhead) round the room with a hidden LED
 *              strip in its inner edge, washing the raised middle with light —
 *              the stepped ceiling in most Gulf living rooms
 *   coffered   a grid of deep beams across the middle
 *   beams      parallel beams across the room's short side
 *
 * All sizes in metres. Geometry here is pure (floor coordinates x, z), so the
 * tests share it; the 3D scene turns it into meshes.
 */

export type CeilingStyle = "flat" | "tray" | "coffered" | "beams";
export type LedTone = "warm" | "neutral" | "cool";

export interface CeilingSpec {
  style: CeilingStyle;
  /** tray: how far the border drops below the ceiling */
  drop?: number;
  /** tray: how wide the border is */
  inset?: number;
  /** tray: the hidden LED strip */
  led?: boolean;
  ledTone?: LedTone;
}

export const CEILING_STYLES: { id: CeilingStyle; label: string }[] = [
  { id: "flat", label: "Flat" },
  { id: "tray", label: "Stepped + LED" },
  { id: "coffered", label: "Coffered" },
  { id: "beams", label: "Beams" },
];

export const LED_COLOURS: Record<LedTone, string> = { warm: "#ffd7a0", neutral: "#fff1dc", cool: "#e6f0ff" };

export const DEFAULT_TRAY = { drop: 0.25, inset: 0.55 };

/** A stored ceiling → a usable one, or null for flat / nonsense. */
export function cleanCeilingSpec(raw: unknown): CeilingSpec | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const style = r.style;
  if (style !== "tray" && style !== "coffered" && style !== "beams") return null;
  const num = (v: unknown, lo: number, hi: number, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
  };
  return {
    style,
    drop: num(r.drop, 0.1, 0.6, DEFAULT_TRAY.drop),
    inset: num(r.inset, 0.25, 1.5, DEFAULT_TRAY.inset),
    led: r.led !== false,
    ledTone: r.ledTone === "neutral" || r.ledTone === "cool" ? r.ledTone : "warm",
  };
}

export type XZ = [number, number];

function signedArea(p: XZ[]): number {
  let a = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] * p[i][1]) - (p[i][0] * p[j][1]);
  return a / 2;
}

/**
 * The polygon moved inwards by `d` on every side — the inner edge of a tray
 * border. Each edge is shifted along its inward normal and neighbours are
 * re-intersected; good for the rectangles and L-shapes rooms are drawn as.
 * Null when the room is too small for the border.
 */
export function insetPolygon(poly: XZ[], d: number): XZ[] | null {
  const n = poly.length;
  if (n < 3) return null;
  const ccw = signedArea(poly) > 0;
  const lines = poly.map((a, i) => {
    const b = poly[(i + 1) % n];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1;
    // inward normal: left of the edge for a CCW polygon, right for CW
    const nx = ccw ? -dz / len : dz / len, nz = ccw ? dx / len : -dx / len;
    return { p: [a[0] + nx * d, a[1] + nz * d] as XZ, dir: [dx / len, dz / len] as XZ };
  });
  const out: XZ[] = [];
  for (let i = 0; i < n; i++) {
    const l1 = lines[(i + n - 1) % n], l2 = lines[i];
    const cross = l1.dir[0] * l2.dir[1] - l1.dir[1] * l2.dir[0];
    if (Math.abs(cross) < 1e-6) { out.push(l2.p); continue; }  // straight run
    const t = ((l2.p[0] - l1.p[0]) * l2.dir[1] - (l2.p[1] - l1.p[1]) * l2.dir[0]) / cross;
    out.push([l1.p[0] + l1.dir[0] * t, l1.p[1] + l1.dir[1] * t]);
  }
  // the border must leave a real middle, the same way round as the room
  const a0 = signedArea(poly), a1 = signedArea(out);
  if (Math.sign(a0) !== Math.sign(a1) || Math.abs(a1) < Math.abs(a0) * 0.15) return null;
  return out;
}

export interface Beam { x: number; z: number; w: number; d: number }

/** Where a line x = c (axis "x") or z = c (axis "z") is inside the polygon. */
export function insideSpans(poly: XZ[], axis: "x" | "z", c: number): [number, number][] {
  const hits: number[] = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j], [bx, bz] = poly[i];
    const [ua, va, ub, vb] = axis === "x" ? [ax, az, bx, bz] : [az, ax, bz, bx];
    if ((ua > c) !== (ub > c)) hits.push(va + ((c - ua) * (vb - va)) / (ub - ua));
  }
  hits.sort((a, b) => a - b);
  const out: [number, number][] = [];
  for (let k = 0; k + 1 < hits.length; k += 2) out.push([hits[k], hits[k + 1]]);
  return out;
}

/**
 * Beams across a room: a grid (coffered) or one direction (beams, spanning
 * the shorter side), spaced close to `spacing`, cut to the room's outline so
 * an L-shaped room doesn't get beams through its walls.
 */
export function ceilingBeams(poly: XZ[], style: "coffered" | "beams", spacing = 1.2, width = 0.16): Beam[] {
  const xs = poly.map(p => p[0]), zs = poly.map(p => p[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const W = x1 - x0, D = z1 - z0;
  const out: Beam[] = [];
  const steps = (len: number) => {
    const k = Math.max(1, Math.round(len / spacing));
    return Array.from({ length: k - 1 }, (_, i) => ((i + 1) * len) / k);
  };
  const spanZ = style === "coffered" || W > D;  // beams lying along z, spaced across x
  const spanX = style === "coffered" || W <= D; // beams lying along x, spaced across z
  if (spanZ) {
    for (const t of steps(W)) for (const [a, b] of insideSpans(poly, "x", x0 + t)) {
      out.push({ x: x0 + t, z: (a + b) / 2, w: width, d: b - a });
    }
  }
  if (spanX) {
    for (const t of steps(D)) for (const [a, b] of insideSpans(poly, "z", z0 + t)) {
      out.push({ x: (a + b) / 2, z: z0 + t, w: b - a, d: width });
    }
  }
  return out;
}
