/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
/**
 * Stand-ins for the parts of Pascal's `@pascal-app/core` the vendored cabinet
 * code uses — lib/kitchen/pascal/core.ts
 * ============================================================================
 * Types mirror Pascal's zod schemas (core/src/schema/nodes/cabinet.ts) as
 * plain TypeScript; Nooi builds the node objects itself (lib/kitchen/nodes).
 * Pascal's wall / level helpers are only reached by run-layout functions Nooi
 * never calls (wall-hosted runs); they are stubbed.
 *
 * Portions © 2026 Pascal Group Inc., MIT License — see ./LICENSE.
 */

import type { Material } from "three";

export type AnyNodeId = string;

export interface BaseNode {
  object?: "node";
  id: string;
  type: string;
  name?: string;
  parentId: string | null;
  visible?: boolean;
  metadata?: Record<string, unknown>;
}

export type CabinetCompartmentSchema =
  | { id: string; height?: number; type: "shelf"; shelfCount?: number }
  | { id: string; height?: number; type: "drawer"; drawerCount?: number }
  | { id: string; height?: number; type: "door"; doorType?: "single-left" | "single-right" | "double" | "glass"; shelfCount?: number }
  | { id: string; height?: number; type: "sink"; sinkLayout?: "single" | "double" | "double-offset" }
  | { id: string; height?: number; type: "oven" }
  | { id: string; height?: number; type: "microwave" }
  | { id: string; height?: number; type: "dishwasher" }
  | { id: string; height?: number; type: "cooktop-gas"; cooktopBurnersOn?: boolean; cooktopActiveBurners?: number[]; cooktopKnobProgress?: number[]; cooktopShowGrate?: boolean; cooktopLayout?: "gas-2burner" | "gas-4burner" | "gas-5burner-wok" | "gas-6burner" }
  | { id: string; height?: number; type: "cooktop-induction"; cooktopBurnersOn?: boolean; cooktopActiveBurners?: number[]; cooktopKnobProgress?: number[]; cooktopShowGrate?: boolean; cooktopLayout?: "induction-2zone" | "induction-4zone" }
  | { id: string; height?: number; type: "pull-out-pantry"; shelfCount?: number; pantryRackStyle?: "wire" | "tray" | "glass" }
  | { id: string; height?: number; type: "fridge-single" }
  | { id: string; height?: number; type: "fridge-double" }
  | { id: string; height?: number; type: "fridge-top-freezer" }
  | { id: string; height?: number; type: "fridge-bottom-freezer" }
  | { id: string; height?: number; type: "hood-pyramid" }
  | { id: string; height?: number; type: "hood-curved-glass" };

export type CabinetFrontStyle = "slab" | "shaker" | "raised-arch";
export type CabinetTopFinish = "none" | "top-cabinet" | "trim";

/** Canonical metric cabinet family used when no regional profile is selected. */
export const CABINET_METRIC_DEFAULTS = {
  depth: 0.6,
  carcassHeight: 0.8,
  plinthHeight: 0.1,
  countertopThickness: 0.02,
} as const;

export interface CabinetBoxFields {
  position: [number, number, number];
  rotation: number;
  supportSlabId?: string;
  width: number;
  depth: number;
  carcassHeight: number;
  operationState: number;
  plinthHeight: number;
  toeKickDepth: number;
  boardThickness: number;
  countertopThickness: number;
  countertopOverhang: number;
  countertopBackOverhang: number;
  withFinishedBack: boolean;
  frontThickness: number;
  frontGap: number;
  frontStyle: CabinetFrontStyle;
  panelReady: boolean;
  handleStyle: "none" | "bar" | "cutout" | "hole" | "knob";
  handlePosition: "auto" | "top" | "center";
  frontOverlay: "full" | "inset";
  withBottomPanel: boolean;
  showPlinth: boolean;
  withCountertop: boolean;
  material?: unknown;
  materialPreset?: string;
  slots?: Record<string, string>;
  stack?: CabinetCompartmentSchema[];
}

export interface CabinetNode extends BaseNode, CabinetBoxFields {
  type: "cabinet";
  runTier: "base" | "wall" | "tall";
  children: string[];
  barLedge?: { edge: "back" | "left" | "right"; height: number; depth: number };
  withWaterfall: boolean;
  withFinishedEnds: boolean;
}

export interface CabinetModuleNode extends BaseNode, CabinetBoxFields {
  type: "cabinet-module";
  children: string[];
  cabinetType: "base" | "tall";
  moduleKind: "standard" | "corner-filler" | "wall-filler";
  openSide?: "left" | "right";
  cornerShelf?: boolean;
  topFinish: CabinetTopFinish;
  topFinishHeight: number;
  topFinishDepth: number;
}

/** Pascal's wall node — only its shape is referenced here. */
export type WallNode = BaseNode & { type: "wall"; start: [number, number]; end: [number, number]; thickness?: number; [k: string]: any };

export type AnyNode = CabinetNode | CabinetModuleNode | WallNode | (Omit<BaseNode, "type"> & { type: "level" | "other"; [k: string]: any });

export type MaterialSchema = unknown;

export type CabinetSlotId =
  | "front" | "carcass" | "countertop" | "plinth" | "hardware" | "glass" | "appliance" | "applianceInterior";

export function cabinetSlots(): { slotId: CabinetSlotId; label: string; default: string }[] {
  return [
    { slotId: "front", label: "Front", default: "library:preset-softwhite" },
    { slotId: "carcass", label: "Carcass", default: "library:preset-softwhite" },
    { slotId: "countertop", label: "Countertop", default: "library:wood-finewood27" },
    { slotId: "plinth", label: "Plinth", default: "library:preset-softwhite" },
    { slotId: "hardware", label: "Hardware", default: "library:metal-chrome" },
    { slotId: "glass", label: "Glass", default: "library:preset-glass" },
    { slotId: "appliance", label: "Appliance", default: "library:metal-steel" },
    { slotId: "applianceInterior", label: "Appliance Interior", default: "library:preset-charcoal" },
  ];
}

export interface GeometryContext {
  resolve: <N = AnyNode>(id: AnyNodeId) => N | undefined;
  children: AnyNode[];
  siblings: AnyNode[];
  parent: AnyNode | null;
  materials?: Record<string, Material>;
}

/** Nooi has no material presets library; slot materials come from lib/kitchen/materials. */
export function getMaterialPresetByRef(_ref: string): undefined { return undefined; }

// ── wall-hosted runs: not used by Nooi ──────────────────────────────────────
export function getWallBodyLine(_wall: WallNode): { start: { x: number; y: number }; end: { x: number; y: number } } {
  return { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } };
}
export function getWallFaceOffsets(_wall: WallNode): { a: number; b: number } { return { a: 0, b: 0 }; }
export function getWallBodyCenterOffset(_wall: WallNode): number { return 0; }
export function resolveLevelId(_node: AnyNode, _nodes: Record<AnyNodeId, AnyNode>): string | null { return null; }
