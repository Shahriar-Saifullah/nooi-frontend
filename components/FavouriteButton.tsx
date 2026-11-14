"use client";

/** The heart on library pieces and products (lib/favourites). */

import React from "react";
import { Heart } from "lucide-react";
import { useFavourites, type Favourite } from "@/lib/favourites";

export default function FavouriteButton({
  fav, className = "", size = 14, label = true, arabic = false,
}: {
  fav: Favourite;
  className?: string;
  size?: number;
  /** show "Save" / "Saved" next to the heart */
  label?: boolean;
  arabic?: boolean;
}) {
  const { has, toggle } = useFavourites();
  const on = has(fav);
  const text = on ? (arabic ? "في المفضلة" : "Saved") : (arabic ? "أضف إلى المفضلة" : "Save");
  return (
    <button
      type="button"
      draggable={false}
      onPointerDown={e => e.stopPropagation()}
      onClick={e => { e.preventDefault(); e.stopPropagation(); void toggle(fav); }}
      aria-pressed={on}
      aria-label={on ? (arabic ? "إزالة من المفضلة" : "Remove from favourites") : (arabic ? "أضف إلى المفضلة" : "Add to favourites")}
      title={on ? "Remove from favourites" : "Add to favourites"}
      className={className || `flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] font-medium transition-colors ${
        on ? "border-[#E8B4AE] bg-[#FFF5F4] text-[#B42318]" : "border-[#D5DBDA] bg-white text-[#343837] hover:border-[#E8B4AE]"}`}
    >
      <Heart size={size} className={on ? "fill-[#E5484D] text-[#E5484D]" : ""} />
      {label && <span>{text}</span>}
    </button>
  );
}
