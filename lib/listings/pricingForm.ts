/**
 * The vendor form's pricing & options state (components/vendor/ListingOptionsFields)
 * — what it holds, its checks, and what it sends to the listings API.
 */

import type { OptionKind, PriceUnit } from "./configure";

export interface EditableChoice { id?: string; name: string; code?: string; hex?: string; image?: string; price_delta: number | string; uploading?: boolean }
export interface EditableGroup { id?: string; name: string; kind: OptionKind; choices: EditableChoice[] }
export interface ListingPricingValue {
  price_unit: PriceUnit;
  min_width_cm: string;
  max_width_cm: string;
  options: EditableGroup[];
}

export const EMPTY_PRICING: ListingPricingValue = { price_unit: "unit", min_width_cm: "", max_width_cm: "", options: [] };

/** Form problems a vendor can fix; null when fine. */
export function pricingProblem(v: ListingPricingValue, listedWidthCm: number): string | null {
  if (v.price_unit === "metre") {
    const lo = Number(v.min_width_cm || 0), hi = Number(v.max_width_cm || 0);
    if (v.min_width_cm && (!Number.isFinite(lo) || lo < 20)) return "The smallest width must be at least 20 cm.";
    if (v.max_width_cm && (!Number.isFinite(hi) || hi > 1500)) return "The largest width can be at most 1500 cm.";
    if (lo && hi && lo > hi) return "The smallest width is bigger than the largest.";
    if (lo && listedWidthCm && listedWidthCm < lo) return "The listed width is below the smallest width you make.";
    if (hi && listedWidthCm && listedWidthCm > hi) return "The listed width is above the largest width you make.";
  }
  for (const g of v.options) {
    if (!g.name.trim()) return "Give every option group a name (e.g. Fabric).";
    if (!g.choices.some(c => c.name.trim())) return `Add at least one choice to "${g.name}".`;
    if (g.choices.some(c => c.uploading)) return "Wait for the swatch uploads to finish.";
    if (g.choices.some(c => c.price_delta !== "" && !Number.isFinite(Number(c.price_delta)))) return `Check the extra prices in "${g.name}".`;
  }
  return null;
}

/** What the listings API gets. */
export function pricingPayload(v: ListingPricingValue) {
  return {
    price_unit: v.price_unit,
    min_width_cm: v.min_width_cm ? Number(v.min_width_cm) : undefined,
    max_width_cm: v.max_width_cm ? Number(v.max_width_cm) : undefined,
    options: v.options.map(g => ({
      id: g.id, name: g.name, kind: g.kind,
      choices: g.choices.map(c => ({ id: c.id, name: c.name, code: c.code, hex: c.hex, image: c.image, price_delta: Number(c.price_delta) || 0 })),
    })),
  };
}
