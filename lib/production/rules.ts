/**
 * Factory construction rules — lib/production/rules.ts
 * ============================================================================
 * THE ONE SETTINGS FILE for how a Nooi kitchen is turned into parts. The
 * design (what the client approved in 3D) fixes each cabinet's outside size:
 * width, height, depth. These rules decide how that box is built: board
 * thicknesses, how the back is fitted, gaps between doors, edge banding,
 * hinges per door, and so on.
 *
 * These are common defaults for flat-pack / 32 mm-system kitchens in the
 * Gulf. When a factory sends its own rules, copy DEFAULT_RULES, change what
 * differs, and give it the factory's id — the same kitchen then produces a
 * pack matched to that factory. Nothing else in lib/production needs editing.
 *
 * All sizes in millimetres.
 */

export type BackFitting =
  /** back panel sits in a groove in the sides, top and bottom */
  | "grooved"
  /** back panel nailed / screwed onto the rear edges of the carcass */
  | "nailed";

export interface ProductionRules {
  id: string;
  name: string;

  // ── boards ────────────────────────────────────────────────────────────────
  /** carcass board (sides, bottom, top, shelves) */
  carcassBoard: { material: string; thickness: number };
  /** back panel */
  backBoard: { material: string; thickness: number };
  /** door and drawer fronts; the colour/finish comes from the design */
  frontBoard: { material: string; thickness: number };
  /** plinth (kick board) */
  plinthBoard: { material: string; thickness: number };

  // ── carcass construction ─────────────────────────────────────────────────
  backFitting: BackFitting;
  /** grooved backs: how deep the groove is, and how far it sits in from the rear edge */
  backGroove: { depth: number; setback: number };
  /** base cabinets have no full top — two rails across instead */
  baseTopRails: { width: number };
  /** shelves: set back from the front edge, and clearance either side */
  shelf: { frontSetback: number; sideClearance: number };

  // ── fronts ───────────────────────────────────────────────────────────────
  /** gap between neighbouring fronts (doors, drawers, next cabinet) */
  frontGap: number;
  /** sink cabinets: a fixed false front at the top (0 = full-height doors) */
  sinkFalseFront: number;

  // ── edge banding ─────────────────────────────────────────────────────────
  /** carcass edges that show (front edges of sides, bottom, shelves) */
  carcassBanding: { material: string; thickness: number };
  /** every edge of every front */
  frontBanding: { material: string; thickness: number };
  /** cut size = finished size minus the banding on that edge (true for 1 mm+ ABS) */
  deductBanding: boolean;

  // ── plinth & worktop ─────────────────────────────────────────────────────
  /** plinth set back from the front of the cabinets */
  plinthSetback: number;
  /** worktop sticks out past the door faces by this much */
  worktopFrontOverhang: number;
  /** worktop thickness by material id; anything not listed uses `default` */
  worktopThickness: Record<string, number>;
  /** longest single worktop piece by material id (slab size); longer runs get a joint */
  worktopMaxLength: Record<string, number>;

  // ── hardware ─────────────────────────────────────────────────────────────
  /** hinges per door by door height: up to `upTo` mm → `count` hinges */
  hinges: { upTo: number; count: number }[];
  hingeName: string;
  /** drawer runner length: the longest of these that fits the cabinet's inside depth */
  runnerLengths: number[];
  runnerName: string;
  legName: string;
  /** legs per floor-standing cabinet: 4, or 6 when wider than `wideFrom` */
  legs: { normal: number; wide: number; wideFrom: number };
  wallHangerName: string;
  shelfPinsPerShelf: number;
}

export const DEFAULT_RULES: ProductionRules = {
  id: "nooi-default",
  name: "Nooi standard (until the factory's own rules are set)",

  carcassBoard: { material: "Melamine MFC, white", thickness: 18 },
  backBoard: { material: "HDF, white", thickness: 8 },
  frontBoard: { material: "MDF, finished as designed", thickness: 18 },
  plinthBoard: { material: "Melamine MFC, to match fronts", thickness: 16 },

  backFitting: "grooved",
  backGroove: { depth: 8, setback: 18 },
  baseTopRails: { width: 100 },
  shelf: { frontSetback: 20, sideClearance: 1 },

  frontGap: 3,
  sinkFalseFront: 220,

  carcassBanding: { material: "PVC 0.8 mm, white", thickness: 0.8 },
  frontBanding: { material: "ABS 1 mm, to match fronts", thickness: 1 },
  deductBanding: true,

  plinthSetback: 75,
  worktopFrontOverhang: 20,
  worktopThickness: { default: 20, "wood-oak": 38 },
  worktopMaxLength: { default: 3000, "wood-oak": 4000 },

  hinges: [{ upTo: 900, count: 2 }, { upTo: 1600, count: 3 }, { upTo: 2200, count: 4 }, { upTo: 99999, count: 5 }],
  hingeName: "Concealed hinge 110°, soft close, full overlay",
  runnerLengths: [300, 350, 400, 450, 500, 550],
  runnerName: "Full-extension runner pair, soft close",
  legName: "Adjustable cabinet leg 100 mm",
  legs: { normal: 4, wide: 6, wideFrom: 900 },
  wallHangerName: "Wall cabinet hanger pair + rail",
  shelfPinsPerShelf: 4,
};

/** Hinges for a door of this height. */
export function hingesFor(rules: ProductionRules, height: number): number {
  return (rules.hinges.find(h => height <= h.upTo) ?? rules.hinges[rules.hinges.length - 1]).count;
}

/** Longest runner that fits this inside depth (0 when none does). */
export function runnerFor(rules: ProductionRules, insideDepth: number): number {
  return [...rules.runnerLengths].sort((a, b) => b - a).find(l => l <= insideDepth - 10) ?? 0;
}

export const worktopThickness = (r: ProductionRules, id: string) => r.worktopThickness[id] ?? r.worktopThickness.default ?? 20;
export const worktopMaxLength = (r: ProductionRules, id: string) => r.worktopMaxLength[id] ?? r.worktopMaxLength.default ?? 3000;
