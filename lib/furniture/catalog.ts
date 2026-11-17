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
  | "structure" | "lighting" | "appliances";

export interface AssetCredit {
  source: string;                 // "CGTrader", "Poly Haven", "in-house"
  license: string;                // "Royalty Free", "CC0", ...
  url?: string;
  author?: string;
}

/** Pieces drawn in code instead of loaded from a .glb (components/decor). */
export type ProceduralKind =
  | "tv" | "art-abstract" | "art-lines" | "mirror-round" | "curtains" | "sconce"
  // appliances & electrical (round 2)
  | "split-ac" | "floor-ac" | "ceiling-fan" | "water-heater" | "socket" | "switch"
  // structure (phase 1)
  | "elevator"
  // soft furnishings (architectural details)
  | "drapes" | "sheers" | "rug" | "rug-round";

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
  /**
   * Drawn in code (components/decor/WallDecor.tsx); `path` is then empty and
   * `thumbnail` must be set, since there is no .glb to render a preview from.
   */
  procedural?: ProceduralKind;
  /** Wall mounts: height of the item's CENTRE above the floor, in cm, where a
   *  drop hangs it. Dragging can move it up or down from there. */
  mountHeight?: number;
  /** Set on items that are real marketplace listings (id "shop:<productId>"),
   *  registered at runtime by lib/furniture/shopCatalog.ts. */
  shop?: ShopInfo;
}

export interface ShopInfo {
  productId: string;
  vendor: string | null;
  /** per piece — or per metre of width when priceUnit is "metre" */
  price: number;
  priceUnit?: "unit" | "metre";
  minWidthCm?: number | null;
  maxWidthCm?: number | null;
  options?: import("@/lib/listings/configure").OptionGroup[];
  /** False when the listing has since been taken off sale — it still renders
   *  in rooms that already contain it, but can't be bought. */
  onSale: boolean;
  /** What "add to cart" buys (cheapest in-stock option), if any. */
  variantId?: string | null;
  inStock?: boolean;
  image?: string | null;
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
  lighting: "Lighting",
  appliances: "Appliances & Electrical",
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
      v("living", "armchair", { id: "ph-armchair-oak-leather", name: "Oak & Leather Armchair", path: "/models/ph/ph_modern_arm_chair_01.glb", thumbnail: "/models/thumbs/ph_modern_arm_chair_01.jpg", size: { w: 82, d: 99, h: 102 }, color: "#2b2b2b", tags: ["chair","armchair","leather","oak","modern"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/modern_arm_chair_01" } }),
      v("living", "armchair", { id: "ph-lounge-chair-midcentury", name: "Mid-Century Lounge Chair", path: "/models/ph/ph_mid_century_lounge_chair.glb", thumbnail: "/models/thumbs/ph_mid_century_lounge_chair.jpg", size: { w: 101, d: 119, h: 117 }, color: "#7a4a2c", tags: ["chair","lounge","leather","swivel","modern"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/mid_century_lounge_chair" } }),
    ],
  },
  {
    id: "coffee-table", name: "Coffee Table", category: "living",
    variants: [
      v("living", "coffee-table", { id: "coffee-table", name: "Rectangular", path: "/models/coffee_table.glb", size: { w: 120, d: 60, h: 45 }, color: "#7a5c3f", tags: ["table"], customizable: true }),
      v("living", "coffee-table", { id: "ph-coffee-stone-oak", name: "Stone & Oak Coffee Table", path: "/models/ph/ph_modern_coffee_table_01.glb", thumbnail: "/models/thumbs/ph_modern_coffee_table_01.jpg", size: { w: 60, d: 120, h: 39 }, color: "#b8b2a6", tags: ["table","coffee","stone","oak","modern"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/modern_coffee_table_01" } }),
      v("living", "coffee-table", { id: "ph-coffee-lattice", name: "Lattice Coffee Table", path: "/models/ph/ph_modern_coffee_table_02.glb", thumbnail: "/models/thumbs/ph_modern_coffee_table_02.jpg", size: { w: 120, d: 120, h: 37 }, color: "#3b3632", tags: ["table","coffee","square","modern"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/modern_coffee_table_02" } }),
      v("living", "coffee-table", { id: "ph-coffee-round-marble", name: "Round Marble Coffee Table", path: "/models/ph/ph_coffee_table_round_01.glb", thumbnail: "/models/thumbs/ph_coffee_table_round_01.jpg", size: { w: 130, d: 130, h: 49 }, color: "#e6e4e0", tags: ["table","coffee","round","marble"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/coffee_table_round_01" } }),
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
      v("living", "rug", { id: "rug-moroccan", name: "Moroccan Wool Rug", path: "", procedural: "rug", thumbnail: "/models/thumbs/proc_rug-moroccan.png", size: { w: 300, d: 200, h: 1.5 }, color: "#ece6da", tags: ["rug", "carpet", "moroccan", "wool", "cream"], customizable: false, credit: { source: "in-house", license: "Nooi original" } }),
      v("living", "rug", { id: "rug-abstract", name: "Abstract Grey Rug", path: "", procedural: "rug", thumbnail: "/models/thumbs/proc_rug-abstract.png", size: { w: 300, d: 200, h: 1.5 }, color: "#b8b4ae", tags: ["rug", "carpet", "abstract", "grey", "modern"], customizable: false, credit: { source: "in-house", license: "Nooi original" } }),
      v("living", "rug", { id: "rug-bordered", name: "Classic Bordered Rug", path: "", procedural: "rug", thumbnail: "/models/thumbs/proc_rug-bordered.png", size: { w: 300, d: 220, h: 1.5 }, color: "#b9a487", tags: ["rug", "carpet", "persian", "classic", "border"], customizable: false, credit: { source: "in-house", license: "Nooi original" } }),
      v("living", "rug", { id: "rug-jute-round", name: "Round Jute Rug", path: "", procedural: "rug-round", thumbnail: "/models/thumbs/proc_rug-jute-round.png", size: { w: 200, d: 200, h: 1.2 }, color: "#c5a170", tags: ["rug", "round", "jute", "natural"], customizable: false, credit: { source: "in-house", license: "Nooi original" } }),
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
      v("dining", "sideboard", { id: "ph-console-classic", name: "Carved Console Table", path: "/models/ph/ph_classicconsole_01.glb", thumbnail: "/models/thumbs/ph_classicconsole_01.jpg", size: { w: 154, d: 59, h: 95 }, color: "#2e2a28", tags: ["console","table","classic","carved"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/ClassicConsole_01" } }),
      v("dining", "sideboard", { id: "ph-cabinet-slatted", name: "Slatted Media Cabinet", path: "/models/ph/ph_modern_wooden_cabinet.glb", thumbnail: "/models/thumbs/ph_modern_wooden_cabinet.jpg", size: { w: 244, d: 52, h: 68 }, color: "#6a4a30", tags: ["cabinet","media","sideboard","modern","slatted"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/modern_wooden_cabinet" } }),
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
      v("kitchen", "bar-stool", { id: "ph-bar-stool-round", name: "Round Wooden Bar Stool", path: "/models/ph/ph_bar_chair_round_01.glb", thumbnail: "/models/thumbs/ph_bar_chair_round_01.jpg", size: { w: 48, d: 49, h: 75 }, color: "#5a3d2b", tags: ["stool","bar","wood"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/bar_chair_round_01" } }),
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
      v("decor", "plant", { id: "ph-plant-tree", name: "Tall Potted Plant", path: "/models/ph/ph_potted_plant_01.glb", thumbnail: "/models/thumbs/ph_potted_plant_01.jpg", size: { w: 59, d: 63, h: 135 }, color: "#5f7d54", tags: ["plant","tree","pot"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/potted_plant_01" } }),
      v("decor", "plant", { id: "ph-plant-leafy", name: "Leafy Potted Plant", path: "/models/ph/ph_potted_plant_02.glb", thumbnail: "/models/thumbs/ph_potted_plant_02.jpg", size: { w: 70, d: 66, h: 84 }, color: "#5f7d54", tags: ["plant","pot"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/potted_plant_02" } }),
      v("decor", "plant", { id: "ph-plant-succulent", name: "Small Succulent", path: "/models/ph/ph_potted_plant_04.glb", thumbnail: "/models/thumbs/ph_potted_plant_04.jpg", size: { w: 17, d: 18, h: 27 }, color: "#5f7d54", tags: ["plant","succulent","small"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/potted_plant_04" } }),
    ],
  },
  {
    id: "side-table", name: "Side Table", category: "decor",
    variants: [
      v("decor", "side-table", { id: "side-table", name: "Accent Table", path: "/models/side_table.glb", size: { w: 50, d: 50, h: 55 }, color: "#7a5c3f", tags: ["table"], customizable: true }),
      v("decor", "side-table", { id: "ph-side-table-oak", name: "Oak Side Table", path: "/models/ph/ph_side_table_01.glb", thumbnail: "/models/thumbs/ph_side_table_01.jpg", size: { w: 55, d: 55, h: 45 }, color: "#b98b5c", tags: ["table","side","oak"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/side_table_01" } }),
      v("decor", "side-table", { id: "ph-side-table-tall", name: "Tall Plant Stand", path: "/models/ph/ph_side_table_tall_01.glb", thumbnail: "/models/thumbs/ph_side_table_tall_01.jpg", size: { w: 38, d: 38, h: 76 }, color: "#4a2f22", tags: ["table","side","stand","classic"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/side_table_tall_01" } }),
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
      v("decor", "vase", { id: "ph-vase-blue-white", name: "Blue & White Vase", path: "/models/ph/ph_antique_ceramic_vase_01.glb", thumbnail: "/models/thumbs/ph_antique_ceramic_vase_01.jpg", size: { w: 26, d: 26, h: 44 }, color: "#e8e8ef", tags: ["vase","ceramic","decor"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/antique_ceramic_vase_01" } }),
      v("decor", "vase", { id: "ph-vase-brass-tall", name: "Tall Brass Vase", path: "/models/ph/ph_brass_vase_01.glb", thumbnail: "/models/thumbs/ph_brass_vase_01.jpg", size: { w: 23, d: 23, h: 69 }, color: "#c9a34f", tags: ["vase","brass","decor"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/brass_vase_01" } }),
      v("decor", "vase", { id: "ph-vase-brass-ewer", name: "Brass Ewer", path: "/models/ph/ph_brass_vase_02.glb", thumbnail: "/models/thumbs/ph_brass_vase_02.jpg", size: { w: 21, d: 21, h: 53 }, color: "#c08a4a", tags: ["vase","brass","jug","decor"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/brass_vase_02" } }),
      v("decor", "vase", { id: "ph-vase-white-01", name: "White Ceramic Vase", path: "/models/ph/ph_ceramic_vase_01.glb", thumbnail: "/models/thumbs/ph_ceramic_vase_01.jpg", size: { w: 20, d: 20, h: 40 }, color: "#efefec", tags: ["vase","ceramic","white","decor"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/ceramic_vase_01" } }),
      v("decor", "vase", { id: "ph-vase-white-02", name: "Round White Vase", path: "/models/ph/ph_ceramic_vase_02.glb", thumbnail: "/models/thumbs/ph_ceramic_vase_02.jpg", size: { w: 22, d: 22, h: 31 }, color: "#efefec", tags: ["vase","ceramic","white","decor"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/ceramic_vase_02" } }),
      v("decor", "vase", { id: "ph-vase-white-03", name: "Slim White Vase", path: "/models/ph/ph_ceramic_vase_03.glb", thumbnail: "/models/thumbs/ph_ceramic_vase_03.jpg", size: { w: 11, d: 11, h: 41 }, color: "#efefec", tags: ["vase","ceramic","white","decor"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/ceramic_vase_03" } }),
      v("decor", "vase", { id: "ph-vase-white-04", name: "White Jug Vase", path: "/models/ph/ph_ceramic_vase_04.glb", thumbnail: "/models/thumbs/ph_ceramic_vase_04.jpg", size: { w: 18, d: 18, h: 34 }, color: "#efefec", tags: ["vase","ceramic","white","jug","decor"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/ceramic_vase_04" } }),
    ],
  },
  {
    id: "book", name: "Book", category: "decor",
    variants: [
      v("decor", "book", { id: "book-hardback", name: "Hardback Book", path: "/models/decor/book.glb", size: { w: 18, d: 24, h: 4 }, color: "#8a9a8c", tags: ["book", "decor"], customizable: true, credit: { source: "3DSKY Vol005", license: "VERIFY BEFORE SHIPPING" } }),
      v("decor", "book", { id: "ph-books-encyclopedia", name: "Leather Book Set", path: "/models/ph/ph_book_encyclopedia_set_01.glb", thumbnail: "/models/thumbs/ph_book_encyclopedia_set_01.jpg", size: { w: 55, d: 16, h: 24 }, color: "#7a4a2c", tags: ["book","books","set","decor"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/book_encyclopedia_set_01" } }),
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
      v("decor", "picture-frame", { id: "ph-frame-standing", name: "Standing Photo Frame", path: "/models/ph/ph_standing_picture_frame_01.glb", thumbnail: "/models/thumbs/ph_standing_picture_frame_01.jpg", size: { w: 10, d: 20, h: 25 }, color: "#2b2b2b", tags: ["frame","photo","standing"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/standing_picture_frame_01" } }),
    ],
  },

  // ══ Wall-mounted ══════════════════════════════════════════════════════════
  // Drawn in code (components/decor/WallDecor.tsx), so no .glb and no licence
  // to track. Dropped onto a wall they hang flush at `mountHeight` (centre, cm)
  // and face into the room; dragged, they slide along walls and up or down.
  {
    id: "ottoman", name: "Ottoman", category: "living",
    variants: [
      v("living", "ottoman", { id: "ph-ottoman-leather", name: "Leather Ottoman", path: "/models/ph/ph_ottoman_01.glb", thumbnail: "/models/thumbs/ph_ottoman_01.jpg", size: { w: 88, d: 62, h: 62 }, color: "#3a3330", tags: ["ottoman","pouf","footstool","leather"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/Ottoman_01" } }),
    ],
  },
  {
    id: "accent", name: "Accents", category: "decor",
    variants: [
      v("decor", "accent", { id: "ph-candleholders-brass", name: "Brass Candleholders", path: "/models/ph/ph_brass_candleholders.glb", thumbnail: "/models/thumbs/ph_brass_candleholders.jpg", size: { w: 105, d: 36, h: 84 }, color: "#c9a34f", tags: ["candle","candleholder","brass","decor"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/brass_candleholders" } }),
      v("decor", "accent", { id: "ph-bust-marble", name: "Marble Bust", path: "/models/ph/ph_marble_bust_01.glb", thumbnail: "/models/thumbs/ph_marble_bust_01.jpg", size: { w: 27, d: 30, h: 51 }, color: "#e8e6e2", tags: ["bust","sculpture","marble","statue","decor"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/marble_bust_01" } }),
      v("decor", "accent", { id: "ph-bowl-wooden", name: "Carved Wooden Bowl", path: "/models/ph/ph_wooden_bowl_01.glb", thumbnail: "/models/thumbs/ph_wooden_bowl_01.jpg", size: { w: 31, d: 31, h: 9 }, color: "#8a5a3a", tags: ["bowl","wood","decor"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/wooden_bowl_01" } }),
      v("decor", "accent", { id: "ph-basket-wicker", name: "Wicker Basket", path: "/models/ph/ph_wicker_basket_02.glb", thumbnail: "/models/thumbs/ph_wicker_basket_02.jpg", size: { w: 35, d: 25, h: 20 }, color: "#b8955f", tags: ["basket","wicker","storage","decor"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/wicker_basket_02" } }),
      v("decor", "accent", { id: "ph-cushions-pair", name: "Pair of Cushions", path: "/models/ph/ph_throw_pillows_01.glb", thumbnail: "/models/thumbs/ph_throw_pillows_01.jpg", size: { w: 94, d: 45, h: 45 }, color: "#c0603a", tags: ["cushion","pillow","throw","decor"], customizable: true, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/throw_pillows_01" } }),
    ],
  },

  {
    id: "wall-tv", name: "Wall TV", category: "living",
    variants: [
      v("living", "wall-tv", { id: "tv-55", name: "55\" Wall TV", path: "", procedural: "tv", thumbnail: "/models/thumbs/proc_tv-55.png", size: { w: 123, d: 5, h: 72 }, mountHeight: 120, color: "#141518", tags: ["tv", "television", "screen", "media", "wall"], customizable: true, mountType: "wall", credit: { source: "in-house", license: "Nooi original" } }),
      v("living", "wall-tv", { id: "tv-75", name: "75\" Wall TV", path: "", procedural: "tv", thumbnail: "/models/thumbs/proc_tv-75.png", size: { w: 168, d: 6, h: 97 }, mountHeight: 125, color: "#141518", tags: ["tv", "television", "screen", "media", "wall", "large"], customizable: true, mountType: "wall", credit: { source: "in-house", license: "Nooi original" } }),
    ],
  },
  {
    id: "wall-art", name: "Wall Art", category: "decor",
    variants: [
      v("decor", "wall-art", { id: "art-abstract-lg", name: "Abstract Canvas", path: "", procedural: "art-abstract", thumbnail: "/models/thumbs/proc_art-abstract-lg.png", size: { w: 120, d: 4, h: 80 }, mountHeight: 155, color: "#c9a57a", tags: ["art", "painting", "canvas", "abstract", "wall"], customizable: true, mountType: "wall", credit: { source: "in-house", license: "Nooi original" } }),
      v("decor", "wall-art", { id: "art-lines", name: "Line Art Print", path: "", procedural: "art-lines", thumbnail: "/models/thumbs/proc_art-lines.png", size: { w: 60, d: 3, h: 90 }, mountHeight: 150, color: "#2b2622", tags: ["art", "print", "line art", "frame", "wall"], customizable: true, mountType: "wall", credit: { source: "in-house", license: "Nooi original" } }),
      v("decor", "wall-art", { id: "ph-art-frame-white", name: "Framed Print (Tall)", path: "/models/ph/ph_hanging_picture_frame_01.glb", thumbnail: "/models/thumbs/ph_hanging_picture_frame_01.jpg", size: { w: 59, d: 2, h: 84 }, color: "#2b2b2b", tags: ["art","frame","print","wall"], customizable: true, mountType: "wall", mountHeight: 150, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/hanging_picture_frame_01" } }),
      v("decor", "wall-art", { id: "ph-art-frame-landscape", name: "Framed Photo (Landscape)", path: "/models/ph/ph_hanging_picture_frame_02.glb", thumbnail: "/models/thumbs/ph_hanging_picture_frame_02.jpg", size: { w: 75, d: 3, h: 50 }, color: "#f2f2f2", tags: ["art","frame","photo","wall"], customizable: true, mountType: "wall", mountHeight: 150, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/hanging_picture_frame_02" } }),
      v("decor", "wall-art", { id: "ph-art-frame-oval", name: "Oval Carved Frame", path: "/models/ph/ph_hanging_picture_frame_03.glb", thumbnail: "/models/thumbs/ph_hanging_picture_frame_03.jpg", size: { w: 39, d: 3, h: 50 }, color: "#7a2e1e", tags: ["art","frame","classic","wall"], customizable: true, mountType: "wall", mountHeight: 150, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/hanging_picture_frame_03" } }),
    ],
  },
  {
    id: "mirror", name: "Mirror", category: "decor",
    variants: [
      v("decor", "mirror", { id: "mirror-round", name: "Round Brass Mirror", path: "", procedural: "mirror-round", thumbnail: "/models/thumbs/proc_mirror-round.png", size: { w: 80, d: 4, h: 80 }, mountHeight: 155, color: "#b8955a", tags: ["mirror", "round", "brass", "wall"], customizable: true, mountType: "wall", credit: { source: "in-house", license: "Nooi original" } }),
      v("decor", "mirror", { id: "ph-mirror-arched-gold", name: "Arched Gold Mirror", path: "/models/ph/ph_ornate_mirror_01.glb", thumbnail: "/models/thumbs/ph_ornate_mirror_01.jpg", size: { w: 49, d: 3, h: 74 }, color: "#c9a34f", tags: ["mirror","gold","arched","wall"], customizable: true, mountType: "wall", mountHeight: 150, credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/ornate_mirror_01" } }),
    ],
  },
  {
    id: "curtains", name: "Curtains", category: "decor",
    variants: [
      v("decor", "curtains", { id: "curtains-linen", name: "Linen Curtains", path: "", procedural: "curtains", thumbnail: "/models/thumbs/proc_curtains-linen.png", size: { w: 260, d: 12, h: 265 }, mountHeight: 142, color: "#e8e1d4", tags: ["curtains", "drapes", "window", "linen", "wall"], customizable: true, mountType: "wall", credit: { source: "in-house", license: "Nooi original" } }),
      v("decor", "curtains", { id: "curtains-linen-sheer", name: "Linen Drapes + Sheer (floor to ceiling)", path: "", procedural: "drapes", thumbnail: "/models/thumbs/proc_curtains-linen-sheer.png", size: { w: 300, d: 16, h: 270 }, fitToWallHeight: true, color: "#d9cfc0", tags: ["curtains", "drapes", "sheer", "window", "linen", "ceiling track"], customizable: true, mountType: "wall", credit: { source: "in-house", license: "Nooi original" } }),
      v("decor", "curtains", { id: "curtains-velvet-sheer", name: "Velvet Drapes + Sheer (floor to ceiling)", path: "", procedural: "drapes", thumbnail: "/models/thumbs/proc_curtains-velvet-sheer.png", size: { w: 300, d: 18, h: 270 }, fitToWallHeight: true, color: "#7d6a58", tags: ["curtains", "drapes", "velvet", "sheer", "window", "luxury"], customizable: true, mountType: "wall", credit: { source: "in-house", license: "Nooi original" } }),
      v("decor", "curtains", { id: "curtains-sheer", name: "Sheer Curtain (floor to ceiling)", path: "", procedural: "sheers", thumbnail: "/models/thumbs/proc_curtains-sheer.png", size: { w: 300, d: 8, h: 270 }, fitToWallHeight: true, color: "#f5f2ec", tags: ["curtains", "sheer", "voile", "window"], customizable: true, mountType: "wall", credit: { source: "in-house", license: "Nooi original" } }),
    ],
  },
  {
    id: "wall-light", name: "Wall Light", category: "lighting",
    variants: [
      v("lighting", "wall-light", { id: "sconce-brass", name: "Brass Wall Sconce", path: "", procedural: "sconce", thumbnail: "/models/thumbs/proc_sconce-brass.png", size: { w: 18, d: 22, h: 28 }, mountHeight: 185, color: "#a88a5a", tags: ["light", "lamp", "sconce", "wall light", "brass"], customizable: true, mountType: "wall", credit: { source: "in-house", license: "Nooi original" } }),
    ],
  },

  // ══ Appliances & electrical ═══════════════════════════════════════════════
  // Drawn in code (components/decor/WallDecor.tsx), like the TV. Sizes are
  // typical Saudi-market units; sockets and switches are BS 1363 (Type G).
  {
    id: "air-conditioner", name: "Air Conditioner", category: "appliances",
    variants: [
      v("appliances", "air-conditioner", { id: "ac-split-18k", name: "Split AC (18,000 BTU)", path: "", procedural: "split-ac", thumbnail: "/models/thumbs/proc_ac-split-18k.png", size: { w: 100, d: 23, h: 32 }, mountHeight: 225, color: "#f4f5f4", tags: ["ac", "air conditioner", "split", "cooling", "hvac", "wall"], customizable: true, mountType: "wall", credit: { source: "in-house", license: "Nooi original" } }),
      v("appliances", "air-conditioner", { id: "ac-split-24k", name: "Split AC (24,000 BTU)", path: "", procedural: "split-ac", thumbnail: "/models/thumbs/proc_ac-split-24k.png", size: { w: 112, d: 25, h: 34 }, mountHeight: 225, color: "#f4f5f4", tags: ["ac", "air conditioner", "split", "cooling", "hvac", "wall", "large"], customizable: true, mountType: "wall", credit: { source: "in-house", license: "Nooi original" } }),
      v("appliances", "air-conditioner", { id: "ac-floor-48k", name: "Floor-standing AC (48,000 BTU)", path: "", procedural: "floor-ac", thumbnail: "/models/thumbs/proc_ac-floor-48k.png", size: { w: 58, d: 38, h: 185 }, color: "#f4f5f4", tags: ["ac", "air conditioner", "floor", "cabinet", "cooling", "hvac"], customizable: true, mountType: "floor", credit: { source: "in-house", license: "Nooi original" } }),
    ],
  },
  {
    id: "ceiling-fan", name: "Ceiling Fan", category: "appliances",
    variants: [
      v("appliances", "ceiling-fan", { id: "fan-ceiling-52", name: "Ceiling Fan (132 cm)", path: "", procedural: "ceiling-fan", thumbnail: "/models/thumbs/proc_fan-ceiling-52.png", size: { w: 132, d: 132, h: 42 }, color: "#f2efe9", tags: ["fan", "ceiling fan", "cooling"], customizable: true, mountType: "ceiling", credit: { source: "in-house", license: "Nooi original" } }),
    ],
  },
  {
    id: "water-heater", name: "Water Heater", category: "appliances",
    variants: [
      v("appliances", "water-heater", { id: "water-heater-50l", name: "Water Heater (50 L)", path: "", procedural: "water-heater", thumbnail: "/models/thumbs/proc_water-heater-50l.png", size: { w: 42, d: 44, h: 72 }, mountHeight: 185, color: "#f7f7f5", tags: ["water heater", "geyser", "boiler", "bathroom", "wall"], customizable: true, mountType: "wall", credit: { source: "in-house", license: "Nooi original" } }),
      v("appliances", "water-heater", { id: "water-heater-80l", name: "Water Heater (80 L)", path: "", procedural: "water-heater", thumbnail: "/models/thumbs/proc_water-heater-80l.png", size: { w: 46, d: 48, h: 95 }, mountHeight: 180, color: "#f7f7f5", tags: ["water heater", "geyser", "boiler", "bathroom", "wall", "large"], customizable: true, mountType: "wall", credit: { source: "in-house", license: "Nooi original" } }),
    ],
  },
  {
    id: "socket", name: "Socket", category: "appliances",
    variants: [
      v("appliances", "socket", { id: "socket-single", name: "Single Socket", path: "", procedural: "socket", thumbnail: "/models/thumbs/proc_socket-single.png", size: { w: 8.6, d: 1.2, h: 8.6 }, mountHeight: 30, color: "#f6f6f4", tags: ["socket", "outlet", "plug", "power", "electrical", "wall"], customizable: true, mountType: "wall", credit: { source: "in-house", license: "Nooi original" } }),
      v("appliances", "socket", { id: "socket-double", name: "Double Socket", path: "", procedural: "socket", thumbnail: "/models/thumbs/proc_socket-double.png", size: { w: 14.6, d: 1.2, h: 8.6 }, mountHeight: 30, color: "#f6f6f4", tags: ["socket", "outlet", "plug", "power", "electrical", "wall", "double"], customizable: true, mountType: "wall", credit: { source: "in-house", license: "Nooi original" } }),
      v("appliances", "socket", { id: "socket-counter", name: "Counter Socket", path: "", procedural: "socket", thumbnail: "/models/thumbs/proc_socket-counter.png", size: { w: 14.6, d: 1.2, h: 8.6 }, mountHeight: 110, color: "#f6f6f4", tags: ["socket", "outlet", "kitchen", "counter", "electrical", "wall"], customizable: true, mountType: "wall", credit: { source: "in-house", license: "Nooi original" } }),
    ],
  },
  {
    id: "switch", name: "Light Switch", category: "appliances",
    variants: [
      v("appliances", "switch", { id: "switch-1gang", name: "1-Gang Switch", path: "", procedural: "switch", thumbnail: "/models/thumbs/proc_switch-1gang.png", size: { w: 8.6, d: 1.2, h: 8.6 }, mountHeight: 120, color: "#f6f6f4", tags: ["switch", "light switch", "electrical", "wall"], customizable: true, mountType: "wall", credit: { source: "in-house", license: "Nooi original" } }),
      v("appliances", "switch", { id: "switch-3gang", name: "3-Gang Switch", path: "", procedural: "switch", thumbnail: "/models/thumbs/proc_switch-3gang.png", size: { w: 14.6, d: 1.2, h: 8.6 }, mountHeight: 120, color: "#f6f6f4", tags: ["switch", "light switch", "electrical", "wall", "3 gang"], customizable: true, mountType: "wall", credit: { source: "in-house", license: "Nooi original" } }),
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
  {
    // Lift cores, drawn in code (components/decor/WallDecor.tsx). Floor to
    // ceiling, whatever the room's height; the doors face +z (into the room).
    id: "elevator", name: "Elevator", category: "structure",
    variants: [
      v("structure", "elevator", { id: "lift-home", name: "Home Lift (3 persons)", path: "", procedural: "elevator", thumbnail: "/models/thumbs/proc_lift-home.png", size: { w: 120, d: 130, h: 280 }, color: "#d9dcdc", tags: ["elevator", "lift", "home lift", "villa", "floors"], customizable: true, mountType: "floor", fitToWallHeight: true, credit: { source: "in-house", license: "Nooi original" } }),
      v("structure", "elevator", { id: "lift-passenger", name: "Passenger Lift (8 persons)", path: "", procedural: "elevator", thumbnail: "/models/thumbs/proc_lift-passenger.png", size: { w: 180, d: 190, h: 280 }, color: "#d9dcdc", tags: ["elevator", "lift", "passenger", "building", "apartment", "floors"], customizable: true, mountType: "floor", fitToWallHeight: true, credit: { source: "in-house", license: "Nooi original" } }),
    ],
  },

  // ══ Lighting ══════════════════════════════════════════════════════════════
  // Ceiling-mount fixtures. mountType "ceiling" anchors the model's top to
  // the room's ceiling (its own height, default 2.8 m). Drop placement uses the ceiling raycast plane; enable
  // "Inside" mode so the ceiling is visible before placing.
  {
    id: "chandelier", name: "Chandelier", category: "lighting",
    variants: [
      v("lighting", "chandelier", {
        id: "chandelier-wooden-pendant",
        name: "Wooden Pendant",
        path: "/models/lighting/Wooden Lighting Pendant.glb",
        thumbnail: "/models/thumbs/Wooden Lighting Pendant.webp",
        size: { w: 50, d: 50, h: 85 },
        color: "#8B6914",
        tags: ["light", "chandelier", "ceiling", "pendant", "wooden", "lamp"],
        customizable: true,
        mountType: "ceiling",
      }),
      v("lighting", "chandelier", { id: "ph-chandelier-shades", name: "Brass Chandelier with Shades", path: "/models/ph/ph_chandelier_01.glb", thumbnail: "/models/thumbs/ph_chandelier_01.jpg", size: { w: 75, d: 82, h: 80 }, color: "#c9a34f", tags: ["light","chandelier","ceiling","brass","classic"], customizable: true, mountType: "ceiling", credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/Chandelier_01" } }),
      v("lighting", "chandelier", { id: "ph-chandelier-crystal", name: "Crystal Chandelier", path: "/models/ph/ph_chandelier_03.glb", thumbnail: "/models/thumbs/ph_chandelier_03.jpg", size: { w: 78, d: 79, h: 104 }, color: "#c9a34f", tags: ["light","chandelier","ceiling","crystal","classic"], customizable: true, mountType: "ceiling", credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/Chandelier_03" } }),
      v("lighting", "chandelier", { id: "ph-pendant-globe", name: "Glass Globe Pendant", path: "/models/ph/ph_modern_ceiling_lamp_01.glb", thumbnail: "/models/thumbs/ph_modern_ceiling_lamp_01.jpg", size: { w: 43, d: 43, h: 95 }, color: "#e6e6e6", tags: ["light","pendant","ceiling","globe","modern","lamp"], customizable: true, mountType: "ceiling", credit: { source: "Poly Haven", license: "CC0", url: "https://polyhaven.com/a/modern_ceiling_lamp_01" } }),
    ],
  },
];

// ── Derived flat views ────────────────────────────────────────────────────────
// Everything outside the library browser consumes these, so adding a variant
// automatically makes it placeable, AI-furnishable and exportable.

export const FURNITURE_CATALOG: CatalogItem[] =
  FURNITURE_TYPES.flatMap(t => t.variants);

// ── Shop items (vendor listings with a 3D model) ─────────────────────────────
// Not part of the static library: they're fetched from the marketplace and
// registered here, so everything that resolves a placed item through
// catalogById — rendering, sizing, snapping, the furniture list — handles a
// vendor's product exactly like a library piece.

export const SHOP_ID_PREFIX = "shop:";
export const isShopId = (id: string | null | undefined): id is string =>
  typeof id === "string" && id.startsWith(SHOP_ID_PREFIX);

const SHOP_ITEMS = new Map<string, CatalogItem>();
let shopVersion = 0;
const shopListeners = new Set<() => void>();

export function registerShopItems(items: CatalogItem[]) {
  if (!items.length) return;
  for (const item of items) SHOP_ITEMS.set(item.id, item);
  shopVersion += 1;
  shopListeners.forEach(l => l());
}
export const hasShopItem = (id: string) => SHOP_ITEMS.has(id);
export const subscribeShopItems = (l: () => void) => {
  shopListeners.add(l);
  return () => { shopListeners.delete(l); };
};
export const getShopVersion = () => shopVersion;

export const catalogById = (id: string): CatalogItem | undefined =>
  FURNITURE_CATALOG.find(i => i.id === id) ?? (isShopId(id) ? SHOP_ITEMS.get(id) : undefined);

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