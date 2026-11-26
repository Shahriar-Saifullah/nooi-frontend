"use client";

/**
 * A listing's made-to-measure guidance and private drawings, for the vendor
 * who sells it and for admins (backend checks which). Add and remove files.
 */

import React, { useEffect, useState } from "react";
import DrawingsList from "@/components/factory/DrawingsList";
import { attachListingDrawing, listingDrawings, removeListingDrawing, type Drawing } from "@/lib/api/factory";
import { sizeGuidance, type SizeRanges } from "@/lib/listings/factory";

export default function ListingDrawingsSection({ productId, sizeRanges, sizeNote, className = "" }: {
  productId: string;
  sizeRanges?: SizeRanges | null;
  sizeNote?: string | null;
  className?: string;
}) {
  const [drawings, setDrawings] = useState<Drawing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    listingDrawings(productId).then(d => alive && setDrawings(d)).catch(e => alive && setError(e instanceof Error ? e.message : "Could not load drawings."));
    return () => { alive = false; };
  }, [productId]);
  const guide = sizeGuidance(sizeRanges);

  return (
    <section className={`rounded-2xl border border-[#D5DBDA] bg-white p-5 text-[12.5px] ${className}`}>
      <h2 className="text-[13px] font-medium text-[#101212]">For factories</h2>
      {sizeRanges !== undefined && (
        <div className="mt-2 grid grid-cols-[140px_1fr] gap-y-1.5">
          <span className="text-[#8E9493]">Usual sizes</span><span>{guide.length ? guide.join(" · ") : "—"}</span>
          <span className="text-[#8E9493]">Size note</span><span className="whitespace-pre-wrap">{sizeNote || "—"}</span>
        </div>
      )}
      <div className="mt-3 text-[11.5px] text-[#8E9493]">Drawings (private)</div>
      <div className="mt-1.5">
        {error && <p className="text-[#B91C1C]">{error}</p>}
        {!drawings && !error && <p className="text-[#8E9493]">Loading…</p>}
        {drawings && (
          <DrawingsList
            drawings={drawings}
            onAdd={async f => setDrawings(await attachListingDrawing(productId, f))}
            onRemove={async d => setDrawings(await removeListingDrawing(productId, d.path))}
          />
        )}
      </div>
    </section>
  );
}
