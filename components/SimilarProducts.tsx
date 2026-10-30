"use client";

/**
 * SimilarProducts — "Real products like this", under a selected library piece
 * ----------------------------------------------------------------------------
 * The canvas library is Nooi's own models; vendors sell real pieces. When a
 * shopper selects a library sofa, show the real sofas closest to it — exact
 * matches first (vendors who mapped their listing to this model), then the
 * same type ranked by how close the size, colour and material are, with a
 * note when one is bigger than the space they designed for.
 *
 *   Use in room  swap the library piece for the real one (when it has a 3D
 *                model), keeping its position and angle
 *   Add to cart  the closest variant
 *   View         the product page
 */

import React, { useEffect, useState } from "react";
import { Loader2, ShoppingCart, Check, ArrowLeftRight } from "lucide-react";
import { getCanvasMatches, getProducts, type MarketplaceProduct } from "@/lib/api/marketplace";
import { rankProducts, type ProductMatch } from "@/lib/matching/products";
import { groupPlacedFurniture } from "@/components/FurnitureListPanel";
import { catalogById, isShopId } from "@/lib/furniture/catalog";
import { formatMoney } from "@/lib/money";
import { useCartStore } from "@/lib/store/cart.store";
import type { PlacedFurniture } from "@/components/ThreeSceneV2";

// Results per library model (and size), for the life of the page.
const cache = new Map<string, ProductMatch[]>();

const has3d = (p: MarketplaceProduct) =>
  Boolean(p.model_url || (p.specs_json as { model_url?: string } | null)?.model_url);

export default function SimilarProducts({
  item, onUseInRoom,
}: {
  item: PlacedFurniture;
  /** swap this placed piece for a real product (only offered when it has a 3D model) */
  onUseInRoom?: (product: MarketplaceProduct) => Promise<boolean> | boolean;
}) {
  const cat = item.modelId ? catalogById(item.modelId) : undefined;
  const key = cat && !isShopId(cat.id) ? `${cat.id}|${item.sizeScale ?? 1}|${item.color ?? ""}` : null;
  // results arrive asynchronously; derive what to show from the cache so a
  // different piece never flashes the previous piece's products
  const [, setLoadedKey] = useState<string | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const matches = key ? cache.get(key) ?? null : null;
  const failed = key !== null && failedKey === key;
  const [busy, setBusy] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!key || !cat || cache.has(key)) return;
    let alive = true;
    (async () => {
      try {
        const [exact, similar] = await Promise.all([
          getCanvasMatches(cat.id).catch(() => [] as MarketplaceProduct[]),
          getProducts({ typeId: cat.typeId, excludeModel: cat.id, limit: 24 }).then(r => r.products).catch(() => [] as MarketplaceProduct[]),
        ]);
        const seen = new Set<string>();
        const all = [...exact, ...similar].filter(p => (seen.has(p.id) ? false : (seen.add(p.id), true)));
        const group = groupPlacedFurniture([item])[0];
        const ranked = group ? rankProducts(group, all).slice(0, 4) : [];
        cache.set(key, ranked);
        if (alive) setLoadedKey(key);
      } catch {
        if (alive) setFailedKey(key);
      }
    })();
    return () => { alive = false; };
    // the key captures everything the ranking depends on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!key) return null;

  const addToCart = (m: ProductMatch) => {
    const cart = useCartStore.getState();
    const existing = cart.items.find(c => c.variant_id === m.variant.id);
    if (existing) cart.updateQuantityOptimistic(existing.id, existing.quantity + 1);
    else cart.addItemOptimistic({
      id: m.variant.id, variant_id: m.variant.id, quantity: 1,
      product_data: {
        title: m.product.title, price: Number(m.variant.price), retailer_name: m.product.retailer?.name,
        color: m.variant.color ?? undefined, image: m.variant.images?.[0],
      },
    });
    setAdded(s => new Set(s).add(m.product.id));
  };

  return (
    <div className="mb-3 rounded-lg border border-gray-200 bg-white p-2">
      <div className="mb-1.5 text-[10px] font-semibold uppercase text-gray-400">Real products like this</div>
      {failed && <p className="py-2 text-[11px] text-gray-400">Couldn&apos;t load products.</p>}
      {!failed && matches === null && (
        <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-teal-700" /></div>
      )}
      {matches?.length === 0 && (
        <p className="py-1 text-[11px] text-gray-400">No vendor sells anything like this yet.</p>
      )}
      <div className="space-y-2">
        {matches?.map(m => {
          const img = m.variant.images?.[0];
          const canSwap = has3d(m.product) && !!onUseInRoom;
          return (
            <div key={m.product.id} className="flex gap-2">
              <a href={`/marketplace/${m.product.id}`} target="_blank" rel="noopener noreferrer"
                className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-gray-100 bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {img && <img src={img} alt="" className="h-full w-full object-cover" />}
              </a>
              <div className="min-w-0 flex-1">
                <a href={`/marketplace/${m.product.id}`} target="_blank" rel="noopener noreferrer"
                  className="block truncate text-[12px] font-medium text-gray-800 hover:underline">{m.product.title}</a>
                <div className="truncate text-[10.5px] text-gray-400">
                  {m.product.retailer?.name ?? "Nooi vendor"}{m.exact ? " · exact match" : ""}{!m.inStock ? " · out of stock" : ""}
                </div>
                <div className="text-[11.5px] font-semibold text-teal-800">{formatMoney(Number(m.variant.price))}</div>
                {m.fit.note && <div className={`text-[10.5px] leading-tight ${m.fit.status === "oversize" ? "text-red-700" : "text-amber-700"}`}>{m.fit.note}</div>}
                <div className="mt-1 flex flex-wrap gap-1">
                  {canSwap && (
                    <button type="button" disabled={busy === m.product.id}
                      onClick={async () => { setBusy(m.product.id); await onUseInRoom!(m.product); setBusy(null); }}
                      className="flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[10.5px] font-medium text-teal-800 hover:bg-teal-100 disabled:opacity-50">
                      {busy === m.product.id ? <Loader2 size={10} className="animate-spin" /> : <ArrowLeftRight size={10} />} Use in room
                    </button>
                  )}
                  {m.inStock && (
                    <button type="button" onClick={() => addToCart(m)}
                      className="flex items-center gap-1 rounded-md border border-gray-200 px-1.5 py-0.5 text-[10.5px] font-medium text-gray-700 hover:border-gray-300">
                      {added.has(m.product.id) ? <><Check size={10} /> In cart</> : <><ShoppingCart size={10} /> Add to cart</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
