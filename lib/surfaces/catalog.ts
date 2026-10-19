/**
 * Surface library — tileable materials applied to a wall face or a floor
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
 * either matchsticks or tree trunks. It matters even more on a floor —
 * everyone knows how wide a floorboard is, so the wrong scale reads as fake
 * instantly.
 */

export type SurfaceCategory = "wood" | "plaster" | "stone" | "tile" | "brick" | "fabric";

export interface WallSurface {
  id: string;                 // STABLE — saved per wall face, never rename
  name: string;
  category: SurfaceCategory;
  /**
   * Where this surface may be applied.
   *
   * A slatted wall panel laid flat reads wrong, and plaster underfoot reads
   * wronger; porcelain tile is genuinely both. Absent means wall-only, so
   * every existing entry keeps the behaviour it had.
   */
  usage?: ("wall" | "floor")[];
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
    // Wall only: slats laid flat look like a boardwalk, not a floor.
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

  // ── Amygres Venice Gloss porcelain tile (real product line) ─────────────
  // The manufacturer's own size is in the filename: 600 x 1200 mm. Using that
  // as tileSize means the tiles render at true scale on any wall — a 3 m wall
  // shows exactly 5 tiles across, like the real product would.
  //
  // 600 x 1200 is also a standard FLOOR tile size, and this is a floor-rated
  // porcelain product, so these three are the library's only floor finishes
  // until a wood option is added.
  {
    id: "tile-venice-beige",
    name: "Venice Beige",
    category: "tile",
    usage: ["wall", "floor"],
    map: "/textures/wall/tile_venice_beige.jpg",
    tileSize: { w: 0.6, h: 1.2 },
    roughness: 0.15,          // gloss finish
    credit: { source: "Amygres (via client)", license: "VERIFY BEFORE SHIPPING" },
  },
  {
    id: "tile-venice-grey",
    name: "Venice Grey",
    category: "tile",
    usage: ["wall", "floor"],
    map: "/textures/wall/tile_venice_grey.jpg",
    tileSize: { w: 0.6, h: 1.2 },
    roughness: 0.15,
    credit: { source: "Amygres (via client)", license: "VERIFY BEFORE SHIPPING" },
  },
  {
    id: "tile-venice-black",
    name: "Venice Black",
    category: "tile",
    usage: ["wall", "floor"],
    map: "/textures/wall/tile_venice_black.jpg",
    tileSize: { w: 0.6, h: 1.2 },
    roughness: 0.15,
    credit: { source: "Amygres (via client)", license: "VERIFY BEFORE SHIPPING" },
  },

  // ── WOOD FLOORING — the gap worth filling first ─────────────────────────
  // Every reference interior a client points at has a wood floor, and the
  // library has none: wood-panel-40 above is a slatted WALL panel.
  //
  // ambientCG is CC0, so nothing to track. Search "WoodFloor", take the Color
  // and Normal maps at 2K, drop them in /public/textures/wall/, then
  // uncomment. A plank is roughly 19cm wide, so a tile showing about ten
  // planks is ~1.9 m across — get this right or it reads as fake on sight.
  // {
  //   id: "wood-oak-plank",
  //   name: "Oak Plank",
  //   category: "wood",
  //   usage: ["wall", "floor"],
  //   map: "/textures/wall/wood_oak_plank.jpg",
  //   normalMap: "/textures/wall/wood_oak_plank_normal.jpg",
  //   tileSize: { w: 1.9, h: 1.9 },
  //   roughness: 0.55,
  //   credit: { source: "ambientCG", license: "CC0" },
  // },

  // ── Polished concrete (from the client's textures pack) ──────────────────
  // Uncomment once concrete_polished.jpg + _normal.jpg are in place.
  // {
  //   id: "concrete-polished",
  //   name: "Polished Concrete",
  //   category: "stone",
  //   usage: ["wall", "floor"],
  //   map: "/textures/wall/concrete_polished.jpg",
  //   normalMap: "/textures/wall/concrete_polished_normal.jpg",
  //   tileSize: { w: 2.0, h: 2.0 },
  //   roughness: 0.85,
  //   credit: { source: "client pack", license: "VERIFY BEFORE SHIPPING" },
  // },

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

/**
 * Surfaces that may be applied to a floor.
 *
 * Deliberately a filtered subset rather than the whole library: offering
 * plaster or wall slats underfoot produces a scene nobody would build, and a
 * picker full of wrong options is worse than a short one.
 */
export const floorSurfaces = (): WallSurface[] =>
  WALL_SURFACES.filter(s => s.usage?.includes("floor"));