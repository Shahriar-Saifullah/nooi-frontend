/**
 * Furniture catalog — manifest for the GLTF model library
 * --------------------------------------------------------
 * Each entry maps to a .glb file in /public/models/. All listed models come
 * from CC0 (public-domain) packs — see MODELS-README.md for exact download
 * sources and file naming. Models missing on disk fall back to a colored box
 * of `size`, so the app works even with a partial library.
 *
 * size = real-world footprint in cm {w: width(x), d: depth(z), h: height(y)}.
 * Models are auto-scaled to this size on load, so pack-to-pack unit
 * differences don't matter.
 */

export interface CatalogItem {
  id: string;
  name: string;
  category: FurnitureCategory;
  path: string;               // /models/<file>.glb
  size: { w: number; d: number; h: number }; // cm
  color: string;              // fallback box color + default tint base
  tags: string[];
  customizable: boolean;      // supports color/material overrides
}

export type FurnitureCategory =
  | "living" | "bedroom" | "dining" | "kitchen" | "bath" | "outdoor" | "decor";

export const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
  living: "Living Room",
  bedroom: "Bedroom",
  dining: "Dining",
  kitchen: "Kitchen",
  bath: "Bathroom",
  outdoor: "Outdoor",
  decor: "Decor",
};

export const FURNITURE_CATALOG: CatalogItem[] = [
  // ── Living room ────────────────────────────────────────────────────────────
  { id: "sofa-3seat",  name: "3-Seat Sofa",  category: "living",  path: "/models/sofa_3seat.glb",  size: { w: 220, d: 90,  h: 80 },  color: "#b09a7a", tags: ["couch", "sofa"], customizable: true },
  { id: "sofa-2seat",  name: "Loveseat",     category: "living",  path: "/models/sofa_2seat.glb",  size: { w: 160, d: 90,  h: 80 },  color: "#b09a7a", tags: ["couch", "sofa"], customizable: true },
  { id: "armchair",    name: "Armchair",      category: "living",  path: "/models/armchair.glb",    size: { w: 85,  d: 80,  h: 80 },  color: "#8f7a5f", tags: ["chair"], customizable: true },
  { id: "coffee-table",name: "Coffee Table",  category: "living",  path: "/models/coffee_table.glb",size: { w: 120, d: 60,  h: 45 },  color: "#7a5c3f", tags: ["table"], customizable: true },
  { id: "tv-stand",    name: "TV Stand",      category: "living",  path: "/models/tv_stand.glb",    size: { w: 180, d: 45,  h: 55 },  color: "#5c4634", tags: ["media", "console"], customizable: true },
  { id: "bookshelf",   name: "Bookshelf",     category: "living",  path: "/models/bookshelf.glb",   size: { w: 90,  d: 30,  h: 180 }, color: "#6e5741", tags: ["shelf", "storage"], customizable: true },
  { id: "floor-lamp",  name: "Floor Lamp",    category: "living",  path: "/models/floor_lamp.glb",  size: { w: 35,  d: 35,  h: 160 }, color: "#c8b98d", tags: ["light", "lamp"], customizable: true },
  { id: "rug",         name: "Area Rug",      category: "living",  path: "/models/rug.glb",         size: { w: 200, d: 140, h: 2 },   color: "#a9b3a4", tags: ["carpet"], customizable: true },

  // ── Bedroom ────────────────────────────────────────────────────────────────
  { id: "bed-king",    name: "King Bed",      category: "bedroom", path: "/models/bed_king.glb",    size: { w: 200, d: 220, h: 100 }, color: "#9fb1b8", tags: ["bed"], customizable: true },
  { id: "bed-queen",   name: "Queen Bed",     category: "bedroom", path: "/models/bed_queen.glb",   size: { w: 160, d: 200, h: 100 }, color: "#9fb1b8", tags: ["bed"], customizable: true },
  { id: "bed-single",  name: "Single Bed",    category: "bedroom", path: "/models/bed_single.glb",  size: { w: 100, d: 200, h: 90 },  color: "#9fb1b8", tags: ["bed"], customizable: true },
  { id: "nightstand",  name: "Nightstand",    category: "bedroom", path: "/models/nightstand.glb",  size: { w: 55,  d: 45,  h: 55 },  color: "#7a5c3f", tags: ["table"], customizable: true },
  { id: "wardrobe",    name: "Wardrobe",      category: "bedroom", path: "/models/wardrobe.glb",    size: { w: 200, d: 60,  h: 210 }, color: "#6e5741", tags: ["closet", "storage"], customizable: true },
  { id: "dresser",     name: "Dresser",       category: "bedroom", path: "/models/dresser.glb",     size: { w: 140, d: 50,  h: 90 },  color: "#6e5741", tags: ["drawers", "storage"], customizable: true },

  // ── Dining ─────────────────────────────────────────────────────────────────
  { id: "dining-table-6", name: "Dining Table (6)", category: "dining", path: "/models/dining_table.glb", size: { w: 180, d: 95, h: 76 }, color: "#7a5c3f", tags: ["table"], customizable: true },
  { id: "dining-chair",   name: "Dining Chair",     category: "dining", path: "/models/dining_chair.glb", size: { w: 48,  d: 52, h: 92 }, color: "#8f7a5f", tags: ["chair"], customizable: true },
  { id: "sideboard",      name: "Sideboard",        category: "dining", path: "/models/sideboard.glb",    size: { w: 160, d: 45, h: 85 }, color: "#6e5741", tags: ["storage"], customizable: true },

  // ── Kitchen ────────────────────────────────────────────────────────────────
  { id: "kitchen-island", name: "Kitchen Island", category: "kitchen", path: "/models/kitchen_island.glb", size: { w: 180, d: 90, h: 92 },  color: "#9c9c94", tags: ["counter"], customizable: true },
  { id: "bar-stool",      name: "Bar Stool",      category: "kitchen", path: "/models/bar_stool.glb",      size: { w: 40,  d: 40, h: 100 }, color: "#5c4634", tags: ["stool", "chair"], customizable: true },
  { id: "fridge",         name: "Refrigerator",   category: "kitchen", path: "/models/fridge.glb",         size: { w: 90,  d: 75, h: 180 }, color: "#c7ccd1", tags: ["appliance"], customizable: false },

  // ── Bathroom ───────────────────────────────────────────────────────────────
  { id: "bathtub", name: "Bathtub", category: "bath", path: "/models/bathtub.glb", size: { w: 170, d: 80, h: 60 }, color: "#e8eef0", tags: ["tub"], customizable: false },
  { id: "sink",    name: "Sink",    category: "bath", path: "/models/sink.glb",    size: { w: 60,  d: 50, h: 85 }, color: "#e8eef0", tags: ["vanity"], customizable: false },
  { id: "toilet",  name: "Toilet",  category: "bath", path: "/models/toilet.glb",  size: { w: 40,  d: 65, h: 78 }, color: "#e8eef0", tags: [], customizable: false },

  // ── Outdoor ────────────────────────────────────────────────────────────────
  { id: "outdoor-chair", name: "Patio Chair", category: "outdoor", path: "/models/outdoor_chair.glb", size: { w: 60,  d: 65,  h: 85 }, color: "#8a9a8c", tags: ["chair", "patio"], customizable: true },
  { id: "outdoor-table", name: "Patio Table", category: "outdoor", path: "/models/outdoor_table.glb", size: { w: 120, d: 120, h: 74 }, color: "#8a9a8c", tags: ["table", "patio"], customizable: true },

  // ── Decor ──────────────────────────────────────────────────────────────────
  { id: "plant-large", name: "Potted Plant", category: "decor", path: "/models/plant_large.glb", size: { w: 45, d: 45, h: 130 }, color: "#5f7d54", tags: ["plant"], customizable: false },
  { id: "side-table",  name: "Side Table",   category: "decor", path: "/models/side_table.glb",  size: { w: 50, d: 50, h: 55 },  color: "#7a5c3f", tags: ["table"], customizable: true },
];

export const catalogById = (id: string): CatalogItem | undefined =>
  FURNITURE_CATALOG.find(i => i.id === id);

/** Material presets for the customization inspector */
export const MATERIAL_PRESETS = [
  { id: "fabric", name: "Fabric", roughness: 0.95, metalness: 0.0 },
  { id: "wood",   name: "Wood",   roughness: 0.6,  metalness: 0.05 },
  { id: "leather",name: "Leather",roughness: 0.45, metalness: 0.0 },
  { id: "metal",  name: "Metal",  roughness: 0.25, metalness: 0.85 },
  { id: "matte",  name: "Matte",  roughness: 1.0,  metalness: 0.0 },
] as const;

export const COLOR_SWATCHES = [
  "#b09a7a", "#8f7a5f", "#5c4634", "#3f3a36",   // warm neutrals
  "#9fb1b8", "#5e7d8a", "#2f4550",               // blues
  "#8a9a8c", "#5f7d54",                          // greens
  "#b8846a", "#a35d4e",                          // terracotta
  "#d9d4cc", "#efece6", "#7d7a75",               // greys/whites
];