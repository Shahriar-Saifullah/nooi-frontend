/**
 * Server-only: write in-app notifications from Next.js API routes.
 * ----------------------------------------------------------------------------
 * The same notifications table the Express backend writes to
 * (services/notifications.service.ts there). Never throws — a notification
 * must not fail the action that caused it.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface NotificationInput {
  title: string;
  message: string;
  type: string;
  link?: string | null;
  /** Send even if the person switched this type off (money, account). */
  essential?: boolean;
}

// Must match SWITCHABLE_TYPES in the backend's notifications.service.ts.
const SWITCHABLE = ["order_status", "shipment", "return", "cancellation", "support", "review", "stock", "payout", "listing"];

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export async function notifyUsers(
  client: SupabaseClient,
  userIds: Array<string | null | undefined>,
  n: NotificationInput,
): Promise<void> {
  let ids = [...new Set(userIds.filter((x): x is string => Boolean(x)))];
  if (!ids.length) return;
  try {
    // Respect Profile → Notifications, unless this one is essential.
    if (!n.essential && SWITCHABLE.includes(n.type)) {
      const { data } = await client.from("profiles").select("id, notification_prefs").in("id", ids);
      const muted = new Set(
        (data ?? [])
          .filter((p: { notification_prefs?: Record<string, boolean> | null }) => p.notification_prefs?.[n.type] === false)
          .map((p: { id: string }) => p.id),
      );
      ids = ids.filter((id) => !muted.has(id));
      if (!ids.length) return;
    }
    const { error } = await client.from("notifications").insert(
      ids.map((user_id) => ({
        user_id,
        title: clip(n.title, 140),
        message: clip(n.message || "", 600),
        type: n.type,
        link_url: n.link ?? null,
      })),
    );
    if (error) console.warn("[notify] insert failed:", error.message);
  } catch (e) {
    console.warn("[notify] failed:", e);
  }
}

export async function notifyAdmins(client: SupabaseClient, n: NotificationInput): Promise<void> {
  try {
    const { data } = await client.from("profiles").select("id").in("role", ["admin", "super_admin"]);
    await notifyUsers(client, (data ?? []).map((r: { id: string }) => r.id), n);
  } catch (e) {
    console.warn("[notify] admins failed:", e);
  }
}
