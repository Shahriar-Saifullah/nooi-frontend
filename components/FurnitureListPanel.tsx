"use client";

/**
 * FurnitureListPanel — what's in the room, and the way into the shop
 * ----------------------------------------------------------------------
 * Opens from the item-count badge in the canvas header. Lists every placed
 * item and offers the jump into the marketplace.
 *
 * Items are grouped by catalog model + finish, so six identical dining chairs
 * read as one row with ×6 rather than six near-identical rows. The grouping
 * key is `modelId|color|materialPreset|sizeScale` — two sofas in different
 * colours stay separate rows, because they are two different purchases.
 *
 * Legacy box items (no `modelId`) have no catalog entry, so there is nothing
 * to match a product against. They are still listed — the user placed them and
 * expects to see them — but they don't count toward the shop total.
 */

import React, { useEffect, useMemo, useRef } from "react";
import { Sofa, X, ShoppingBag, Loader2 } from "lucide-react";
import { catalogById, type CatalogItem } from "@/lib/furniture/catalog";
import type { PlacedFurniture } from "@/components/ThreeSceneV2";

export interface FurnitureGroup {
  key: string;
  /** every placed id in this group, in placement order */
  ids: string[];
  /** representative item — all others in the group are equivalent */
  sample: PlacedFurniture;
  cat?: CatalogItem;
  qty: number;
  /** has a catalog entry, so the shop can match products to it */
  shoppable: boolean;
}

/**
 * Group placed furniture for display and for the shop handoff.
 * Exported because the shop page needs the identical grouping — quantities
 * must agree on both sides or the cart totals drift.
 */
export function groupPlacedFurniture(items: PlacedFurniture[]): FurnitureGroup[] {
  const groups = new Map<string, FurnitureGroup>();

  for (const item of items) {
    const cat = item.modelId ? catalogById(item.modelId) : undefined;
    const key = item.modelId
      ? [
          item.modelId,
          item.color ?? "",
          item.materialPreset ?? "",
          item.sizeScale ?? 1,
        ].join("|")
      : `custom:${item.id}`; // legacy boxes never merge — each is its own thing

    const existing = groups.get(key);
    if (existing) {
      existing.ids.push(item.id);
      existing.qty += 1;
    } else {
      groups.set(key, {
        key,
        ids: [item.id],
        sample: item,
        cat,
        qty: 1,
        shoppable: Boolean(cat),
      });
    }
  }

  return [...groups.values()];
}

/** Real-world footprint in cm, accounting for the user's size slider. */
function footprint(group: FurnitureGroup): string | null {
  const scale = group.sample.sizeScale ?? 1;
  if (group.cat) {
    const { w, d } = group.cat.size;
    return `${Math.round(w * scale)}×${Math.round(d * scale)} cm`;
  }
  const { width, depth } = group.sample;
  if (width && depth) {
    return `${Math.round(width * scale)}×${Math.round(depth * scale)} cm`;
  }
  return null;
}

interface Props {
  items: PlacedFurniture[];
  selectedId: string | null;
  /** highlight this item in the 3D scene */
  onSelect: (id: string) => void;
  onClose: () => void;
  /** save the scene, then navigate to the shop */
  onShop: () => void;
  /** true while the scene save is in flight */
  shopBusy?: boolean;
}

export default function FurnitureListPanel({
  items,
  selectedId,
  onSelect,
  onClose,
  onShop,
  shopBusy = false,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => groupPlacedFurniture(items), [items]);
  const shoppableCount = useMemo(
    () => groups.reduce((n, g) => (g.shoppable ? n + g.qty : n), 0),
    [groups],
  );
  const customCount = items.length - shoppableCount;

  // Close on Escape and on click outside.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointer = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    // defer so the click that opened the panel doesn't immediately close it
    const t = setTimeout(() => document.addEventListener("mousedown", onPointer), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      clearTimeout(t);
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Items in this room"
      className="absolute left-0 top-full mt-2 z-40 w-[330px] max-h-[70vh] flex flex-col
                 rounded-xl border border-[#e5e5e5] bg-white shadow-lg shadow-black/5"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#f0f0f0]">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#004643]">
          <Sofa size={13} />
          {items.length} item{items.length !== 1 ? "s" : ""} in this room
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-6 h-6 flex items-center justify-center rounded-full text-[#737373]
                     hover:bg-gray-50 focus-visible:outline focus-visible:outline-2
                     focus-visible:outline-offset-1 focus-visible:outline-[#004643]"
        >
          <X size={13} />
        </button>
      </div>

      {/* List */}
      <ul className="flex-1 overflow-y-auto py-1.5">
        {groups.map((group) => {
          const isSelected = group.ids.includes(selectedId ?? "");
          const size = footprint(group);
          const swatch = group.sample.color ?? group.cat?.color ?? "#d4d4d4";

          return (
            <li key={group.key}>
              <button
                onClick={() => onSelect(group.ids[0])}
                className={`w-full flex items-center gap-3 px-3.5 py-2 text-left transition-colors
                            focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2
                            focus-visible:outline-[#004643]
                            ${isSelected ? "bg-[#f0f7f6]" : "hover:bg-gray-50"}`}
              >
                {/* Thumbnail, or a colour chip when the model has none */}
                <span className="shrink-0 w-10 h-10 rounded-lg border border-[#ececec] bg-[#fafafa] overflow-hidden flex items-center justify-center">
                  {group.cat?.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={group.cat.thumbnail}
                      alt=""
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span
                      className="w-5 h-5 rounded"
                      style={{ backgroundColor: swatch }}
                    />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-medium text-[#262626] truncate">
                    {group.cat?.name ?? group.sample.name}
                  </span>
                  <span className="block text-[10.5px] text-[#a3a3a3] truncate">
                    {size}
                    {!group.shoppable && (size ? " · " : "")}
                    {!group.shoppable && "Custom shape"}
                  </span>
                </span>

                {group.qty > 1 && (
                  <span className="shrink-0 text-[11px] font-semibold text-[#004643] tabular-nums">
                    ×{group.qty}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className="border-t border-[#f0f0f0] px-3.5 py-2.5">
        <button
          onClick={onShop}
          disabled={shoppableCount === 0 || shopBusy}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-full
                     bg-[#004643] text-white text-[12.5px] font-medium
                     hover:bg-[#00332f] transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#004643]
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                     focus-visible:outline-[#004643]"
        >
          {shopBusy ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Saving your room
            </>
          ) : (
            <>
              <ShoppingBag size={13} />
              Shop {shoppableCount} item{shoppableCount !== 1 ? "s" : ""}
            </>
          )}
        </button>

        {customCount > 0 && (
          <p className="mt-2 text-[10.5px] leading-snug text-[#a3a3a3]">
            {customCount} custom shape{customCount !== 1 ? "s" : ""} can&apos;t be
            shopped — swap {customCount !== 1 ? "them" : "it"} for a catalog model
            to buy.
          </p>
        )}
      </div>
    </div>
  );
}