/**
 * Plan frame: the ONE place plan percentages become metres — lib/geometry/planFrame.ts
 * ============================================================================
 * Walls and room outlines are stored as percentages of the uploaded plan
 * image (that is what the detector returns and what the 2D editor draws on).
 * Everything that measures, welds, snaps or renders needs metres. Converting
 * ad hoc in each component is how unit bugs happen — this week's floor tiles
 * were scaled twice because one path thought in % and another in metres.
 *
 * So: storage and the 2D overlay speak %, everything else speaks metres, and
 * this file is the only bridge. There are three kinds of length:
 *
 *   plan %       x along the image width, y down the image height, 0–100.
 *                Wall thickness is % of the larger plan side.
 *   scene metres the 3D world: origin at the plan centre, x right, z down the
 *                plan. Sized widthM × depthM.
 *   real metres  what the user measured. The scene footprint is drawn
 *                `visualScale` times larger than real (a presentation choice
 *                that makes the dollhouse view read airier), so lengths and
 *                areas shown to the user are divided back down. Heights and
 *                wall thickness are NOT stretched — only the floor layout is.
 */

export interface PlanFrame {
  /** scene metres along plan x / plan y */
  widthM: number;
  depthM: number;
  /** scene metres per real metre, for footprint lengths (≥ 1) */
  visualScale: number;
}

export function makeFrame(widthCm: number, depthCm: number, visualScale = 1): PlanFrame {
  return { widthM: widthCm / 100, depthM: depthCm / 100, visualScale: visualScale > 0 ? visualScale : 1 };
}

export const maxSide = (f: PlanFrame) => Math.max(f.widthM, f.depthM);

// ── points ──────────────────────────────────────────────────────────────────

export const pctToSceneX = (f: PlanFrame, x: number) => (x / 100) * f.widthM - f.widthM / 2;
export const pctToSceneZ = (f: PlanFrame, y: number) => (y / 100) * f.depthM - f.depthM / 2;
export const sceneToPctX = (f: PlanFrame, x: number) => ((x + f.widthM / 2) / f.widthM) * 100;
export const sceneToPctY = (f: PlanFrame, z: number) => ((z + f.depthM / 2) / f.depthM) * 100;

// ── lengths ─────────────────────────────────────────────────────────────────

/** footprint length: scene metres → what the user measured */
export const sceneToReal = (f: PlanFrame, m: number) => m / f.visualScale;
export const realToScene = (f: PlanFrame, m: number) => m * f.visualScale;
/** floor area: scene m² → real m² */
export const sceneAreaToReal = (f: PlanFrame, m2: number) => m2 / (f.visualScale * f.visualScale);

/** Snap a scene coordinate so the real distance lands on a whole centimetre. */
export const snapSceneToRealCm = (f: PlanFrame, m: number) =>
  realToScene(f, Math.round(sceneToReal(f, m) * 100) / 100);

// ── walls ───────────────────────────────────────────────────────────────────

export interface PctWall {
  x1: number; y1: number; x2: number; y2: number;   // plan %
  thickness: number;                                 // % of the larger side
  id?: string;
}

/** A wall's centreline in scene metres. `y` is the plan's depth axis (scene
 *  z) — kept as `y` so the same axis-aligned helpers serve both spaces. */
export interface SceneWall {
  x1: number; y1: number; x2: number; y2: number;   // scene metres
  thickness: number;                                 // scene metres, unclamped
  id?: string;
}

export function wallToScene<W extends PctWall>(f: PlanFrame, w: W): W & SceneWall {
  return {
    ...w,
    x1: pctToSceneX(f, w.x1), y1: pctToSceneZ(f, w.y1),
    x2: pctToSceneX(f, w.x2), y2: pctToSceneZ(f, w.y2),
    thickness: (w.thickness / 100) * maxSide(f),
  };
}

/** Plan % keeps 6 decimals: well under a millimetre on any real plan, and it
 *  stops float noise (10.000000000000004) from creeping into saved data. */
const r6 = (v: number) => Math.round(v * 1e6) / 1e6;

export function wallToPct<W extends SceneWall>(f: PlanFrame, w: W): W & PctWall {
  return {
    ...w,
    x1: r6(sceneToPctX(f, w.x1)), y1: r6(sceneToPctY(f, w.y1)),
    x2: r6(sceneToPctX(f, w.x2)), y2: r6(sceneToPctY(f, w.y2)),
    thickness: r6((w.thickness / maxSide(f)) * 100),
  };
}

/** Polygon area (shoelace), any unit. */
export function polygonArea(poly: [number, number][]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  }
  return Math.abs(a) / 2;
}
