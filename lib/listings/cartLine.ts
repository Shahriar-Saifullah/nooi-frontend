/**
 * One place that puts a product in the local cart — lib/listings/cartLine.ts
 * ============================================================================
 * Product page, marketplace grid, "Shop this room", the canvas and similar
 * products all add lines. A line is a variant plus its config (width for
 * per-metre listings, chosen options), priced here for the preview with the
 * same rules the server uses (lib/listings/configure). The server re-prices
 * every line from the listing at the cart quote and at checkout.
 */

import { useCartStore } from "@/lib/store/cart.store";
import { configKey, normalizeConfig, priceLine, type LineConfig, type OptionGroup, type PriceUnit } from "./configure";

export interface PricedListing {
  price_unit?: PriceUnit;
  min_width_cm?: number | null;
  max_width_cm?: number | null;
  options?: OptionGroup[] | null;
}

/** The listing's own width in cm, from its variant. */
export const listedWidthCm = (variant: { width_cm?: number | null; dimensions_cm?: { width?: number } | null } | null | undefined) =>
  Number(variant?.width_cm ?? variant?.dimensions_cm?.width) || null;

/** Keep a width inside what the vendor makes. */
export function clampWidth(listing: PricedListing, cm: number): number {
  const min = listing.min_width_cm ?? 20;
  const max = listing.max_width_cm ?? 1500;
  return Math.round(Math.max(min, Math.min(max, cm)));
}

/**
 * The config to send for a line. Per-metre listings always carry their
 * width (so the server and the preview price the same piece).
 */
export function lineConfig(listing: PricedListing, listedWidth: number | null, sel: { width_cm?: number | null; options?: Record<string, string> } = {}): LineConfig {
  const cfg: LineConfig = {};
  if (listing.price_unit === "metre") cfg.width_cm = clampWidth(listing, sel.width_cm ?? listedWidth ?? 100);
  if (sel.options && Object.keys(sel.options).length) cfg.options = sel.options;
  return normalizeConfig(cfg);
}

export interface AddLineArgs {
  variantId: string;
  basePrice: number;
  listing: PricedListing;
  listedWidth: number | null;
  config: LineConfig;
  quantity: number;
  /** most that may be in the cart (stock) */
  max?: number;
  product: { title: string; retailer_name?: string; color?: string; image?: string };
}

/** Add (or top up) a line. Returns the quantity actually added. */
export function addCartLine(a: AddLineArgs): number {
  const cart = useCartStore.getState();
  const key = configKey(a.config);
  const priced = priceLine({ ...a.listing, width_cm: a.listedWidth }, a.basePrice, a.config);
  const existing = cart.items.find(i => i.variant_id === a.variantId && (i.config_key ?? "") === key);
  const room = (a.max ?? Infinity) - (existing?.quantity ?? 0);
  const qty = Math.max(0, Math.min(a.quantity, room));
  if (qty <= 0) return 0;
  if (existing) {
    cart.updateQuantityOptimistic(existing.id, existing.quantity + qty);
    return qty;
  }
  cart.addItemOptimistic({
    id: key ? `${a.variantId}~${key}` : a.variantId,
    variant_id: a.variantId,
    quantity: qty,
    config: Object.keys(a.config).length ? a.config : undefined,
    config_key: key,
    product_data: {
      ...a.product,
      price: priced.ok ? priced.unit_price : a.basePrice,
      config_label: priced.ok ? priced.label || undefined : undefined,
    },
  });
  return qty;
}

// ── Shop pieces placed in the canvas ────────────────────────────────────────

interface ShopLike {
  price: number;
  priceUnit?: "unit" | "metre";
  minWidthCm?: number | null;
  maxWidthCm?: number | null;
  options?: OptionGroup[];
}

/** A placed shop piece's listing, in configure.ts terms. */
export const shopListing = (shop: ShopLike): PricedListing => ({
  price_unit: shop.priceUnit ?? "unit",
  min_width_cm: shop.minWidthCm ?? null,
  max_width_cm: shop.maxWidthCm ?? null,
  options: shop.options ?? [],
});

/**
 * What a placed shop piece costs at the width it's drawn (per-metre listings
 * are made to the room's width), and the config to order it with.
 */
export function shopPiecePrice(shop: ShopLike, listedWidth: number, drawnWidthCm: number) {
  const listing = shopListing(shop);
  const config = lineConfig(listing, listedWidth, { width_cm: drawnWidthCm });
  const priced = priceLine({ ...listing, width_cm: listedWidth }, shop.price, config);
  return {
    config,
    unitPrice: priced.ok ? priced.unit_price : shop.price,
    widthCm: config.width_cm ?? null,
    perMetre: listing.price_unit === "metre",
  };
}
