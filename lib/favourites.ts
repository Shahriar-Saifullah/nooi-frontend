/**
 * Favourites — lib/favourites.ts
 * ============================================================================
 * Library pieces and marketplace products the user hearts. Signed in: kept on
 * the server (GET/PUT /favourites), so they follow the user across devices.
 * Signed out: kept in this browser, and merged into the account on the next
 * signed-in load.
 *
 * A vendor piece in the canvas library ("shop:<productId>") is the same thing
 * as the product, so it is stored as a product favourite.
 */

import { useSyncExternalStore } from "react";
import { requestApi } from "@/lib/api/http";

export type FavouriteKind = "library" | "product";
export interface Favourite { kind: FavouriteKind; ref: string }

const LOCAL_KEY = "nooi-favourites";
const SHOP_PREFIX = "shop:";

/** A catalogue id → what is stored ("shop:<id>" is the product). */
export function favouriteFor(catalogId: string): Favourite {
  return catalogId.startsWith(SHOP_PREFIX)
    ? { kind: "product", ref: catalogId.slice(SHOP_PREFIX.length) }
    : { kind: "library", ref: catalogId };
}

const keyOf = (f: Favourite) => `${f.kind}:${f.ref}`;

let favs = new Set<string>();
let loaded = false;
let signedIn = false;
const listeners = new Set<() => void>();
const emit = () => { favs = new Set(favs); listeners.forEach(l => l()); };

function readLocal(): Favourite[] {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(v) ? v.filter((x): x is Favourite => x && (x.kind === "library" || x.kind === "product") && typeof x.ref === "string") : [];
  } catch { return []; }
}
function writeLocal() {
  try {
    const list = [...favs].map(k => { const i = k.indexOf(":"); return { kind: k.slice(0, i), ref: k.slice(i + 1) }; });
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, 300)));
  } catch { /* private mode */ }
}

async function load() {
  if (loaded) return;
  loaded = true;
  const local = readLocal();
  const res = await requestApi<{ items: Favourite[] }>({ path: "/favourites", method: "GET" });
  if (res.success) {
    signedIn = true;
    let items = res.data.items;
    if (local.length) {
      const merged = await requestApi<{ items: Favourite[] }>({ path: "/favourites/merge", method: "POST", body: { items: local } });
      if (merged.success) {
        items = merged.data.items;
        try { localStorage.removeItem(LOCAL_KEY); } catch { /* ignore */ }
      }
    }
    favs = new Set(items.map(keyOf));
  } else {
    favs = new Set(local.map(keyOf));
  }
  emit();
}

export async function toggleFavourite(f: Favourite): Promise<void> {
  const k = keyOf(f);
  const on = !favs.has(k);
  if (on) favs.add(k); else favs.delete(k);
  emit();
  if (!signedIn) { writeLocal(); return; }
  const res = await requestApi({ path: "/favourites", method: "PUT", body: { ...f, on } });
  if (!res.success) {
    // put it back the way it was
    if (on) favs.delete(k); else favs.add(k);
    emit();
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  void load();
  return () => { listeners.delete(l); };
};
const snapshot = () => favs;
const EMPTY = new Set<string>();

/** Live favourites. `has(kind, ref)` and the refs of one kind. */
export function useFavourites() {
  const set = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const has = (f: Favourite) => set.has(keyOf(f));
  const refs = (kind: FavouriteKind) => [...set].filter(k => k.startsWith(`${kind}:`)).map(k => k.slice(kind.length + 1));
  return { has, refs, toggle: toggleFavourite, count: set.size };
}
