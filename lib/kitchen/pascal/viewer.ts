/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Stand-ins for the parts of Pascal's `@pascal-app/viewer` the vendored
 * cabinet code uses — lib/kitchen/pascal/viewer.ts
 * ============================================================================
 * Pascal resolves materials from its own library; Nooi gives every cabinet
 * part ("slot") its material from the kitchen's style (lib/kitchen/materials),
 * so the material helpers here only need to return something sensible.
 *
 * Portions © 2026 Pascal Group Inc., MIT License — see ./LICENSE.
 */

import * as THREE from "three";
import { slotMaterial } from "../materials";
export { applyWorldScaleBoxUVs } from "./box-uv";
export { Brush, SUBTRACTION, csgEvaluator, csgGeometry, prepareBrushForCSG } from "./csg-utils";

export type RenderShading = "solid" | "rendered";
export type ColorPreset = "clay" | "white" | "mono" | "blueprint";

export const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: "#dfe9ee", transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0, depthWrite: false,
});

export function createDefaultMaterial(color = "#ffffff", roughness = 0.6, _shading: RenderShading = "rendered"): THREE.Material {
  return new THREE.MeshStandardMaterial({ color, roughness });
}
export function createMaterial(_m: unknown, _shading: RenderShading = "rendered"): THREE.Material {
  return new THREE.MeshStandardMaterial({ color: "#f2f0ec", roughness: 0.6 });
}
export function applyMaterialPresetToMaterials(_m: THREE.Material, _preset: unknown) { /* no presets in Nooi */ }
export function createSurfaceRoleMaterial(_role: string, _preset: ColorPreset, _side?: THREE.Side, _theme?: string): THREE.Material {
  return slotMaterial("carcass");
}
export function resolveMaterialRef(_ref: string, _materials: unknown, _shading: RenderShading): THREE.Material | null {
  return null;
}
/** Pascal's slot defaults → the kitchen style's material for that slot. */
export function resolveSlotDefaultMaterial(ref: string, _shading: RenderShading, _roughness?: number): THREE.Material {
  const slot = ref.includes("glass") ? "glass"
    : ref.includes("chrome") ? "hardware"
    : ref.includes("steel") ? "appliance"
    : ref.includes("charcoal") ? "applianceInterior"
    : ref.includes("wood") ? "countertop"
    : "carcass";
  return slotMaterial(slot);
}
