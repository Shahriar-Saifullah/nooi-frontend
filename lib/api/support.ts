import { requestApi, type ApiResponse } from "./http";
import { createClient } from "@/utils/supabase/client";

/**
 * Support tickets — customer and vendor side (backend /support, nested
 * { success, data } envelope).
 */

export type TicketStatus = "open" | "waiting" | "resolved";
export const SUPPORT_CATEGORIES = [
  { key: "order", label: "An order" },
  { key: "payment", label: "Payment or refund" },
  { key: "return", label: "Return" },
  { key: "listing", label: "My listings" },
  { key: "payout", label: "Payouts" },
  { key: "account", label: "My account" },
  { key: "general", label: "Something else" },
] as const;

export interface MyTicket {
  id: string;
  number: number;
  subject: string;
  category: string;
  status: TicketStatus;
  order_id: string | null;
  requester_unread: boolean;
  last_message_at: string;
  created_at: string;
}
/** A photo on a message. `url` is a signed link valid for about an hour. */
export interface SupportAttachment { path: string; name: string; size: number; width: number; height: number; url: string | null }
export interface SupportMessage { id: string; author_role: "customer" | "vendor" | "admin"; body: string; attachments?: SupportAttachment[]; created_at: string }

export const MAX_SUPPORT_PHOTOS = 5;
export const MAX_SUPPORT_PHOTO_BYTES = 10 * 1024 * 1024;

/** POST multipart (text fields + photos[]) and read the usual envelope. */
export async function postWithPhotos<T>(path: string, fields: Record<string, string | null | undefined>, photos: File[]): Promise<ApiResponse<T>> {
  try {
    const token = (await createClient().auth.getSession()).data.session?.access_token;
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) if (v != null) form.append(k, v);
    for (const p of photos) form.append("photos", p, p.name);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}${path}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
      credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) return { success: false, error: json.error || `Request failed (${res.status})` };
    return { success: true, data: (json.data ?? {}) as T, message: json.message };
  } catch {
    return { success: false, error: "Network error — please try again." };
  }
}

export function listMyTickets(): Promise<ApiResponse<{ tickets: MyTicket[] }>> {
  return requestApi({ path: "/support/tickets", method: "GET" });
}
export function createTicket(input: { subject: string; category: string; body: string; order_id?: string | null }, photos: File[] = []): Promise<ApiResponse<{ ticket: { id: string; number: number } }>> {
  if (photos.length) return postWithPhotos("/support/tickets", input, photos);
  return requestApi({ path: "/support/tickets", method: "POST", body: input });
}
export function getMyTicket(id: string): Promise<ApiResponse<{ ticket: MyTicket & { orders: { order_number: string } | null }; messages: SupportMessage[] }>> {
  return requestApi({ path: `/support/tickets/${encodeURIComponent(id)}`, method: "GET" });
}
export function replyToTicket(id: string, body: string, photos: File[] = []): Promise<ApiResponse<unknown>> {
  const path = `/support/tickets/${encodeURIComponent(id)}/messages`;
  if (photos.length) return postWithPhotos(path, { body }, photos);
  return requestApi({ path, method: "POST", body: { body } });
}
