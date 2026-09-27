/**
 * Marketplace API client
 * ----------------------------------------------------------------------------
 * Thin, typed wrapper over the /marketplace endpoints. No ranking logic here —
 * that lives in lib/matching/products.ts, which is pure and testable.
 *
 * Types mirror what the backend returns after shapeForGrid, verified against a
 * live response. Three things worth knowing:
 *
 *   `retailer` is singular and narrow (id, name, logo_url). The controller once
 *   embedded retailers(*), which shipped api_credentials and commission_rate to
 *   the browser. Do not widen it.
 *
 *   `from_price` is the lowest active variant price, not base_price. The Haven
 *   sofa is 1299 in Oatmeal and 1349 in Sage; a card showing the higher number
 *   is a complaint waiting to happen.
 *
 *   getCanvasMatches doesn't run through shapeForGrid on the server, so it is
 *   normalised here and callers see one shape everywhere.
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
  /** Indexed cm columns. Prefer these over dimensions_cm — a DB trigger keeps
   *  them populated even when a vendor form writes only the JSONB. */
  width_cm: number | null;
  depth_cm: number | null;
  height_cm: number | null;
  dimensions_cm: { width?: number; depth?: number; height?: number } | null;
  stock_quantity: number;
  price: number;
  images: string[];
  is_active: boolean;
}

export interface MarketplaceProduct {
  id: string;
  /** Matches CatalogItem.id in lib/furniture/catalog.ts. The canvas bridge. */
  canvas_model_id: string | null;
  /** Matches FurnitureType.id. Makes "similar items" possible — canvas_model_id
   *  alone can only ever find the same model again. */
  type_id: string | null;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  base_price: number;
  from_price: number;
  affiliate_url: string | null;
  specs_json: Record<string, unknown>;
  lead_time_days: number;
  shop_group: string;
  type_name: string | null;
  is_3d: boolean;
  in_stock: boolean;
  retailer: RetailerSummary | null;
  variants: ProductVariant[];
}

export interface FacetGroup {
  group: string;
  sort: number;
  count: number;
}

export interface Facets {
  groups: FacetGroup[];
  vendors: RetailerSummary[];
  price: { min: number; max: number };
}

export interface ProductQuery {
  group?: string;
  category?: string;
  typeId?: string;
  /** Omit a model so the exact match isn't listed twice under "similar". */
  excludeModel?: string;
  retailerId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: "price_asc" | "price_desc" | "lead_time" | "newest";
  page?: number;
  limit?: number;
}

export interface ProductPage {
  products: MarketplaceProduct[];
  total: number;
  page: number;
  limit: number;
}

// ─── Internals ───────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};
  } catch {
    return {};
  }
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

/** The demo fallback uses ids like `sofa_modern_01`; the real catalog uses
 *  `sofa-3seat`. Underscores are the tell. */
function looksLikeMock(rows: { canvas_model_id?: string | null }[]): boolean {
  return rows.some(r => r.canvas_model_id?.includes("_"));
}

/** Bring a raw embed row to the same shape shapeForGrid produces. */
function normaliseRaw(row: any): MarketplaceProduct {
  const variants: ProductVariant[] = (row.product_variants ?? row.variants ?? [])
    .filter((v: any) => v.is_active);
  const prices = variants
    .map((v: ProductVariant) => Number(v.price))
    .filter((n: number) => !Number.isNaN(n));

  return {
    id: row.id,
    canvas_model_id: row.canvas_model_id ?? null,
    type_id: row.type_id ?? null,
    title: row.title,
    description: row.description ?? null,
    category: row.category,
    tags: row.tags ?? [],
    base_price: Number(row.base_price),
    from_price: prices.length ? Math.min(...prices) : Number(row.base_price),
    affiliate_url: row.affiliate_url ?? null,
    specs_json: row.specs_json ?? {},
    lead_time_days: Number(row.lead_time_days ?? 14),
    shop_group: row.shop_group ?? "Other",
    type_name: row.type_name ?? null,
    is_3d: Boolean(row.canvas_model_id),
    in_stock: variants.some((v: ProductVariant) => v.stock_quantity > 0),
    retailer: row.retailer ?? row.retailers ?? null,
    variants,
  };
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

/** Chip counts, vendor list and price range for the filter bar. */
export async function getFacets(): Promise<Facets> {
  const json = await get<{ success: boolean } & Facets>("/marketplace/facets");
  return {
    groups: json.groups ?? [],
    vendors: json.vendors ?? [],
    price: json.price ?? { min: 0, max: 0 },
  };
}

export async function getProducts(q: ProductQuery = {}): Promise<ProductPage> {
  const p = new URLSearchParams();
  if (q.group && q.group !== "All") p.set("group", q.group);
  if (q.category)         p.set("category", q.category);
  if (q.typeId)           p.set("type_id", q.typeId);
  if (q.excludeModel)     p.set("exclude_model", q.excludeModel);
  if (q.retailerId && q.retailerId !== "All") p.set("retailer_id", q.retailerId);
  if (q.search)           p.set("search", q.search);
  if (q.minPrice != null) p.set("min_price", String(q.minPrice));
  if (q.maxPrice != null) p.set("max_price", String(q.maxPrice));
  if (q.inStock)          p.set("in_stock", "true");
  if (q.sort && q.sort !== "newest") p.set("sort", q.sort);
  p.set("page",  String(q.page  ?? 1));
  p.set("limit", String(q.limit ?? 12));

  const json = await get<{
    success: boolean;
    products: MarketplaceProduct[];
    total: number;
    page: number;
    limit: number;
  }>(`/marketplace/products?${p.toString()}`);

  return {
    products: json.products ?? [],
    total: json.total ?? 0,
    page: json.page ?? 1,
    limit: json.limit ?? 12,
  };
}

/**
 * Products whose canvas_model_id matches a placed 3D model exactly.
 * "You placed this — here's who sells it."
 */
export async function getCanvasMatches(
  canvasModelId: string,
): Promise<MarketplaceProduct[]> {
  const json = await get<{
    success: boolean;
    products: any[];
    is_mock?: boolean;
  }>(`/marketplace/canvas-link/${encodeURIComponent(canvasModelId)}`);

  const raw = json.products ?? [];
  // The endpoint omits is_mock on success, so infer as a backstop. Returning
  // nothing is better than returning demo furniture that looks real.
  if (json.is_mock === true || looksLikeMock(raw)) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[marketplace] canvas-link/${canvasModelId} returned demo data — ` +
        `no product carries this canvas_model_id.`,
      );
    }
    return [];
  }
  return raw.map(normaliseRaw);
}

export async function getProductById(
  id: string,
): Promise<MarketplaceProduct | null> {
  const json = await get<{ success: boolean; product: any; is_mock?: boolean }>(
    `/marketplace/products/${encodeURIComponent(id)}`,
  );
  if (json.is_mock === true || !json.product) return null;
  return normaliseRaw(json.product);
}

/**
 * Record an outbound click, then send the shopper on. Never block navigation on
 * this — a lost tracking row is a reporting gap, a blocked click is a lost sale.
 */
export async function trackAffiliateClick(
  productId: string,
  retailerId: string,
  referrer = "marketplace",
): Promise<string | null> {
  try {
    const p = new URLSearchParams({
      product_id: productId,
      retailer_id: retailerId,
      referrer,
    });
    const json = await get<{ success: boolean; target_url: string }>(
      `/marketplace/affiliate/click?${p.toString()}`,
    );
    return json.target_url ?? null;
  } catch {
    return null;
  }
}