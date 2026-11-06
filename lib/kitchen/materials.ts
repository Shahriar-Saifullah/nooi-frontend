/**
 * Kitchen finishes — lib/kitchen/materials.ts
 * ============================================================================
 * The kitchen's style (front colour, countertop, handles) as three.js
 * materials, one per cabinet part ("slot": front, carcass, countertop, plinth,
 * hardware, glass, appliance, appliance interior). The vendored Pascal
 * geometry asks for a slot's material while it builds (pascal/geometry/
 * shared.ts → slotMaterial), so the style is set just before a build.
 *
 * Stone and wood countertops use small textures painted on a canvas at
 * runtime (no image files to ship). Box UVs are in metres (1 UV = 1 m), so a
 * texture repeats per metre and keeps its scale on any length of counter.
 */

import * as THREE from "three";
import type { CabinetSlotId } from "./pascal/core";

export type FrontStyle = "slab" | "shaker" | "raised-arch";
export type HandleStyle = "bar" | "knob" | "cutout" | "none";

export interface KitchenStyle {
  frontStyle: FrontStyle;
  handleStyle: HandleStyle;
  /** cabinet front colour, or a wood finish id */
  front: string;
  countertop: string;
  hardware: "chrome" | "black" | "brass";
}

export const DEFAULT_KITCHEN_STYLE: KitchenStyle = {
  frontStyle: "shaker", handleStyle: "bar", front: "#f2efe8", countertop: "quartz-white", hardware: "chrome",
};

export const FRONT_FINISHES: { id: string; name: string; swatch: string }[] = [
  { id: "#f6f4ef", name: "White", swatch: "#f6f4ef" },
  { id: "#f2efe8", name: "Cream", swatch: "#f2efe8" },
  { id: "#cfd2d0", name: "Light grey", swatch: "#cfd2d0" },
  { id: "#9aa894", name: "Sage green", swatch: "#9aa894" },
  { id: "#2f3e53", name: "Navy", swatch: "#2f3e53" },
  { id: "#3a3b3d", name: "Charcoal", swatch: "#3a3b3d" },
  { id: "wood-oak", name: "Light oak", swatch: "#c9a375" },
  { id: "wood-walnut", name: "Walnut", swatch: "#6b4a33" },
];

export const COUNTERTOPS: { id: string; name: string; swatch: string }[] = [
  { id: "quartz-white", name: "White quartz", swatch: "#f1f0ec" },
  { id: "marble-calacatta", name: "Calacatta marble", swatch: "#eeebe6" },
  { id: "granite-black", name: "Black granite", swatch: "#2b2b2c" },
  { id: "quartz-grey", name: "Grey quartz", swatch: "#a7a6a2" },
  { id: "wood-oak", name: "Oak butcher block", swatch: "#c9a375" },
];

export const HARDWARE: { id: KitchenStyle["hardware"]; name: string; swatch: string }[] = [
  { id: "chrome", name: "Chrome", swatch: "#c9ccd0" },
  { id: "black", name: "Matte black", swatch: "#222" },
  { id: "brass", name: "Brass", swatch: "#b8954f" },
];

// ── canvas textures ─────────────────────────────────────────────────────────

const texCache = new Map<string, THREE.Texture>();

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function canvasTexture(key: string, draw: (g: CanvasRenderingContext2D, size: number) => void): THREE.Texture | null {
  const hit = texCache.get(key);
  if (hit) return hit;
  if (typeof document === "undefined") return null;
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const g = c.getContext("2d");
  if (!g) return null;
  draw(g, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  texCache.set(key, tex);
  return tex;
}

/** Soft white stone with grey veins (one tile ≈ 1 m). */
const marble = () => canvasTexture("marble", (g, n) => {
  g.fillStyle = "#efece7"; g.fillRect(0, 0, n, n);
  const r = rng(7);
  for (let v = 0; v < 9; v++) {
    g.strokeStyle = `rgba(120,120,125,${0.18 + r() * 0.25})`;
    g.lineWidth = 0.6 + r() * 2.2;
    g.beginPath();
    let x = r() * n, y = -10;
    g.moveTo(x, y);
    while (y < n + 10) {
      x += (r() - 0.45) * 40; y += 12 + r() * 22;
      g.lineTo(x, y);
    }
    g.stroke();
  }
});

/** Speckled stone. */
const speckle = (key: string, base: string, flecks: string[]) => canvasTexture(key, (g, n) => {
  g.fillStyle = base; g.fillRect(0, 0, n, n);
  const r = rng(key.length * 97);
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = flecks[Math.floor(r() * flecks.length)];
    const s = 0.6 + r() * 2.2;
    g.fillRect(r() * n, r() * n, s, s);
  }
});

/** Straight-grain wood along U (the counter's length). */
const wood = (key: string, base: [number, number, number]) => canvasTexture(key, (g, n) => {
  const r = rng(key.length * 31);
  for (let y = 0; y < n; y++) {
    const band = Math.sin(y * 0.09 + Math.sin(y * 0.013) * 4) * 0.5 + 0.5;
    const k = 0.86 + band * 0.14 + (r() - 0.5) * 0.04;
    g.fillStyle = `rgb(${base.map(c => Math.round(c * k)).join(",")})`;
    g.fillRect(0, y, n, 1);
  }
  // board joints
  g.fillStyle = "rgba(60,40,25,0.25)";
  for (let y = 0; y < n; y += n / 6) g.fillRect(0, y, n, 1);
});

// ── slot materials ──────────────────────────────────────────────────────────

let style: KitchenStyle = DEFAULT_KITCHEN_STYLE;
const matCache = new Map<string, THREE.Material>();

/** Set the style the next builds use. */
export function setKitchenStyle(s: KitchenStyle) { style = s; }

function cached(key: string, make: () => THREE.Material): THREE.Material {
  let m = matCache.get(key);
  if (!m) { m = make(); matCache.set(key, m); }
  return m;
}

function finish(id: string, roughness: number): THREE.Material {
  if (id === "wood-oak") return cached(`wood-oak|${roughness}`, () => new THREE.MeshStandardMaterial({ map: wood("oak", [205, 165, 115]), roughness }));
  if (id === "wood-walnut") return cached(`wood-walnut|${roughness}`, () => new THREE.MeshStandardMaterial({ map: wood("walnut", [112, 78, 54]), roughness }));
  return cached(`paint|${id}|${roughness}`, () => new THREE.MeshStandardMaterial({ color: id, roughness }));
}

function countertop(id: string): THREE.Material {
  return cached(`top|${id}`, () => {
    switch (id) {
      case "marble-calacatta": return new THREE.MeshStandardMaterial({ map: marble(), roughness: 0.18 });
      case "granite-black": return new THREE.MeshStandardMaterial({ map: speckle("granite-black", "#252526", ["#3d3d3f", "#55555a", "#16161a", "#6b6b70"]), roughness: 0.2 });
      case "quartz-grey": return new THREE.MeshStandardMaterial({ map: speckle("quartz-grey", "#a8a7a3", ["#bdbcb8", "#93928e", "#c9c8c4"]), roughness: 0.25 });
      case "wood-oak": return new THREE.MeshStandardMaterial({ map: wood("oak-top", [205, 165, 115]), roughness: 0.5 });
      default: return new THREE.MeshStandardMaterial({ map: speckle("quartz-white", "#f1f0ec", ["#e2e0db", "#fbfaf8", "#d8d6d1"]), roughness: 0.22 });
    }
  });
}

export function slotMaterial(slot: CabinetSlotId | string): THREE.Material {
  switch (slot) {
    case "front": return finish(style.front, 0.55);
    case "carcass": return finish(style.front.startsWith("wood") ? "#efe9df" : style.front, 0.7);
    case "plinth": return finish(style.front.startsWith("wood") ? "#3a3632" : style.front, 0.7);
    case "countertop": return countertop(style.countertop);
    case "hardware":
      return cached(`hw|${style.hardware}`, () => new THREE.MeshStandardMaterial(
        style.hardware === "black" ? { color: "#1c1c1d", roughness: 0.5, metalness: 0.4 }
        : style.hardware === "brass" ? { color: "#c2a15c", roughness: 0.3, metalness: 0.9 }
        : { color: "#d8dbde", roughness: 0.2, metalness: 0.95 }));
    case "glass":
      return cached("glass", () => new THREE.MeshPhysicalMaterial({ color: "#dfe9ee", transparent: true, opacity: 0.3, roughness: 0.05 }));
    case "appliance":
      return cached("appliance", () => new THREE.MeshStandardMaterial({ color: "#c4c7ca", roughness: 0.32, metalness: 0.85 }));
    case "applianceInterior":
      return cached("applianceInterior", () => new THREE.MeshStandardMaterial({ color: "#2a2b2d", roughness: 0.6 }));
    default:
      return finish(style.front, 0.6);
  }
}
