/**
 * Wall surface library — tileable materials applied to a single wall face
 * ------------------------------------------------------------------------
 * These are TEXTURES, not geometry. A slatted wood panel supplied as a 4 m
 * 3D model would cost ~12k polys, only fit walls of that exact size, and need
 * manual alignment. The same panel as a tiling texture + normal map costs
 * almost nothing, stretches to any wall, and lines up automatically.
 *
 * Extracting a surface from a 3DSKY / CGTrader pack:
 *   1. Open the pack's texture folder
 *   2. The colour/diffuse map is the one that looks like the material
 *   3. The blue-violet image is the NORMAL map (surface relief, not a photo)
 *   4. Resize to 1024–2048 px, save as .jpg, drop in /public/textures/wall/
 *   5. Add an entry below with the real-world size of one tile
 *
 * tileSize is what makes scale correct: it's how large one repetition of the
 * image is IN METRES on a real wall. Get it wrong and the grain looks like
 * either matchsticks or tree trunks.
 */

export type SurfaceCategory = "wood" | "plaster" | "stone" | "tile" | "brick" | "fabric";

export interface WallSurface {
  id: string;                 // STABLE — saved per wall face, never rename
  name: string;
  category: SurfaceCategory;
  map: string;                // colour/diffuse texture
  normalMap?: string;         // optional relief map
  tileSize: { w: number; h: number };  // metres covered by one repetition
  roughness?: number;
  /** tint multiplied over the texture; keep white unless the map is greyscale */
  color?: string;
  thumbnail?: string;         // defaults to `map`
  credit?: { source: string; license: string; url?: string };
}

export const SURFACE_CATEGORY_LABELS: Record<SurfaceCategory, string> = {
  wood: "Wood",
  plaster: "Plaster",
  stone: "Stone",
  tile: "Tile",
  brick: "Brick",
  fabric: "Fabric",
};

export const WALL_SURFACES: WallSurface[] = [
  // ── From the "wall panel 40" pack (3DSKY) ────────────────────────────────
  // The pack's model is 403.8 x 300 cm, so one panel ≈ 4.04 m x 3.0 m. Using
  // the pack's own grain + normal map reproduces the look at any wall size.
  {
    id: "wood-panel-40",
    name: "Walnut Slat Panel",
    category: "wood",
    map: "/textures/wall/wood_panel_40.jpg",
    normalMap: "/textures/wall/wood_panel_40_normal.jpg",
    tileSize: { w: 4.04, h: 3.0 },
    roughness: 0.65,
    credit: { source: "3DSKY", license: "VERIFY BEFORE SHIPPING" },
  },
  {
    id: "plaster-white",
    name: "White Plaster",
    category: "plaster",
    map: "/textures/wall/plaster_white.jpg",
    tileSize: { w: 2.5, h: 2.5 },
    roughness: 0.95,
    credit: { source: "3DSKY", license: "VERIFY BEFORE SHIPPING" },
  },

  // ── Add more here. CC0 sources that need no licence tracking:
  //    ambientCG.com, polyhaven.com/textures, texturecan.com
  // {
  //   id: "brick-red", name: "Red Brick", category: "brick",
  //   map: "/textures/wall/brick_red.jpg",
  //   normalMap: "/textures/wall/brick_red_normal.jpg",
  //   tileSize: { w: 2.0, h: 2.0 }, roughness: 0.9,
  //   credit: { source: "ambientCG", license: "CC0" },
  // },
];

export const surfaceById = (id: string): WallSurface | undefined =>
  WALL_SURFACES.find(s => s.id === id);

export const surfacesByCategory = (c: SurfaceCategory | "all"): WallSurface[] =>
  c === "all" ? WALL_SURFACES : WALL_SURFACES.filter(s => s.category === c);

/** categories that actually have entries — avoids empty filter chips */
export const activeSurfaceCategories = (): SurfaceCategory[] =>
  Array.from(new Set(WALL_SURFACES.map(s => s.category)));