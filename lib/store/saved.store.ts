"use client";

/**
 * Saved for later
 * ----------------------------------------------------------------------------
 * Deliberately separate from cart.store.ts and deliberately local-only.
 *
 * There is no `saved_items` table and no endpoint for one. Putting these rows
 * in `cart_items` would be worse than keeping them here — checkout reads that
 * table and would happily charge for everything a shopper had set aside.
 *
 * Kept in its own store rather than added to the cart store so the two can be
 * edited independently; cart.store.ts is shared with the checkout work.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/lib/store/cart.store";

export type SavedItem = Omit<CartItem, "quantity"> & { quantity: number };

interface SavedStore {
  items: SavedItem[];
  save: (item: SavedItem) => void;
  remove: (variantId: string) => void;
  clear: () => void;
}

export const useSavedStore = create<SavedStore>()(
  persist(
    (set, get) => ({
      items: [],

      save: item =>
        set(state =>
          state.items.some(i => i.variant_id === item.variant_id)
            ? state
            : { items: [...state.items, item] },
        ),

      remove: variantId =>
        set(state => ({ items: state.items.filter(i => i.variant_id !== variantId) })),

      clear: () => set({ items: [] }),
    }),
    { name: "nooi-saved-for-later" },
  ),
);