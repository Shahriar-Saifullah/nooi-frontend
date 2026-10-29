/**
 * Shop items on the canvas — lib/furniture/shopCatalog.ts
 * ----------------------------------------------------------------------------
 * Vendor listings that have an approved 3D model can be dragged into a room
 * like library furniture. This file fetches them from the marketplace and
 * registers them with the catalog (catalog.ts → registerShopItems), so the
 * canvas resolves "shop:<productId>" through catalogById like any other piece.
 *
 * Saved rooms only store the id, so a room that contains shop items calls
 * ensureShopItems() on load; until it resolves, those items draw as boxes of
 * the right size (the placed item carries width/depth/height).
 */

import { useSyncExternalStore } from "react";
import {
  CATEGORY_LABELS, SHOP_ID_PREFIX, isShopId, hasShopItem, registerShopItems,
  subscribeShopItems, getShopVersion,
  type CatalogItem, type FurnitureCategory,
} from "./catalog";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/** What GET /marketplace/canvas-items returns per listing. */
export interface ShopCanvasItem {
  product_id: string;
  title: string;
  vendor: string | null;
  price: number;
  photo: string | null;
  model_url: string;
  size: { w: number; d: number; h: number };
  type_id: string | null;
  category: string | null;
  tags: string[];
  on_sale: boolean;
}

export const shopId = (productId: string) => `${SHOP_ID_PREFIX}${productId}`;
export const productIdFromShopId = (id: string) => id.slice(SHOP_ID_PREFIX.length);

function toCatalogItem(p: ShopCanvasItem): CatalogItem {
  const category: FurnitureCategory =
    p.category && p.category in CATEGORY_LABELS ? (p.category as FurnitureCategory) : "living";
  return {
    id: shopId(p.product_id),
    typeId: p.type_id ?? "shop",
    name: p.title,
    category,
    path: p.model_url,
    thumbnail: p.photo ?? undefined,
    size: p.size,
    color: "#b09a7a",
    tags: p.tags ?? [],
    // A real product: recolouring it would show the shopper something the
    // vendor doesn't sell.
    customizable: false,
    mountType: "floor",
    shop: { productId: p.product_id, vendor: p.vendor, price: p.price, onSale: p.on_sale },
  };
}

async function fetchItems(query: string): Promise<CatalogItem[]> {
  const res = await fetch(`${BASE_URL}/marketplace/canvas-items?${query}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Shop items request failed (${res.status})`);
  const json = await res.json();
  const items = ((json.items ?? []) as ShopCanvasItem[]).map(toCatalogItem);
  registerShopItems(items);
  return items;
}

/** Browse: approved listings with a 3D model, newest first. */
export function listShopItems(search?: string): Promise<CatalogItem[]> {
  const q = new URLSearchParams();
  if (search?.trim()) q.set("search", search.trim());
  return fetchItems(q.toString());
}

/** Make sure every shop id in a saved room is registered. Never throws. */
const inFlight = new Set<string>();
const failedIds = new Set<string>();

export async function ensureShopItems(modelIds: Array<string | null | undefined>): Promise<void> {
  // Skip what's registered, being fetched, or already known to be gone — this
  // runs on every furniture change, so it must be cheap and never re-request.
  const missing = [...new Set(modelIds.filter(isShopId))]
    .filter(id => !hasShopItem(id) && !inFlight.has(id) && !failedIds.has(id));
  if (!missing.length) return;
  missing.forEach(id => inFlight.add(id));
  try {
    const ids = missing.map(productIdFromShopId);
    for (let i = 0; i < ids.length; i += 50) {
      await fetchItems(new URLSearchParams({ ids: ids.slice(i, i + 50).join(",") }).toString());
    }
    // Deleted listings or ones whose model was removed: draw as boxes.
    missing.filter(id => !hasShopItem(id)).forEach(id => failedIds.add(id));
  } catch (e) {
    // The room still opens; those pieces draw as boxes of the right size.
    console.warn("[shopCatalog] could not load shop items:", e);
  } finally {
    missing.forEach(id => inFlight.delete(id));
  }
}

/** Re-render when shop items are registered (catalogById results change). */
export function useShopCatalogVersion(): number {
  return useSyncExternalStore(subscribeShopItems, getShopVersion, () => 0);
}
