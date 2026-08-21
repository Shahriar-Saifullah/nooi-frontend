/**
 * Furniture catalog — 3-level manifest for the GLTF model library
 * ----------------------------------------------------------------
 * Category → Type → Variant (design)
 *
 *   living  →  Sofa  →  [3-Seat Sofa, Loveseat, Boca Tommy, ...]
 *
 * IMPORTANT — backwards compatibility:
 * `FURNITURE_CATALOG` is DERIVED from the nested structure and keeps every
 * historical variant id unchanged. Saved projects reference variants by id
 * (`placedFurniture[].modelId`), so ids must never be renamed — add new
 * variants instead. Everything downstream (ThreeSceneV2, AI furnish,
 * thumbnails, packing list) keeps consuming the flat list unchanged.
 *
 * size = real-world footprint in cm {w: width(x), d: depth(z), h: height(y)}.
 * Models are auto-scaled to this size on load, so pack-to-pack unit
 * differences don't matter.
 *
 * `thumbnail` is optional but STRONGLY recommended for large real-world
 * models: without it the browser generates a preview by downloading and
 * rendering the .glb, which is slow for multi-MB assets.
 *
 * `credit` records the asset's licence. Fill it in for every third-party
 * model — it is the only record you will have when someone asks.
 */

export type FurnitureCategory =
  | "living" | "bedroom" | "dining" | "kitchen" | "bath" | "outdoor" | "decor"
  | "structure";

export interface AssetCredit {
  source: string;                 // "CGTrader", "Poly Haven", "in-house"
  license: string;                // "Royalty Free", "CC0", ...
  url?: string;
  author?: string;
}

/** One concrete design the user can drag into the scene. */
export interface CatalogItem {
  id: string;                     // STABLE — saved in projects, never rename
  typeId: string;                 // parent type, e.g. "sofa"
  name: string;                   // variant name, e.g. "Boca Tommy"
  category: FurnitureCategory;
  path: string;                   // /models/<file>.glb
  thumbnail?: string;             // /models/thumbs/<file>.webp (preferred)
  size: { w: number; d: number; h: number };  // cm
  color: string;                  // fallback box colour + default tint base
  tags: string[];
  customizable: boolean;          // supports colour/material overrides
  mountType?: "floor" | "ceiling" | "wall";
  /**
   * Architecture, not furniture: scale the model's HEIGHT to the room's wall
   * height instead of the catalog `size.h`. A staircase whose top step stops
   * short of the ceiling reads as broken, and every plan has a different
   * ceiling, so a fixed height is always wrong somewhere.
   * Width and depth still come from `size`.
   */
  fitToWallHeight?: boolean;
  credit?: AssetCredit;
}

/** A kind of furniture (Sofa, Bed, Dining Chair …) holding its designs. */
export interface FurnitureType {
  id: string;
  name: string;
  category: FurnitureCategory;
  variants: CatalogItem[];
}

export const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
  living: "Living Room",
  bedroom: "Bedroom",
  dining: "Dining",
  kitchen: "Kitchen",
  bath: "Bathroom",
  outdoor: "Outdoor",
  decor: "Decor",
  structure: "Structure",
};

// ── Helper: keeps the variant rows short and stops category/typeId drifting ──
const v = (
  category: FurnitureCategory,
  typeId: string,
  item: Omit<CatalogItem, "category" | "typeId">,
): CatalogItem => ({ ...item, category, typeId });

export const FURNITURE_TYPES: FurnitureType[] = [
  // ══ Living room ═══════════════════════════════════════════════════════════
  {
    id: "sofa", name: "Sofa", category: "living",
    variants: [
      v("living", "sofa", { id: "sofa-44", name: "Luxury Sofa 44", path: "/models/sofa44.glb", size: { w: 230, d: 95, h: 85 }, color: "#7a5c3f", tags: ["couch", "sofa", "luxury", "modern"], customizable: true }),
      v("living", "sofa", { id: "sofa-3seat", name: "3-Seat Sofa", path: "/models/sofa_3seat.glb", size: { w: 220, d: 90, h: 80 }, color: "#b09a7a", tags: ["couch", "sofa"], customizable: true }),
      v("living", "sofa", { id: "sofa-2seat", name: "Loveseat", path: "/models/sofa_2seat.glb", size: { w: 160, d: 90, h: 80 }, color: "#b09a7a", tags: ["couch", "sofa", "2 seat"], customizable: true }),
      // ── Example third-party asset. Convert the FBX to .glb first (see
      // scripts/convert-asset.sh) and drop the result in /public/models/sofa/.
      // Real dimensions from the asset's info.txt: 4435 x 1730 x 740 mm.
      // This is a large corner/sectional sofa — name it so users aren't
      // surprised when a 4.4 m piece lands in a small room.
      v("living", "sofa", {
        id: "sofa-boca-tommy", name: "Boca Tommy (Corner)",
        path: "/models/sofa/boca_tommy.glb",
        size: { w: 444, d: 173, h: 74 }, color: "#8d6e63",
        tags: ["couch", "sofa", "corner", "sectional", "modern", "velour"], customizable: true,
        credit: { source: "CGTrader", license: "VERIFY BEFORE SHIPPING", url: "https://www.cgtrader.com/free-3d-models/furniture/sofa/boca-tommy-sofa" },
      }),
    ],
  },
  {
    id: "armchair", name: "Armchair", category: "living",
    variants: [
      v("living", "armchair", { id: "armchair", name: "Classic Armchair", path: "/models/armchair.glb", size: { w: 85, d: 80, h: 80 }, color: "#8f7a5f", tags: ["chair"], customizable: true }),
    ],
  },
  {
    id: "coffee-table", name: "Coffee Table", category: "living",
    variants: [
      v("living", "coffee-table", { id: "coffee-table", name: "Rectangular", path: "/models/coffee_table.glb", size: { w: 120, d: 60, h: 45 }, color: "#7a5c3f", tags: ["table"], customizable: true }),
    ],
  },
  {
    id: "tv-stand", name: "TV Stand", category: "living",
    variants: [
      v("living", "tv-stand", { id: "tv-stand", name: "Media Console", path: "/models/tv_stand.glb", size: { w: 180, d: 45, h: 55 }, color: "#5c4634", tags: ["media", "console"], customizable: true }),
    ],
  },
  {
    id: "bookshelf", name: "Bookshelf", category: "living",
    variants: [
      v("living", "bookshelf", { id: "bookshelf", name: "Tall Shelf", path: "/models/bookshelf.glb", size: { w: 90, d: 30, h: 180 }, color: "#6e5741", tags: ["shelf", "storage"], customizable: true }),
    ],
  },
  {
    id: "floor-lamp", name: "Floor Lamp", category: "living",
    variants: [
      v("living", "floor-lamp", { id: "floor-lamp", name: "Standing Lamp", path: "/models/floor_lamp.glb", size: { w: 35, d: 35, h: 160 }, color: "#c8b98d", tags: ["light", "lamp"], customizable: true }),
    ],
  },
  {
    id: "rug", name: "Rug", category: "living",
    variants: [
      v("living", "rug", { id: "rug", name: "Area Rug", path: "/models/rug.glb", size: { w: 200, d: 140, h: 2 }, color: "#a9b3a4", tags: ["carpet"], customizable: true }),
    ],
  },

  // ══ Bedroom ═══════════════════════════════════════════════════════════════
  {
    id: "bed", name: "Bed", category: "bedroom",
    variants: [
      v("bedroom", "bed", { id: "bed-custom-real", name: "Luxury Bed", path: "/models/bed.glb", size: { w: 200, d: 220, h: 100 }, color: "#9fb1b8", tags: ["bed", "real", "custom", "luxury"], customizable: true }),
      v("bedroom", "bed", { id: "bed-king", name: "King Bed", path: "/models/bed_king.glb", size: { w: 200, d: 220, h: 100 }, color: "#9fb1b8", tags: ["bed"], customizable: true }),
      v("bedroom", "bed", { id: "bed-queen", name: "Queen Bed", path: "/models/bed_queen.glb", size: { w: 160, d: 200, h: 100 }, color: "#9fb1b8", tags: ["bed"], customizable: true }),
      v("bedroom", "bed", { id: "bed-single", name: "Single Bed", path: "/models/bed_single.glb", size: { w: 100, d: 200, h: 90 }, color: "#9fb1b8", tags: ["bed"], customizable: true }),
    ],
  },
  {
    id: "nightstand", name: "Nightstand", category: "bedroom",
    variants: [
      v("bedroom", "nightstand", { id: "nightstand", name: "Bedside Table", path: "/models/nightstand.glb", size: { w: 55, d: 45, h: 55 }, color: "#7a5c3f", tags: ["table"], customizable: true }),
    ],
  },
  {
    id: "wardrobe", name: "Wardrobe", category: "bedroom",
    variants: [
      v("bedroom", "wardrobe", { id: "wardrobe", name: "Double Wardrobe", path: "/models/wardrobe.glb", size: { w: 200, d: 60, h: 210 }, color: "#6e5741", tags: ["closet", "storage"], customizable: true }),
    ],
  },
  {
    id: "dresser", name: "Dresser", category: "bedroom",
    variants: [
      v("bedroom", "dresser", { id: "dresser", name: "Chest of Drawers", path: "/models/dresser.glb", size: { w: 140, d: 50, h: 90 }, color: "#6e5741", tags: ["drawers", "storage"], customizable: true }),
    ],
  },

  // ══ Dining ════════════════════════════════════════════════════════════════
  {
    id: "dining-table", name: "Dining Table", category: "dining",
    variants: [
      v("dining", "dining-table", { id: "dining-table-6", name: "Seats 6", path: "/models/dining_table.glb", size: { w: 180, d: 95, h: 76 }, color: "#7a5c3f", tags: ["table"], customizable: true }),
    ],
  },
  {
    id: "dining-chair", name: "Dining Chair", category: "dining",
    variants: [
      v("dining", "dining-chair", { id: "dining-chair", name: "Wooden Chair", path: "/models/dining_chair.glb", size: { w: 48, d: 52, h: 92 }, color: "#8f7a5f", tags: ["chair"], customizable: true }),
    ],
  },
  {
    id: "sideboard", name: "Sideboard", category: "dining",
    variants: [
      v("dining", "sideboard", { id: "sideboard", name: "Buffet Cabinet", path: "/models/sideboard.glb", size: { w: 160, d: 45, h: 85 }, color: "#6e5741", tags: ["storage"], customizable: true }),
    ],
  },

  // ══ Kitchen ═══════════════════════════════════════════════════════════════
  {
    id: "kitchen-island", name: "Kitchen Island", category: "kitchen",
    variants: [
      v("kitchen", "kitchen-island", { id: "kitchen-island", name: "Island Counter", path: "/models/kitchen_island.glb", size: { w: 180, d: 90, h: 92 }, color: "#9c9c94", tags: ["counter"], customizable: true }),
    ],
  },
  {
    id: "bar-stool", name: "Bar Stool", category: "kitchen",
    variants: [
      v("kitchen", "bar-stool", { id: "bar-stool", name: "Counter Stool", path: "/models/bar_stool.glb", size: { w: 40, d: 40, h: 100 }, color: "#5c4634", tags: ["stool", "chair"], customizable: true }),
    ],
  },
  {
    id: "fridge", name: "Refrigerator", category: "kitchen",
    variants: [
      v("kitchen", "fridge", { id: "fridge", name: "Standard Fridge", path: "/models/fridge.glb", size: { w: 90, d: 75, h: 180 }, color: "#c7ccd1", tags: ["appliance"], customizable: false }),
    ],
  },

  // ══ Bathroom ══════════════════════════════════════════════════════════════
  {
    id: "bathtub", name: "Bathtub", category: "bath",
    variants: [
      v("bath", "bathtub", { id: "bathtub", name: "Standard Tub", path: "/models/bathtub.glb", size: { w: 170, d: 80, h: 60 }, color: "#e8eef0", tags: ["tub"], customizable: false }),
    ],
  },
  {
    id: "sink", name: "Sink", category: "bath",
    variants: [
      v("bath", "sink", { id: "sink", name: "Vanity Sink", path: "/models/sink.glb", size: { w: 60, d: 50, h: 85 }, color: "#e8eef0", tags: ["vanity"], customizable: false }),
    ],
  },
  {
    id: "toilet", name: "Toilet", category: "bath",
    variants: [
      v("bath", "toilet", { id: "toilet", name: "Standard", path: "/models/toilet.glb", size: { w: 40, d: 65, h: 78 }, color: "#e8eef0", tags: [], customizable: false }),
    ],
  },

  // ══ Outdoor ═══════════════════════════════════════════════════════════════
  {
    id: "outdoor-chair", name: "Patio Chair", category: "outdoor",
    variants: [
      v("outdoor", "outdoor-chair", { id: "outdoor-chair", name: "Garden Chair", path: "/models/outdoor_chair.glb", size: { w: 60, d: 65, h: 85 }, color: "#8a9a8c", tags: ["chair", "patio"], customizable: true }),
    ],
  },
  {
    id: "outdoor-table", name: "Patio Table", category: "outdoor",
    variants: [
      v("outdoor", "outdoor-table", { id: "outdoor-table", name: "Round Table", path: "/models/outdoor_table.glb", size: { w: 120, d: 120, h: 74 }, color: "#8a9a8c", tags: ["table", "patio"], customizable: true }),
    ],
  },
  {
    id: "patio-set", name: "Patio Set", category: "outdoor",
    variants: [
      v("outdoor", "patio-set", { id: "patio-set-etsy", name: "Custom Patio Set", path: "/models/outdoor/patio_set.glb", size: { w: 760, d: 200, h: 89 }, color: "#8a9a8c", tags: ["patio", "outdoor", "lounge", "set", "sectional"], customizable: true, credit: { source: "Etsy (via client)", license: "VERIFY BEFORE SHIPPING" } }),
    ],
  },

  // ══ Decor ═════════════════════════════════════════════════════════════════
  {
    id: "plant", name: "Plant", category: "decor",
    variants: [
      v("decor", "plant", { id: "plant-large", name: "Potted Plant", path: "/models/plant_large.glb", size: { w: 45, d: 45, h: 130 }, color: "#5f7d54", tags: ["plant"], customizable: false }),
    ],
  },
  {
    id: "side-table", name: "Side Table", category: "decor",
    variants: [
      v("decor", "side-table", { id: "side-table", name: "Accent Table", path: "/models/side_table.glb", size: { w: 50, d: 50, h: 55 }, color: "#7a5c3f", tags: ["table"], customizable: true }),
    ],
  },

  // ── decorative set Vol005 (3DSKY) ────────────────────────────────────────
  // The source file's props are tabletop-vignette scale (a 20 cm bud vase),
  // which is invisible in a room view. Sizes below are real-world decor
  // proportions instead — models are auto-scaled to whatever is declared here.
  {
    id: "vase", name: "Vase", category: "decor",
    variants: [
      v("decor", "vase", { id: "vase-ceramic", name: "Ceramic Vase", path: "/models/decor/vase_ceramic.glb", size: { w: 18, d: 18, h: 45 }, color: "#d9d4cc", tags: ["vase", "ceramic", "decor"], customizable: true, credit: { source: "3DSKY Vol005", license: "VERIFY BEFORE SHIPPING" } }),
    ],
  },
  {
    id: "book", name: "Book", category: "decor",
    variants: [
      v("decor", "book", { id: "book-hardback", name: "Hardback Book", path: "/models/decor/book.glb", size: { w: 18, d: 24, h: 4 }, color: "#8a9a8c", tags: ["book", "decor"], customizable: true, credit: { source: "3DSKY Vol005", license: "VERIFY BEFORE SHIPPING" } }),
    ],
  },
  {
    id: "tray", name: "Tray", category: "decor",
    variants: [
      v("decor", "tray", { id: "tray-round", name: "Decorative Tray", path: "/models/decor/tray.glb", size: { w: 40, d: 38, h: 6 }, color: "#b09a7a", tags: ["tray", "bowl", "decor"], customizable: true, credit: { source: "3DSKY Vol005", license: "VERIFY BEFORE SHIPPING" } }),
    ],
  },
  {
    id: "wall-clock", name: "Wall Clock", category: "decor",
    variants: [
      v("decor", "wall-clock", { id: "clock-hands", name: "Clock Hands", path: "/models/decor/clock_hands.glb", size: { w: 30, d: 4, h: 30 }, color: "#2f2f2f", tags: ["clock", "wall", "decor"], customizable: true, credit: { source: "3DSKY Vol005", license: "VERIFY BEFORE SHIPPING" } }),
    ],
  },
  {
    id: "picture-frame", name: "Picture Frame", category: "decor",
    variants: [
      v("decor", "picture-frame", { id: "frame-small", name: "Small Frame", path: "/models/decor/frame_small.glb", size: { w: 13, d: 3, h: 18 }, color: "#3f3a36", tags: ["frame", "photo", "art"], customizable: true, credit: { source: "3DSKY Vol005", license: "VERIFY BEFORE SHIPPING" } }),
      v("decor", "picture-frame", { id: "frame-medium", name: "Medium Frame", path: "/models/decor/frame_medium.glb", size: { w: 18, d: 3, h: 24 }, color: "#3f3a36", tags: ["frame", "photo", "art"], customizable: true, credit: { source: "3DSKY Vol005", license: "VERIFY BEFORE SHIPPING" } }),
      v("decor", "picture-frame", { id: "frame-large", name: "Large Frame", path: "/models/decor/frame_large.glb", size: { w: 25, d: 4, h: 33 }, color: "#3f3a36", tags: ["frame", "photo", "art"], customizable: true, credit: { source: "3DSKY Vol005", license: "VERIFY BEFORE SHIPPING" } }),
      v("decor", "picture-frame", { id: "frame-curved", name: "Curved Frame", path: "/models/decor/frame_curved.glb", size: { w: 30, d: 8, h: 22 }, color: "#3f3a36", tags: ["frame", "curved", "art"], customizable: true, credit: { source: "3DSKY Vol005", license: "VERIFY BEFORE SHIPPING" } }),
    ],
  },

  // ══ Structure ═════════════════════════════════════════════════════════════
  // Architectural elements. fitToWallHeight makes these span floor to ceiling
  // whatever the plan's wall height is — a stair that stops short looks broken
  // no matter how good the model is. Footprints below are estimates: check
  // each model in the canvas and correct w/d if it sits wrong.
  {
    id: "staircase", name: "Staircase", category: "structure",
    variants: [
      v("structure", "staircase", {
        id: "stair-straight", name: "Straight Flight",
        path: "/models/structure/stair_straight.glb",
        size: { w: 100, d: 380, h: 280 },
        color: "#b09a7a", tags: ["stair", "staircase", "steps", "straight"],
        customizable: true, fitToWallHeight: true,
        credit: { source: "CGTrader — adelgz", license: "Free — VERIFY + CREDIT AUTHOR",
                  url: "https://www.cgtrader.com/items/3746586" },
      }),
      v("structure", "staircase", {
        id: "stair-open", name: "Open Riser",
        path: "/models/structure/stair_open.glb",
        size: { w: 100, d: 360, h: 280 },
        color: "#b09a7a", tags: ["stair", "staircase", "steps", "open", "modern"],
        customizable: true, fitToWallHeight: true,
        credit: { source: "CGTrader", license: "Free — VERIFY + CREDIT AUTHOR",
                  url: "https://www.cgtrader.com/items/2792442" },
      }),
      v("structure", "staircase", {
        id: "stair-switchback", name: "Switchback",
        path: "/models/structure/stair_switchback.glb",
        size: { w: 260, d: 300, h: 280 },
        color: "#b09a7a", tags: ["stair", "staircase", "steps", "u-shape", "half turn", "landing"],
        customizable: true, fitToWallHeight: true,
        credit: { source: "CGTrader — LiamCg", license: "Free — VERIFY + CREDIT AUTHOR",
                  url: "https://www.cgtrader.com/items/6198884" },
      }),
    ],
  },
];

// ── Derived flat views ────────────────────────────────────────────────────────
// Everything outside the library browser consumes these, so adding a variant
// automatically makes it placeable, AI-furnishable and exportable.

export const FURNITURE_CATALOG: CatalogItem[] =
  FURNITURE_TYPES.flatMap(t => t.variants);

export const catalogById = (id: string): CatalogItem | undefined =>
  FURNITURE_CATALOG.find(i => i.id === id);

export const typeById = (id: string): FurnitureType | undefined =>
  FURNITURE_TYPES.find(t => t.id === id);

export const typesByCategory = (c: FurnitureCategory | "all"): FurnitureType[] =>
  c === "all" ? FURNITURE_TYPES : FURNITURE_TYPES.filter(t => t.category === c);

/** Dev guard: duplicate ids would silently break saved projects. */
if (process.env.NODE_ENV !== "production") {
  const seen = new Set<string>();
  for (const item of FURNITURE_CATALOG) {
    if (seen.has(item.id)) {
      console.error(`[catalog] duplicate variant id "${item.id}" — saved projects will mis-resolve`);
    }
    seen.add(item.id);
  }
}

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