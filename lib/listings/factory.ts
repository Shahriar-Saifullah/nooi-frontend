/**
 * Listing size guidance and drawings — lib/listings/factory.ts
 * ============================================================================
 * Factories told us their sizes are guidance they confirm, not hard limits
 * ("depth is usually 55–60 cm"). So a listing can carry size ranges and a
 * free-text note, shown to shoppers as guidance; nothing is enforced.
 *
 * Drawings added while creating a listing are uploaded to the vendor's draft
 * folder first (listings/draft/<user>/…) and saved with the listing.
 */

export type SizeAxis = "width" | "depth" | "height";
export type SizeRanges = Partial<Record<SizeAxis, { min?: number; max?: number }>>;
export const SIZE_AXES: { key: SizeAxis; label: string }[] = [
  { key: "width", label: "Width" }, { key: "depth", label: "Depth" }, { key: "height", label: "Height" },
];

export interface ListingFactoryValue {
  ranges: Record<SizeAxis, { min: string; max: string }>;
  note: string;
  drawings: DraftDrawing[];
}
export interface DraftDrawing { path: string; name: string; size: number; kind: "dwg" | "dxf" | "pdf" }

export const EMPTY_LISTING_FACTORY: ListingFactoryValue = {
  ranges: { width: { min: "", max: "" }, depth: { min: "", max: "" }, height: { min: "", max: "" } },
  note: "",
  drawings: [],
};

const num = (v: unknown): number | undefined => {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n <= 2000 ? Math.round(n * 10) / 10 : undefined;
};

/** Stored form, from the form or from a request body; empty axes are dropped, min/max swapped if reversed. */
export function cleanSizeRanges(raw: unknown): SizeRanges {
  const out: SizeRanges = {};
  const src = (raw ?? {}) as Record<string, { min?: unknown; max?: unknown } | undefined>;
  for (const { key } of SIZE_AXES) {
    let min = num(src[key]?.min), max = num(src[key]?.max);
    if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
    if (min !== undefined || max !== undefined) out[key] = { ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) };
  }
  return out;
}

export const cleanSizeNote = (raw: unknown): string | null => {
  const s = typeof raw === "string" ? raw.trim().slice(0, 500) : "";
  return s || null;
};

/** A typed number that isn't a sensible size, for the form's error message. */
export function sizeRangesProblem(v: ListingFactoryValue): string | null {
  for (const { key, label } of SIZE_AXES) {
    for (const end of ["min", "max"] as const) {
      const s = v.ranges[key][end].trim();
      if (s && num(s) === undefined) return `${label} ${end === "min" ? "from" : "to"}: enter a size in cm.`;
    }
  }
  return null;
}

/** Drawings a vendor uploaded to their own draft folder while creating the listing. */
export function cleanDraftDrawings(raw: unknown, userId: string, now = new Date()) {
  if (!Array.isArray(raw) || !userId) return [];
  const prefix = `listings/draft/${userId}/`;
  const out = [];
  for (const r of raw.slice(0, 10)) {
    const path = typeof r?.path === "string" ? r.path : "";
    const kind = path.toLowerCase().match(/\.(dwg|dxf|pdf)$/)?.[1];
    const size = Math.round(Number(r?.size));
    if (!path.startsWith(prefix) || path.includes("..") || !kind || !(size > 0) || size > 50 * 1024 * 1024) continue;
    out.push({ path, name: String(r?.name ?? "").slice(0, 160) || path.split("/").pop(), size, kind,
      uploaded_at: now.toISOString(), uploaded_by: userId, role: "vendor" as const });
  }
  return out;
}

/** "Width 180–240 cm · Depth usually 55–60 cm" for shoppers. */
export function sizeGuidance(ranges: SizeRanges | null | undefined): string[] {
  const r = cleanSizeRanges(ranges);
  return SIZE_AXES.flatMap(({ key, label }) => {
    const v = r[key];
    if (!v) return [];
    if (v.min !== undefined && v.max !== undefined) return [`${label} ${v.min}–${v.max} cm`];
    if (v.min !== undefined) return [`${label} from ${v.min} cm`];
    return [`${label} up to ${v.max} cm`];
  });
}

export function listingFactoryPayload(v: ListingFactoryValue) {
  return { size_ranges: cleanSizeRanges(v.ranges), size_note: cleanSizeNote(v.note), drawings: v.drawings };
}
