"use client";

/**
 * FurnitureLibrary — right-panel browser for the GLTF model catalog
 * ------------------------------------------------------------------
 * Real model thumbnails (runtime-generated), category chips, text search.
 * Items are HTML5 drag sources: drop them on the 3D canvas to place.
 * Click also works as a fallback (places at the scene centre).
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  FURNITURE_CATALOG, CATEGORY_LABELS, type CatalogItem,
  type FurnitureCategory,
} from "@/lib/furniture/catalog";
import { getThumbnail } from "@/lib/furniture/thumbnails";

export const DND_MIME = "application/x-nooi-furniture";

function Thumb({ item }: { item: CatalogItem }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getThumbnail(item).then(u => { if (alive) setSrc(u); });
    return () => { alive = false; };
  }, [item]);
  return (
    <div className="w-full aspect-square rounded-lg bg-gray-50 border border-gray-100
                    flex items-center justify-center overflow-hidden">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={item.name} className="w-full h-full object-contain" />
      ) : (
        <div className="w-8 h-8 rounded animate-pulse"
             style={{ backgroundColor: item.color }} />
      )}
    </div>
  );
}

interface Props {
  onQuickAdd?: (item: CatalogItem) => void; // click fallback (centre placement)
}

export default function FurnitureLibrary({ onQuickAdd }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FurnitureCategory | "all">("all");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FURNITURE_CATALOG.filter(i => {
      if (category !== "all" && i.category !== category) return false;
      if (!q) return true;
      return i.name.toLowerCase().includes(q) ||
             i.tags.some(t => t.includes(q)) ||
             i.category.includes(q);
    });
  }, [query, category]);

  const grouped = useMemo(() => {
    const g = new Map<FurnitureCategory, CatalogItem[]>();
    items.forEach(i => {
      if (!g.has(i.category)) g.set(i.category, []);
      g.get(i.category)!.push(i);
    });
    return g;
  }, [items]);

  const cats: Array<FurnitureCategory | "all"> =
    ["all", ...Object.keys(CATEGORY_LABELS) as FurnitureCategory[]];

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="text-xs text-teal-800 bg-teal-50 border border-teal-100
                      rounded-lg px-3 py-2">
        Drag items into the 3D scene →
      </div>

      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search furniture..."
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-teal-500/40"
      />

      <div className="flex gap-1.5 flex-wrap">
        {cats.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border
              ${category === c
                ? "bg-teal-700 text-white border-teal-700"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
          >
            {c === "all" ? "All" : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-1 -mr-1">
        {[...grouped.entries()].map(([cat, list]) => (
          <div key={cat} className="mb-4">
            <div className="text-[11px] font-semibold tracking-wide text-gray-400
                            uppercase mb-2">
              {CATEGORY_LABELS[cat]}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {list.map(item => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData(DND_MIME, item.id);
                    e.dataTransfer.setData("text/plain", item.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => onQuickAdd?.(item)}
                  className="rounded-xl border border-gray-100 bg-white p-2
                             cursor-grab active:cursor-grabbing
                             hover:border-teal-300 hover:shadow-sm transition"
                  title={`Drag into the scene — ${item.size.w}×${item.size.d} cm`}
                >
                  <Thumb item={item} />
                  <div className="mt-1.5 text-[12px] font-medium text-gray-800
                                  leading-tight">{item.name}</div>
                  <div className="text-[10px] text-gray-400">
                    {item.size.w}×{item.size.d} cm
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-gray-400 text-center py-8">
            No furniture matches "{query}"
          </div>
        )}
      </div>
    </div>
  );
}