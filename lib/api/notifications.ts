/**
 * In-app notifications — GET /notifications, PATCH /notifications/:id/read,
 * PATCH /notifications/read-all on the Express backend. Customers, vendors and
 * admins all use the same endpoints; each sees only their own.
 */

import { createClient } from "@/utils/supabase/client";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}

async function call<T>(path: string, method: "GET" | "PATCH" = "GET"): Promise<T | null> {
  const supabase = createClient();
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) return null; // signed out: nothing to show
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Notifications request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export async function getNotifications(limit = 30): Promise<{ items: AppNotification[]; unread: number } | null> {
  const json = await call<{ notifications: AppNotification[]; unread_count: number }>(`/notifications?limit=${limit}`);
  if (!json) return null;
  return { items: json.notifications ?? [], unread: json.unread_count ?? 0 };
}

export const markNotificationRead = (id: string) => call(`/notifications/${encodeURIComponent(id)}/read`, "PATCH");
export const markAllNotificationsRead = () => call(`/notifications/read-all`, "PATCH");

// ─── Preferences (Profile → Notifications) ───────────────────────────────────

export type NotificationPrefs = Record<string, boolean>;

async function prefsCall(method: "GET" | "PUT", body?: unknown): Promise<NotificationPrefs> {
  const supabase = createClient();
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) throw new Error("Please sign in again.");
  const res = await fetch(`${BASE_URL}/profile/notification-preferences`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.error || "Could not save your notification settings.");
  return json.data.prefs as NotificationPrefs;
}

export const getNotificationPrefs = () => prefsCall("GET");
export const updateNotificationPrefs = (prefs: NotificationPrefs) => prefsCall("PUT", { prefs });
