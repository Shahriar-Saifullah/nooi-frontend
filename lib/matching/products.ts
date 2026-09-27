/**
 * Product matching — ranking and fit assessment
 * ----------------------------------------------------------------------------
 * Pure functions. No React, no fetch, no side effects. Everything here takes
 * data in and returns data out, so the ranking can be tuned and tested without
 * a browser or a database.
 *
 * The problem: a shopper placed a 3D model in a room where it fits. We now have
 * to show them real products, ordered by how well each one actually substitutes
 * for what they designed with.
 *
 * Two kinds of match:
 *
 *   Exact      product.canvas_model_id === the placed model's id. Someone sells
 *              this specific piece. Always ranked first.
 *
 *   Similar    product.type_id === the model's type. Different sofa, still a
 *              sofa. This is what canvas_model_id alone could never find, and
 *              it's why type_id was added to the products table.
 *
 * The fit check is the part no other furniture site can do. The shopper placed
 * something with a known footprint into a room that validated it. If a product
 * is meaningfully larger, it may not fit the space they designed — and we know
 * that before they buy, not after it's delivered.
 */

import type { CatalogItem } from "@/lib/furniture/catalog";
import type { FurnitureGroup } from "@/components/FurnitureListPanel";
import type { MarketplaceProduct, ProductVariant } from "@/lib/api/marketplace";

// ─── Types ───────────────────────────────────────────────────────────────────

export type FitStatus = "fits" | "tight" | "oversize" | "unknown";

export interface FitAssessment {
  status: FitStatus;
  /** cm difference against the placed footprint. Positive = product is larger. */
  deltaW: number;
  deltaD: number;
  deltaH: number;
  /** Ready to render. Null when the product matches closely enough to say
   *  nothing — silence is the right output for a good fit. */
  note: string | null;
}

export interface ProductMatch {
  product: MarketplaceProduct;
  /** The variant closest to what they placed, not simply the first one. */
  variant: ProductVariant;
  exact: boolean;
  fit: FitAssessment;
  inStock: boolean;
  /** Higher is better. Meaningful only for ordering within one result set. */
  score: number;
}

export interface TargetSize {
  w: number;
  d: number;
  h: number;
}

// ─── Tuning ──────────────────────────────────────────────────────────────────
// Deliberately named and grouped. Expect to adjust these once real products
// land — seeded data is too tidy to reveal how forgiving the thresholds should be.

const FIT = {
  /** Within this fraction of the placed footprint, say nothing. */
  comfortable: 0.05,
  /** Beyond comfortable but under this, warn gently. */
  tight: 0.15,
} as const;

const WEIGHT = {
  exactModel: 1000,
  dimension: 300,
  tags: 60,
  color: 40,
  material: 20,
  outOfStock: -150,
} as const;

// ─── Size helpers ────────────────────────────────────────────────────────────

/**
 * Real-world footprint of a placed group, in cm.
 * Applies the user's size slider — a sofa scaled to 1.2 needs a 1.2× product.
 */
export function targetSizeFor(group: FurnitureGroup): TargetSize | null {
  const scale = group.sample.sizeScale ?? 1;

  if (group.cat) {
    const { w, d, h } = group.cat.size;
    return { w: w * scale, d: d * scale, h: h * scale };
  }

  const { width, depth, height } = group.sample;
  if (width && depth && height) {
    return { w: width * scale, d: depth * scale, h: height * scale };
  }
  return null;
}

function variantSize(v: ProductVariant): TargetSize | null {
  const w = v.width_cm  ?? v.dimensions_cm?.width;
  const d = v.depth_cm  ?? v.dimensions_cm?.depth;
  const h = v.height_cm ?? v.dimensions_cm?.height;
  if (w == null || d == null || h == null) return null;
  return { w: Number(w), d: Number(d), h: Number(h) };
}

/**
 * How far a variant is from the target, as a fraction. 0 is identical.
 * Width and depth carry the weight — height rarely decides whether something
 * fits a floor plan, but it matters for wardrobes and shelving, so it counts
 * for less rather than not at all.
 */
function dimensionDistance(target: TargetSize, size: TargetSize): number {
  const dw = Math.abs(size.w - target.w) / Math.max(target.w, 1);
  const dd = Math.abs(size.d - target.d) / Math.max(target.d, 1);
  const dh = Math.abs(size.h - target.h) / Math.max(target.h, 1);
  return dw * 0.45 + dd * 0.45 + dh * 0.1;
}

// ─── Fit ─────────────────────────────────────────────────────────────────────

export function assessFit(
  target: TargetSize | null,
  variant: ProductVariant,
): FitAssessment {
  const size = variant ? variantSize(variant) : null;

  if (!target || !size) {
    return { status: "unknown", deltaW: 0, deltaD: 0, deltaH: 0, note: null };
  }

  const deltaW = size.w - target.w;
  const deltaD = size.d - target.d;
  const deltaH = size.h - target.h;

  // Only oversize matters for fit. Something smaller always fits the gap,
  // even if it looks sparse — that's a taste question, not a fit one.
  const overW = Math.max(0, deltaW) / Math.max(target.w, 1);
  const overD = Math.max(0, deltaD) / Math.max(target.d, 1);
  const worst = Math.max(overW, overD);

  let status: FitStatus = "fits";
  let note: string | null = null;

  if (worst > FIT.tight) {
    status = "oversize";
    const axis = overW >= overD ? "wider" : "deeper";
    const by = Math.round(overW >= overD ? deltaW : deltaD);
    note = `${by}cm ${axis} than the space you designed for — check your clearances.`;
  } else if (worst > FIT.comfortable) {
    status = "tight";
    const axis = overW >= overD ? "wider" : "deeper";
    const by = Math.round(overW >= overD ? deltaW : deltaD);
    note = `Slightly larger — ${by}cm ${axis} than your placement.`;
  }

  return { status, deltaW, deltaD, deltaH, note };
}

// ─── Variant selection ───────────────────────────────────────────────────────

/**
 * A product may have several variants. Show the one that best matches what the
 * shopper placed: closest in size, then matching their chosen colour, then in
 * stock, then cheapest. Picking `[0]` would show an arbitrary colourway.
 */
export function pickVariant(
  product: MarketplaceProduct,
  target: TargetSize | null,
  wantColor?: string | null,
): ProductVariant | null {
  const variants = product.variants?.filter(v => v.is_active) ?? [];
  if (variants.length === 0) return null;

  const scored = variants.map(v => {
    const size = variantSize(v);
    const dist = target && size ? dimensionDistance(target, size) : 0.5;

    let s = -dist * 100;
    if (wantColor && v.color && v.color.toLowerCase() === wantColor.toLowerCase()) s += 50;
    if (v.stock_quantity > 0) s += 25;
    s -= v.price / 100000; // cheapest wins a dead heat, barely

    return { v, s };
  });

  scored.sort((a, b) => b.s - a.s);
  return scored[0].v;
}

// ─── Ranking ─────────────────────────────────────────────────────────────────

function tagOverlap(cat: CatalogItem | undefined, product: MarketplaceProduct): number {
  if (!cat?.tags?.length || !product.tags?.length) return 0;
  const theirs = new Set(product.tags.map(t => t.toLowerCase()));
  const hits = cat.tags.filter(t => theirs.has(t.toLowerCase())).length;
  return hits / cat.tags.length;
}

/**
 * Rank products against one placed furniture group.
 *
 * Pass everything you fetched — exact matches and type matches together. The
 * `exact` flag on each result tells the UI what to feature and what to list
 * underneath, so the caller doesn't need to keep two arrays in step.
 */
export function rankProducts(
  group: FurnitureGroup,
  products: MarketplaceProduct[],
): ProductMatch[] {
  const target = targetSizeFor(group);
  const modelId = group.sample.modelId;
  const wantColor = group.sample.color ?? null;

  const matches: ProductMatch[] = [];

  for (const product of products) {
    const variant = pickVariant(product, target, wantColor);
    if (!variant) continue; // nothing buyable

    const size = variantSize(variant);
    const exact = Boolean(modelId && product.canvas_model_id === modelId);
    const inStock = variant.stock_quantity > 0;

    let score = 0;
    if (exact) score += WEIGHT.exactModel;

    if (target && size) {
      score += WEIGHT.dimension * (1 - Math.min(dimensionDistance(target, size), 1));
    }

    score += WEIGHT.tags * tagOverlap(group.cat, product);

    if (wantColor && variant.color?.toLowerCase() === wantColor.toLowerCase()) {
      score += WEIGHT.color;
    }
    if (group.sample.materialPreset && variant.material &&
        variant.material.toLowerCase().includes(group.sample.materialPreset.toLowerCase())) {
      score += WEIGHT.material;
    }

    // Out of stock ranks down rather than disappearing — seeing it exists is
    // useful, and a back-in-stock prompt is a reason to return.
    if (!inStock) score += WEIGHT.outOfStock;

    matches.push({
      product,
      variant,
      exact,
      inStock,
      fit: assessFit(target, variant),
      score,
    });
  }

  matches.sort((a, b) => b.score - a.score);
  return matches;
}

/**
 * Convenience split for the shop layout: the featured card and the row beneath.
 * `alternatives` includes exact matches from other retailers — a second vendor
 * selling the same sofa is the most interesting alternative there is.
 */
export function splitMatches(matches: ProductMatch[]): {
  featured: ProductMatch | null;
  alternatives: ProductMatch[];
} {
  if (matches.length === 0) return { featured: null, alternatives: [] };
  return { featured: matches[0], alternatives: matches.slice(1) };
}