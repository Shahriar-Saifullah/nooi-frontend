/**
 * Cart API client
 * ----------------------------------------------------------------------------
 * The cart lives in zustand/localStorage for responsiveness, but
 * checkout.service.ts reads `cart_items` from the database — it never sees the
 * local one. Without a push before checkout, a shopper with a full cart gets
 * "your cart is empty" at the payment step.
 *
 * So: local is the source of truth while shopping, and `pushLocalCart` makes
 * the server match immediately before checkout. One reconciliation point rather
 * than a write on every quantity tap, which keeps the UI instant and avoids
 * half-synced states if the network drops mid-session.
 *
 * Guest carts are deliberately not pushed. `cart_items` currently has an RLS
 * policy of `auth.uid() = user_id OR session_id IS NOT NULL`, which makes every
 * guest row readable and writable by anyone holding the anon key. Since
 * checkout requires auth anyway, a guest cart has nowhere to go — it stays
 * local until they sign in.
 */

import { createClient } from "@/utils/supabase/client";
import type { CartItem } from "@/lib/store/cart.store";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ServerCartItem {
  id: string;
  user_id: string | null;
  session_id: string | null;
  variant_id: string;
  quantity: number;
}

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("NOT_AUTHENTICATED");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Cart request failed (${res.status}): ${path} ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function getServerCart(): Promise<ServerCartItem[]> {
  const json = await call<{ success: boolean; items: ServerCartItem[] }>("/cart/items");
  return json.items ?? [];
}

async function addServerItem(variantId: string, quantity: number) {
  return call("/cart/items", {
    method: "POST",
    body: JSON.stringify({ variant_id: variantId, quantity }),
  });
}

async function setServerQuantity(id: string, quantity: number) {
  return call(`/cart/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

async function removeServerItem(id: string) {
  return call(`/cart/items/${id}`, { method: "DELETE" });
}

/**
 * Make the server cart match the local one, then return what the server holds.
 *
 * Reconciles rather than clearing and re-adding: quantities are updated in
 * place, extras removed, missing ones added. Clearing first would leave the
 * shopper with no cart at all if the network died halfway.
 *
 * Throws NOT_AUTHENTICATED if there is no session — the caller should send them
 * to sign in rather than to a checkout that cannot work.
 */
export async function pushLocalCart(local: CartItem[]): Promise<ServerCartItem[]> {
  const server = await getServerCart();
  const byVariant = new Map(server.map(i => [i.variant_id, i]));

  for (const item of local) {
    const existing = byVariant.get(item.variant_id);
    if (!existing) {
      await addServerItem(item.variant_id, item.quantity);
    } else if (existing.quantity !== item.quantity) {
      await setServerQuantity(existing.id, item.quantity);
    }
    byVariant.delete(item.variant_id);
  }

  // Anything still mapped was removed locally and should go server-side too.
  for (const orphan of byVariant.values()) {
    await removeServerItem(orphan.id);
  }

  return getServerCart();
}