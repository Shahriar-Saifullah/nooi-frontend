/**
 * Furniture specification sheet — lib/export/furnitureSheet.ts
 * ============================================================================
 * Everything placed in a design, as a list a carpenter or workshop can build
 * (or a shopper can source) from: grouped by room, with real sizes, finish,
 * how it is mounted, and quantity. No prices — it is a build sheet, not an
 * order. This file only gathers the data; furnitureSheetPdf.ts draws it.
 *
 * Units: furniture positions are scene metres (plan centred on the origin);
 * furniture SIZES are real (the scene draws pieces at true size); the plan
 * itself is drawn `visualScale` times larger than life, so plan lengths and
 * areas are divided by it before they are shown.
 */

import {
  catalogById, typeById, CATEGORY_LABELS, MATERIAL_PRESETS, isShopId,
} from "@/lib/furniture/catalog";
import { colourName } from "./colourName";
import { materialKind, proceduralParts, styledParts, type FinishPart } from "./finishParts";

export { colourName };
export type { FinishPart };

export interface SheetFurniture {
  id: string;
  name: string;
  position: [number, number, number];
  rotation?: number;
  modelId?: string;
  sizeScale?: number;
  color?: string | null;
  materialPreset?: string | null;
  mountType?: "floor" | "ceiling" | "wall";
  width?: number; depth?: number; height?: number;
}

export interface SheetRoomInput {
  id: string;
  name: string;
  polygon?: [number, number][];                                 // % of the plan
  box?: { left: number; top: number; width: number; height: number };
}

export type Mount = "floor" | "wall" | "ceiling";

export interface SheetLine {
  /** item number, shared by the list and the plan page */
  no: number;
  /** every placed piece this line stands for (identical pieces merge) */
  pieces: { id: string; x: number; z: number; rotation: number }[];
  name: string;
  type: string;
  category: string;
  source: "Nooi library" | "Marketplace" | "Custom";
  vendor: string | null;
  sizeCm: { w: number; d: number; h: number };
  /** what it is made of and in which colours, main part first — the
   *  model's own materials, recoloured / re-materialled as the user styled it */
  parts: FinishPart[];
  /** the user changed its colour or material in the designer */
  customised: boolean;
  mount: Mount;
  /** wall pieces: height of the bottom edge above the floor */
  mountHeightCm: number | null;
  qty: number;
  /** pictures to try, best first (the library's own lookup order) */
  thumbnails: string[];
}

export interface SheetRoom { name: string; areaM2: number | null; lines: SheetLine[] }

export interface FurnitureSheet {
  rooms: SheetRoom[];
  totalPieces: number;
  totalLines: number;
  /** real plan size, metres */
  planSizeM: { w: number; d: number };
  /** sum of the room areas, real m² (null when the plan has no rooms) */
  totalAreaM2: number | null;
}

export interface SheetInput {
  furniture: SheetFurniture[];
  rooms: SheetRoomInput[];
  /** the plan in scene metres (roomDimensionsCm / 100) */
  totalW: number; totalD: number;
  visualScale?: number;
  /** each model's parts as read from its 3D file (modelFinish.ts), by model
   *  id; pieces without an entry fall back to the catalogue's colour */
  finishes?: Map<string, FinishPart[] | null>;
}

export const OTHER_AREA = "Other areas";

// ── geometry ────────────────────────────────────────────────────────────────

/** A room's outline in scene metres. */
export function roomPolygonScene(r: SheetRoomInput, totalW: number, totalD: number): [number, number][] | null {
  const px = (x: number) => (x / 100) * totalW - totalW / 2;
  const pz = (y: number) => (y / 100) * totalD - totalD / 2;
  if (r.polygon && r.polygon.length >= 3) return r.polygon.map(([x, y]) => [px(x), pz(y)]);
  if (r.box) {
    const { left, top, width, height } = r.box;
    return [[px(left), pz(top)], [px(left + width), pz(top)], [px(left + width), pz(top + height)], [px(left), pz(top + height)]];
  }
  return null;
}

export function polygonArea(poly: [number, number][]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  }
  return Math.abs(a / 2);
}

export function pointInPolygon(x: number, z: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** distance from a point to a polygon's outline */
function distToPolygon(x: number, z: number, poly: [number, number][]): number {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j], [bx, bz] = poly[i];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1e-9)));
    best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
  }
  return best;
}

// ── the sheet ───────────────────────────────────────────────────────────────

const round = (v: number) => Math.round(v);

/** Same order as the furniture library: an explicit thumbnail, then the
 *  pre-rendered studio shots named after the model (.jpg photoreal, .webp
 *  flat), then a marketplace product's photo. */
function thumbnailsFor(cat: ReturnType<typeof catalogById>): string[] {
  if (!cat) return [];
  const out: string[] = [];
  if (cat.thumbnail) out.push(cat.thumbnail);
  const base = cat.path && !/^https?:/i.test(cat.path)
    ? cat.path.split("/").pop()?.replace(/\.glb$/i, "") : null;
  if (base) out.push(`/models/thumbs/${base}.jpg`, `/models/thumbs/${base}.webp`);
  if (cat.shop?.image) out.push(cat.shop.image);
  return [...new Set(out)];
}

/** The piece's own finish when its model couldn't be read. */
function fallbackParts(cat: ReturnType<typeof catalogById>, f: SheetFurniture): FinishPart[] {
  // drawn-in-code pieces know their colour; for a model we couldn't read,
  // the catalogue's colour is only a placeholder, so don't claim it
  if (cat?.procedural) return proceduralParts(cat.procedural, cat.color ?? "#808080");
  const hex = cat ? "" : f.color ?? "";
  const guess = cat ? materialKind({
    name: [cat.name, cat.typeId, ...(cat.tags ?? [])].join(" "),
    metalness: 0, roughness: 0.5, opacity: 1, transmission: 0, textured: false, hex,
  }) : null;
  // the look-based names ("Satin finish") are only a guess without the model
  const named = guess && !/finish$/.test(guess) ? guess : "Not specified";
  return [{ material: named, colour: { hex, name: hex ? colourName(hex) : "As in the picture" }, share: 1 }];
}

function describe(f: SheetFurniture, finishes?: Map<string, FinishPart[] | null>) {
  const cat = f.modelId ? catalogById(f.modelId) : undefined;
  const s = f.sizeScale ?? 1;
  // same size rule as the 3D scene (ThreeSceneV2 itemSizeM)
  const sizeCm = {
    w: round((f.width ?? cat?.size.w ?? 60) * s),
    d: round((f.depth ?? cat?.size.d ?? 5) * s),
    h: round((f.height ?? cat?.size.h ?? 60) * s),
  };
  const mount: Mount = f.mountType ?? cat?.mountType ?? "floor";
  const shop = f.modelId ? isShopId(f.modelId) : false;
  const material = f.materialPreset
    ? MATERIAL_PRESETS.find(m => m.id === f.materialPreset)?.name ?? null
    : null;
  return {
    name: cat?.name ?? f.name ?? "Furniture",
    type: (cat ? typeById(cat.typeId)?.name : undefined) ?? (shop ? "Marketplace product" : f.name ?? "Furniture"),
    category: cat ? CATEGORY_LABELS[cat.category] : "Furniture",
    source: (shop ? "Marketplace" : cat ? "Nooi library" : "Custom") as SheetLine["source"],
    vendor: cat?.shop?.vendor ?? null,
    sizeCm,
    parts: styledParts(
      (f.modelId ? finishes?.get(f.modelId) : null) ?? fallbackParts(cat, f),
      f.color, material),
    customised: !!(f.color || material),
    mount,
    mountHeightCm: mount === "wall" ? round(f.position[1] * 100) : null,
    thumbnails: thumbnailsFor(cat),
  };
}

export function buildFurnitureSheet(input: SheetInput): FurnitureSheet {
  const { furniture, rooms, totalW, totalD } = input;
  const vs = input.visualScale && input.visualScale > 0 ? input.visualScale : 1;

  const polys = rooms
    .map(r => ({ room: r, poly: roomPolygonScene(r, totalW, totalD) }))
    .filter((r): r is { room: SheetRoomInput; poly: [number, number][] } => !!r.poly)
    .map(r => ({ ...r, area: polygonArea(r.poly) }));

  /** the room a point is in — the smallest that contains it; a point just
   *  outside every room (a wardrobe pushed into a wall) goes to the nearest
   *  one within 30 cm */
  const roomOf = (x: number, z: number): number => {
    let idx = -1, area = Infinity;
    polys.forEach((p, i) => {
      if (pointInPolygon(x, z, p.poly) && p.area < area) { idx = i; area = p.area; }
    });
    if (idx >= 0) return idx;
    let near = Infinity;
    polys.forEach((p, i) => {
      const d = distToPolygon(x, z, p.poly);
      if (d < 0.3 && d < near) { near = d; idx = i; }
    });
    return idx;
  };

  // group: room → merge key → line
  const groups = new Map<number, Map<string, Omit<SheetLine, "no">>>();
  for (const f of furniture) {
    const ri = roomOf(f.position[0], f.position[2]);
    const d = describe(f, input.finishes);
    const key = [f.modelId ?? `custom:${d.name}`, d.sizeCm.w, d.sizeCm.d, d.sizeCm.h,
      d.parts.map(p => `${p.material}:${p.colour.hex.toLowerCase()}`).join(","), d.mount, d.mountHeightCm ?? ""].join("|");
    const g = groups.get(ri) ?? new Map();
    const piece = { id: f.id, x: f.position[0], z: f.position[2], rotation: f.rotation ?? 0 };
    const line = g.get(key);
    if (line) { line.pieces.push(piece); line.qty += 1; }
    else g.set(key, { ...d, pieces: [piece], qty: 1 });
    groups.set(ri, g);
  }

  // rooms in plan order, then the leftovers; inside a room, floor pieces
  // first (the big builds), then wall, then ceiling, each largest first
  const mountOrder: Record<Mount, number> = { floor: 0, wall: 1, ceiling: 2 };
  const order = [...polys.keys(), -1].filter(i => groups.has(i));
  let no = 0;
  const out: SheetRoom[] = order.map(ri => {
    const lines = [...groups.get(ri)!.values()]
      .sort((a, b) => mountOrder[a.mount] - mountOrder[b.mount]
        || b.sizeCm.w * b.sizeCm.d - a.sizeCm.w * a.sizeCm.d
        || a.name.localeCompare(b.name))
      .map(l => ({ ...l, no: ++no }));
    return {
      name: ri >= 0 ? (polys[ri].room.name?.trim() || `Room ${ri + 1}`) : OTHER_AREA,
      areaM2: ri >= 0 ? polys[ri].area / (vs * vs) : null,
      lines,
    };
  });

  // two rooms with the same name ("Bedroom", "Bedroom") stay distinguishable
  const seen = new Map<string, number>();
  for (const r of out) {
    const n = (seen.get(r.name) ?? 0) + 1;
    seen.set(r.name, n);
    if (n > 1) r.name = `${r.name} (${n})`;
  }

  const totalArea = polys.reduce((a, p) => a + p.area, 0) / (vs * vs);
  return {
    rooms: out,
    totalPieces: furniture.length,
    totalLines: no,
    planSizeM: { w: totalW / vs, d: totalD / vs },
    totalAreaM2: polys.length ? totalArea : null,
  };
}

/** Footprint corners of a piece on the plan (scene metres), for the plan page.
 *  Matches three.js: rotation about +Y, item front = local +Z. */
export function footprint(x: number, z: number, wM: number, dM: number, rotation: number): [number, number][] {
  const c = Math.cos(rotation), s = Math.sin(rotation);
  return ([[-wM / 2, -dM / 2], [wM / 2, -dM / 2], [wM / 2, dM / 2], [-wM / 2, dM / 2]] as [number, number][])
    .map(([lx, lz]) => [x + lx * c + lz * s, z - lx * s + lz * c]);
}
