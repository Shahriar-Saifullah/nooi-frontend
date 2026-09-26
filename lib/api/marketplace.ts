/**
 * Marketplace API client
 * ----------------------------------------------------------------------------
 * Thin, typed wrapper over the /marketplace endpoints. No ranking logic lives
 * here — that belongs in lib/matching/products.ts, which is pure and testable.
 *
 * Types below mirror what the backend actually returns, verified against a live
 * response rather than the migration file. Two things worth knowing:
 *
 *   `retailers` is deliberately narrow (id, name, logo_url). The controller
 *   used to embed retailers(*), which shipped api_credentials and
 *   commission_rate to the browser. Do not widen it.
 *
 *   `isMock` matters. Every marketplace endpoint silently falls back to
 *   hardcoded demo products when its query fails or returns nothing, so a
 *   broken query looks identical to a working one. Surfacing the flag is the
 *   difference between noticing that in ten seconds and noticing it in a week.
 */

import { createClient } from "@/utils/supabase/client";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RetailerSummary {
  id: string;
  name: string;
  logo_url: string | null;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  color: string | null;
  material: string | null;
  /** Real-world size in cm. Prefer these over dimensions_cm — they're indexed
   *  and always populated (a DB trigger mirrors the JSONB column into them). */
  width_cm: number | null;
  depth_cm: number | null;
  height_cm: number | null;
  /** Legacy JSONB. Kept because the vendor form may still write only this. */
  dimensions_cm: { width?: number; depth?: number; height?: number } | null;
  stock_quantity: number;
  price: number;
  images: string[];
  is_active: boolean;
}

export interface MarketplaceProduct {
  id: string;
  retailer_id: string;
  /** Matches CatalogItem.id in lib/furniture/catalog.ts. This is the bridge. */
  canvas_model_id: string;
  /** Matches FurnitureType.id. This is what makes "similar items" possible —
   *  canvas_model_id alone can only ever find the same model again. */
  type_id: string | null;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  base_price: number;
  affiliate_url: string | null;
  specs_json: Record<string, unknown>;
  retailers: RetailerSummary | null;
  product_variants: ProductVariant[];
}

export interface ProductQuery {
  typeId?: string;
  /** Omit a model from results — used to exclude the exact match from the
   *  "similar items" row so it isn't shown twice. */
  excludeModel?: string;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "price_asc" | "price_desc" | "newest";
  page?: number;
  limit?: number;
}

export interface ProductPage {
  products: MarketplaceProduct[];
  total: number;
  page: number;
  limit: number;
  isMock: boolean;
}

// ─── Internals ───────────────────────────────────────────────────────────────

async function authHeaders(extra: Record<string, string> = {}) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function get<T>(path: string): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Marketplace request failed (${res.status}): ${path}`);
  }
  return res.json() as Promise<T>;
}

/** Drop inactive variants and products left with none. A product whose only
 *  variant is discontinued is not a product a shopper can buy. */
function usable(products: MarketplaceProduct[]): MarketplaceProduct[] {
  return products
    .map(p => ({ ...p, product_variants: (p.product_variants ?? []).filter(v => v.is_active) }))
    .filter(p => p.product_variants.length > 0);
}

/** The demo fallback uses ids like `sofa_modern_01` while the real catalog uses
 *  `sofa-3seat`. Underscores are the tell. */
function looksLikeMock(products: MarketplaceProduct[]): boolean {
  return products.some(p => p.canvas_model_id?.includes("_"));
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

/**
 * Products whose canvas_model_id matches a placed 3D model exactly.
 * This is the "you placed this, here's who sells it" query.
 */
export async function getCanvasMatches(
  canvasModelId: string,
): Promise<{ products: MarketplaceProduct[]; isMock: boolean }> {
  const json = await get<{
    success: boolean;
    products: MarketplaceProduct[];
    is_mock?: boolean;
  }>(`/marketplace/canvas-link/${encodeURIComponent(canvasModelId)}`);

  const products = json.products ?? [];
  // This endpoint omits is_mock entirely on success, so infer as a backstop.
  const isMock = json.is_mock === true || looksLikeMock(products);

  if (isMock && process.env.NODE_ENV === "development") {
    console.warn(
      `[marketplace] canvas-link/${canvasModelId} returned demo data. ` +
      `No product has this canvas_model_id, or the query failed.`,
    );
  }

  return { products: isMock ? [] : usable(products), isMock };
}

/**
 * Browse and filter. Pass typeId to find related items across different 3D
 * models — that is how "other sofas" is built.
 */
export async function getProducts(q: ProductQuery = {}): Promise<ProductPage> {
  const params = new URLSearchParams();
  if (q.typeId)       params.set("type_id", q.typeId);
  if (q.excludeModel) params.set("exclude_model", q.excludeModel);
  if (q.category)     params.set("category", q.category);
  if (q.search)       params.set("search", q.search);
  if (q.minPrice != null) params.set("min_price", String(q.minPrice));
  if (q.maxPrice != null) params.set("max_price", String(q.maxPrice));
  if (q.sort && q.sort !== "newest") params.set("sort", q.sort);
  params.set("page",  String(q.page  ?? 1));
  params.set("limit", String(q.limit ?? 12));

  const json = await get<{
    success: boolean;
    products: MarketplaceProduct[];
    total: number;
    page: number;
    limit: number;
    is_mock: boolean;
  }>(`/marketplace/products?${params.toString()}`);

  const products = json.products ?? [];
  const isMock = json.is_mock === true || looksLikeMock(products);

  return {
    products: isMock ? [] : usable(products),
    total: isMock ? 0 : json.total ?? 0,
    page: json.page ?? 1,
    limit: json.limit ?? 12,
    isMock,
  };
}

export async function getProductById(
  id: string,
): Promise<{ product: MarketplaceProduct | null; isMock: boolean }> {
  const json = await get<{
    success: boolean;
    product: MarketplaceProduct;
    is_mock: boolean;
  }>(`/marketplace/products/${encodeURIComponent(id)}`);

  const isMock = json.is_mock === true;
  return { product: isMock ? null : json.product ?? null, isMock };
}

/**
 * Record an outbound click before sending the shopper to a retailer.
 * Never block navigation on this — if tracking fails, the shopper still goes.
 */
export async function trackAffiliateClick(
  productId: string,
  retailerId: string,
  referrer = "shop",
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      product_id: productId,
      retailer_id: retailerId,
      referrer,
    });
    const json = await get<{ success: boolean; target_url: string }>(
      `/marketplace/affiliate/click?${params.toString()}`,
    );
    return json.target_url ?? null;
  } catch {
    return null;
  }
}