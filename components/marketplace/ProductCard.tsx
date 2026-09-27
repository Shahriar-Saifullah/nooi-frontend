"use client";

/**
 * ProductCard — one tile in the marketplace grid
 * ----------------------------------------------------------------------------
 * Image with badges, vendor, name, price, lead time, and an add-to-cart control
 * that becomes a quantity stepper once the item is in the cart.
 *
 * Two things this deliberately does not show:
 *
 *   Ratings. There are no reviews yet, and "★ 0 · 0 sold" on every card reads
 *   as broken rather than new. The slot is marked below for when review data
 *   exists.
 *
 *   base_price. Cards show `from_price`, the lowest active variant. The Haven
 *   sofa is 1299 in Oatmeal and 1349 in Sage — showing anything but the lower
 *   number is a complaint at checkout.
 */

import React from "react";
import { ShoppingCart, Plus, Minus, Trash2, Box } from "lucide-react";
import type { MarketplaceProduct } from "@/lib/api/marketplace";

interface Props {
  product: MarketplaceProduct;
  /** Quantity already in the cart. 0 shows the add button. */
  quantity: number;
  onOpen: (product: MarketplaceProduct) => void;
  onAdd: (product: MarketplaceProduct) => void;
  onIncrement: (product: MarketplaceProduct) => void;
  onDecrement: (product: MarketplaceProduct) => void;
  /** Arabic-Indic numerals when the UI language is Arabic. */
  formatPrice: (value: number) => string;
  /** Same, for bare counts. */
  formatNumber: (value: number) => string;
  labels: {
    threeD: string;
    inCart: string;
    addToCart: string;
    soldOut: string;
    days: string;
    from: string;
  };
}

export default function ProductCard({
  product,
  quantity,
  onOpen,
  onAdd,
  onIncrement,
  onDecrement,
  formatPrice,
  formatNumber,
  labels,
}: Props) {
  const inCart = quantity > 0;
  const image = product.variants.find(v => v.images?.length)?.images?.[0] ?? null;
  const multiplePrices = new Set(product.variants.map(v => Number(v.price))).size > 1;

  return (
    <div className="group flex flex-col rounded-xl border border-[#E6EBEA] bg-white overflow-hidden transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      {/* Image + badges */}
      <div className="relative">
        <button
          onClick={() => onOpen(product)}
          aria-label={product.title}
          className="block w-full aspect-[4/3] bg-[#F1F4F4] overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#004643]"
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={product.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-[#B3B9B9]">
              <Box size={28} strokeWidth={1.25} />
            </span>
          )}
        </button>

        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {product.is_3d && (
            <span className="px-2 py-1 rounded-full bg-[#F3FEFD] border border-[#87DDD7] text-[10.5px] font-medium text-[#004643]">
              {labels.threeD}
            </span>
          )}
          {inCart && (
            <span className="px-2 py-1 rounded-full bg-[#E7FBEB] border border-[#28603A]/25 text-[10.5px] font-medium text-[#28603A]">
              {labels.inCart}
            </span>
          )}
        </div>
      </div>

      {/* Detail */}
      <button
        onClick={() => onOpen(product)}
        className="flex flex-col gap-1 px-3.5 pt-3 pb-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#004643]"
      >
        <span className="text-[11px] text-[#8E9493] truncate">
          {product.retailer?.name ?? "\u00A0"}
        </span>

        <span className="flex items-baseline justify-between gap-3">
          <span className="text-[13.5px] font-medium text-[#101212] truncate">
            {product.title}
          </span>
          <span className="shrink-0 text-[13.5px] font-semibold text-[#004643] tabular-nums">
            {multiplePrices && (
              <span className="text-[10.5px] font-normal text-[#8E9493] me-1">
                {labels.from}
              </span>
            )}
            {formatPrice(product.from_price)}
          </span>
        </span>

        {/* Ratings belong here once product_reviews has data. Showing
            "★ 0 · 0 sold" on a new catalogue reads as broken, not new. */}
        <span className="text-[11px] text-[#646968]">
          {product.lead_time_days} {labels.days}
        </span>
      </button>

      {/* Cart control */}
      <div className="px-3.5 pb-3.5 pt-1">
        {!inCart ? (
          <button
            onClick={() => onAdd(product)}
            disabled={!product.in_stock}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-full border border-[#D5DBDA] bg-white text-[12.5px] font-medium text-[#004643]
                       transition-colors hover:bg-[#F3FEFD] hover:border-[#87DDD7]
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-[#D5DBDA]
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004643]"
          >
            <ShoppingCart size={13} />
            {product.in_stock ? labels.addToCart : labels.soldOut}
          </button>
        ) : (
          <div className="flex items-center justify-between gap-2 px-1.5 py-1 rounded-full border border-[#D5DBDA] bg-[#F1F4F4]">
            <button
              onClick={() => onDecrement(product)}
              aria-label={quantity === 1 ? "Remove from cart" : "Remove one"}
              className="w-7 h-7 flex items-center justify-center rounded-full text-[#004643] transition-colors hover:bg-white
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#004643]"
            >
              {quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
            </button>
            <span
              aria-live="polite"
              className="text-[12.5px] font-medium text-[#101212] tabular-nums"
            >
              {formatNumber(quantity)}
            </span>
            <button
              onClick={() => onIncrement(product)}
              aria-label="Add one more"
              className="w-7 h-7 flex items-center justify-center rounded-full text-[#004643] transition-colors hover:bg-white
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#004643]"
            >
              <Plus size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}