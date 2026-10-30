"use client";

/**
 * NotificationBell — the in-app inbox for customers, vendors and admins
 * ----------------------------------------------------------------------------
 * Reads the signed-in user's notifications (orders, shipments, returns,
 * payouts, approvals, support replies …), shows an unread count, and opens
 * the linked page on click. Refreshes every 45 s and when the tab regains
 * focus, so new ones appear without a reload.
 *
 * `attention` adds live items that aren't stored notifications (e.g. a
 * vendor's overdue orders), shown above the list.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import {
  getNotifications, markNotificationRead, markAllNotificationsRead, type AppNotification,
} from "@/lib/api/notifications";

export interface AttentionItem {
  key: string;
  title: string;
  sub?: string;
  urgent?: boolean;
  onClick: () => void;
}

const POLL_MS = 45_000;

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function NotificationBell({
  attention = [],
  className = "",
  buttonClassName,
  placement = "below-end",
}: {
  attention?: AttentionItem[];
  className?: string;
  /** Override the button look to match the host header. */
  buttonClassName?: string;
  /** Where the panel opens relative to the bell. */
  placement?: "below-end" | "below-start" | "above-start";
}) {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(true);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({});

  const load = useCallback(async () => {
    try {
      const r = await getNotifications();
      if (!r) { setSignedIn(false); return; }
      setSignedIn(true);
      setItems(r.items);
      setUnread(r.unread);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const iv = setInterval(() => { if (document.visibilityState === "visible") void load(); }, POLL_MS);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => { clearTimeout(first); clearInterval(iv); window.removeEventListener("focus", onFocus); };
  }, [load]);

  // Position the panel against the bell (portal, so narrow sidebars and
  // overflow:hidden headers can't clip it).
  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const W = Math.min(360, window.innerWidth - 16);
    if (placement === "above-start") setPos({ bottom: window.innerHeight - r.top + 8, left: Math.min(r.left, window.innerWidth - W - 8) });
    else if (placement === "below-start") setPos({ top: r.bottom + 8, left: Math.min(r.left, window.innerWidth - W - 8) });
    else setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
  }, [placement]);

  useEffect(() => {
    if (!open) return;
    place();
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  const openItem = async (n: AppNotification) => {
    setOpen(false);
    if (!n.is_read) {
      setItems(list => list?.map(x => (x.id === n.id ? { ...x, is_read: true } : x)) ?? null);
      setUnread(u => Math.max(0, u - 1));
      markNotificationRead(n.id).catch(() => undefined);
    }
    if (n.link_url) router.push(n.link_url);
  };

  const readAll = async () => {
    setBusy(true);
    try {
      await markAllNotificationsRead();
      setItems(list => list?.map(x => ({ ...x, is_read: true })) ?? null);
      setUnread(0);
    } catch { /* keep as is */ }
    setBusy(false);
  };

  if (!signedIn && !attention.length) return null;
  const badge = unread + attention.filter(a => a.urgent).length;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => { setOpen(o => !o); if (!open) void load(); }}
        aria-label={badge ? `Notifications, ${badge} unread` : "Notifications"}
        aria-expanded={open}
        className={buttonClassName ?? "relative flex h-[40px] w-[40px] items-center justify-center rounded-[12px] border border-[#e6e6e8] bg-white text-[#343837] hover:bg-neutral-50"}
      >
        <Bell size={17} strokeWidth={1.7} />
        {badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#A0483E] px-1 text-[10px] font-semibold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          style={{ position: "fixed", zIndex: 1000, width: "min(360px, calc(100vw - 16px))", ...pos }}
          className="overflow-hidden rounded-2xl border border-[#EAEDEC] bg-white shadow-[0_16px_40px_-8px_rgba(0,0,0,0.18)]"
        >
          <div className="flex items-center justify-between border-b border-[#F1F4F4] px-4 py-3">
            <span className="text-[14px] font-semibold text-[#101212]">Notifications</span>
            {unread > 0 && (
              <button onClick={readAll} disabled={busy}
                className="flex items-center gap-1 text-[12px] font-medium text-[#004643] hover:underline disabled:opacity-50">
                {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={13} />} Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[min(480px,70vh)] overflow-y-auto">
            {attention.length > 0 && (
              <div className="border-b border-[#F1F4F4] bg-[#FFFBF7] py-1">
                <div className="px-4 pt-2 text-[10.5px] font-semibold uppercase tracking-wide text-[#8E9493]">Needs attention</div>
                {attention.map(a => (
                  <button key={a.key} onClick={() => { setOpen(false); a.onClick(); }}
                    className="block w-full px-4 py-2.5 text-start hover:bg-[#FBF3EC]">
                    <span className={`block text-[13px] font-medium ${a.urgent ? "text-[#812F28]" : "text-[#101212]"}`}>{a.title}</span>
                    {a.sub && <span className="block text-[11.5px] text-[#8E9493]">{a.sub}</span>}
                  </button>
                ))}
              </div>
            )}

            {failed && !items && <p className="px-4 py-6 text-center text-[12.5px] text-[#8E9493]">Couldn&apos;t load notifications.</p>}
            {!failed && items === null && signedIn && (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#004643]" /></div>
            )}
            {items?.length === 0 && !attention.length && (
              <p className="px-4 py-8 text-center text-[12.5px] text-[#8E9493]">You&apos;re all caught up.</p>
            )}
            {items?.map(n => (
              <button key={n.id} onClick={() => void openItem(n)}
                className={`flex w-full gap-3 border-b border-[#F6F7F7] px-4 py-3 text-start last:border-b-0 hover:bg-[#FBFCFC] ${n.is_read ? "" : "bg-[#F3FBFA]"}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-transparent" : "bg-[#004643]"}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13px] leading-snug ${n.is_read ? "text-[#343837]" : "font-semibold text-[#101212]"}`}>{n.title}</span>
                  {n.message && <span className="mt-0.5 line-clamp-2 block whitespace-pre-line text-[12px] leading-snug text-[#646968]">{n.message}</span>}
                  <span className="mt-1 block text-[11px] text-[#8E9493]">{ago(n.created_at)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
