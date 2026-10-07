"use client";

/**
 * Order intervention — A5
 * ----------------------------------------------------------------------------
 * Find an order, see what has already been done to it, and act.
 *
 * Two actions, deliberately different in weight:
 *
 *   Override status  changes a label. Any admin.
 *   Cancel order     refunds the customer, restores stock, stops every
 *                    shipment. Super admin only — the backend enforces it and
 *                    this screen does not offer the button otherwise, because a
 *                    button that always returns 403 is worse than no button.
 *
 * Both demand a reason before the action is available. An intervention without
 * one is indistinguishable from a mistake six weeks later, when someone asks
 * why an order was cancelled and the record says only that it was.
 *
 * The interventions panel shows what previous admins have already done. Acting
 * twice on the same order is the common failure here — two people answering the
 * same angry email an hour apart.
 */

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, ArrowLeft, Loader2, AlertCircle, AlertTriangle, Check, Info,
  ShoppingBag, Package, History, ShieldAlert, X,
} from "lucide-react";

import AdminShell from "@/components/admin/AdminShell";
import {
  searchOrders, getOrderForIntervention, overrideOrderStatus, cancelOrderAsAdmin,
  type OrderSearchRow, type OrderIntervention,
} from "@/lib/api/admin";

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-[#E7FBEB] text-[#28603A]",
  processing: "bg-[#F3FEFD] text-[#004643]",
  fulfilled: "bg-[#E7FBEB] text-[#28603A]",
  cancelling: "bg-[#FFFBF2] text-[#8a6d1f]",
  cancelled: "bg-[#FFFAF9] text-[#812F28]",
  refunded: "bg-[#FFFAF9] text-[#812F28]",
};

const OVERRIDE_OPTIONS = [
  { value: "processing", label: "Processing", hint: "Being prepared by vendors" },
  { value: "paid", label: "Paid", hint: "Payment confirmed, not yet dispatched" },
  { value: "fulfilled", label: "Fulfilled", hint: "Everything has been delivered" },
];

function money(v: number): string {
  return `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// ─── Search ──────────────────────────────────────────────────────────────────

function OrderSearch({ onOpen }: { onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<OrderSearchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      searchOrders(q.trim() || undefined)
        .then(res => {
          if (cancelled) return;
          if (res.success) { setRows(res.data.orders); setError(null); }
          else setError(typeof res.error === "string" ? res.error : "Could not search orders.");
        })
        .catch(() => !cancelled && setError("Could not search orders."))
        .finally(() => !cancelled && setLoading(false));
    }, q ? 300 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  return (
    <div className="px-6 py-7 lg:px-10">
      <div>
        <h1 className="text-[24px] text-[#101212]">Orders</h1>
        <p className="mt-1 text-[12.5px] text-[#646968]">
          Search by order number or customer email.
        </p>
      </div>

      <span className="relative mt-6 block max-w-[420px]">
        <Search size={14} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[#8E9493]" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="NOOI-379763 or customer@email.com"
          className="w-full rounded-full border border-[#D5DBDA] bg-white py-2 ps-9 pe-3 text-[13px] placeholder:text-[#B3B9B9] focus:border-[#87DDD7] focus:outline-none"
        />
      </span>

      {error && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#812F28]/25 bg-[#FFFAF9] p-3.5 text-[12.5px] text-[#812F28]">
          <AlertCircle size={15} className="mt-px shrink-0" />{error}
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#D5DBDA] bg-white">
        <div className="hidden grid-cols-[1.4fr_1.4fr_0.8fr_0.8fr] gap-4 border-b border-[#E6EBEA] bg-[#FBFCFC] px-5 py-2.5 text-[11px] font-medium uppercase tracking-wide text-[#8E9493] lg:grid">
          <span>Order</span>
          <span>Vendors</span>
          <span>Value</span>
          <span>Status</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="h-4 w-4 animate-spin text-[#8E9493]" />
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="px-5 py-14 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F4F4] text-[#B3B9B9]">
              <ShoppingBag size={20} strokeWidth={1.25} />
            </span>
            <div className="text-[14px] font-medium text-[#101212]">
              {q ? `No orders match "${q}"` : "No orders yet"}
            </div>
            {q && (
              <button
                onClick={() => setQ("")}
                className="mt-4 rounded-full border border-[#D5DBDA] bg-white px-4 py-1.5 text-[12.5px] font-medium text-[#004643] hover:bg-[#F1F4F4]"
              >
                Clear search
              </button>
            )}
          </div>
        )}

        {!loading && rows.map(o => (
          <button
            key={o.id}
            onClick={() => onOpen(o.id)}
            className="grid w-full grid-cols-1 gap-1 border-b border-[#F1F4F4] px-5 py-3.5 text-start transition-colors last:border-b-0 hover:bg-[#FBFCFC] lg:grid-cols-[1.4fr_1.4fr_0.8fr_0.8fr] lg:items-center lg:gap-4"
          >
            <span className="min-w-0">
              <span className="block truncate font-mono text-[12.5px] font-medium text-[#101212]">
                {o.order_number}
              </span>
              <span className="block truncate text-[11px] text-[#8E9493]">
                {o.customer_name ?? "—"}
              </span>
            </span>

            <span className="truncate text-[12px] text-[#4B4F4F]">
              {o.vendors.length > 0 ? o.vendors.join(", ") : "—"}
            </span>

            <span className="text-[12.5px] tabular-nums text-[#101212]">
              {money(o.total_amount)}
            </span>

            <span className="flex items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium capitalize ${STATUS_STYLE[o.status] ?? "bg-[#F1F4F4] text-[#646968]"}`}>
                {o.status}
              </span>
              {o.intervened_at && (
                <span title="Has been intervened on" className="text-[#8a6d1f]">
                  <History size={11} />
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Detail ──────────────────────────────────────────────────────────────────

function OrderDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<OrderIntervention | null>(null);
  const [loading, setLoading] = useState(true);
  /** Why the page could not load. Cleared by a successful load. */
  const [error, setError] = useState<string | null>(null);
  /**
   * Why an action failed. Deliberately separate: every action reloads the
   * order afterwards, and a successful reload would otherwise clear the very
   * message explaining why the action didn't work — leaving the admin looking
   * at an unchanged screen with no idea what happened.
   */
  const [actionError, setActionError] = useState<string | null>(null);

  const [mode, setMode] = useState<"none" | "override" | "cancel">("none");
  const [newStatus, setNewStatus] = useState("processing");
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOrderForIntervention(id);
      if (res.success) { setData(res.data); setError(null); }
      else setError(typeof res.error === "string" ? res.error : "Could not load this order.");
    } catch {
      setError("Could not load this order.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const reset = useCallback(() => { setMode("none"); setNote(""); }, []);

  const doOverride = useCallback(async () => {
    if (!note.trim()) return;
    setWorking(true);
    setActionError(null);
    try {
      const res = await overrideOrderStatus(id, newStatus, note.trim());
      if (!res.success) {
        setActionError(typeof res.error === "string" ? res.error : "Could not change the status.");
        await load();
        return;
      }
      setDone(`Status set to ${newStatus}.`);
      reset();
      await load();
    } catch {
      setActionError("Could not change the status.");
    } finally {
      setWorking(false);
    }
  }, [id, newStatus, note, load, reset]);

  const doCancel = useCallback(async () => {
    if (!note.trim()) return;
    setWorking(true);
    setActionError(null);
    try {
      const res = await cancelOrderAsAdmin(id, note.trim());
      if (!res.success) {
        const e: any = res.error;
        setActionError(
          String(e).includes("already_handled")
            ? "Someone else handled this while you were reading."
            : typeof e === "string" ? e : "Could not cancel this order.",
        );
        await load();
        return;
      }
      setDone(
        res.data.refunded > 0
          ? `Order cancelled and ${money(res.data.refunded)} refunded.`
          : "Order cancelled.",
      );
      reset();
      await load();
    } catch {
      setActionError("Could not cancel this order.");
    } finally {
      setWorking(false);
    }
  }, [id, note, load, reset]);

  if (loading) {
    return <div className="flex items-center justify-center px-6 py-24">
      <Loader2 className="h-5 w-5 animate-spin text-[#004643]" />
    </div>;
  }

  if (!data) {
    return (
      <div className="px-6 py-10 lg:px-10">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] text-[#646968] hover:text-[#004643]">
          <ArrowLeft size={13} /> Orders
        </button>
        <p className="mt-6 text-[13px] text-[#812F28]">{error ?? "Not found"}</p>
      </div>
    );
  }

  const o: any = data.order;
  const items: any[] = o.order_items ?? [];
  const shipments: any[] = o.order_shipments ?? [];
  const settled = o.status === "cancelled" || o.status === "refunded";

  return (
    <div className="px-6 py-7 lg:px-10">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] text-[#646968] transition-colors hover:text-[#004643]">
        <ArrowLeft size={13} /> Orders
      </button>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-[11.5px] text-[#8E9493]">
            Placed {fmtWhen(o.created_at)} · {money(o.total_amount)}
          </span>
          <h1 className="mt-0.5 font-mono text-[24px] text-[#101212]">{o.order_number}</h1>
          <span className="text-[12.5px] text-[#646968]">
            {o.customer_name ?? "—"}
            {o.shipping_address?.city ? ` · ${o.shipping_address.city}` : ""}
          </span>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11.5px] font-medium capitalize ${STATUS_STYLE[o.status] ?? "bg-[#F1F4F4] text-[#646968]"}`}>
          {o.status}
        </span>
      </div>

      <div className="mt-5 space-y-2.5">
        {done && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#28603A]/25 bg-[#E7FBEB] p-3.5 text-[12.5px] text-[#28603A]">
            <Check size={15} className="mt-px shrink-0" strokeWidth={3} />{done}
          </div>
        )}

        {(error || actionError) && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#812F28]/25 bg-[#FFFAF9] p-3.5 text-[12.5px] text-[#812F28]">
            <AlertCircle size={15} className="mt-px shrink-0" />{actionError ?? error}
          </div>
        )}

        {data.already_refunded_count > 0 && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#8a6d1f]/25 bg-[#FFFBF2] p-3.5 text-[12.5px] text-[#4B4F4F]">
            <AlertTriangle size={15} className="mt-px shrink-0 text-[#8a6d1f]" />
            <span>
              {data.already_refunded_count} item
              {data.already_refunded_count === 1 ? " has" : "s have"} already been
              refunded on this order. Cancelling refunds only what is left.
            </span>
          </div>
        )}

        {o.cancel_refund_id && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#D5DBDA] bg-white p-3.5 text-[12.5px] text-[#4B4F4F]">
            <Info size={15} className="mt-px shrink-0 text-[#646968]" />
            <span>
              Cancelled{o.intervened_at ? ` at ${fmtWhen(o.intervened_at)}` : ""}.
              <span className="mt-0.5 block font-mono text-[11px] text-[#8E9493]">
                {o.cancel_refund_id}
              </span>
              {o.intervention_note && (
                <span className="mt-1 block text-[#646968]">{o.intervention_note}</span>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {/* Items */}
          <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5">
            <h2 className="text-[13px] font-medium text-[#101212]">
              Items · {items.length}
            </h2>
            <div className="mt-3 divide-y divide-[#F1F4F4]">
              {items.map(it => (
                <div key={it.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E6EBEA] bg-[#F1F4F4]">
                    {it.product_variants?.images?.[0]
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={it.product_variants.images[0]} alt="" className="h-full w-full object-cover" />
                      : <Package size={13} className="text-[#B3B9B9]" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] text-[#101212]">
                      {it.product_variants?.products?.title ?? "Item"}
                    </span>
                    <span className="block text-[11px] text-[#8E9493]">
                      {it.retailers?.name ?? "—"} · qty {it.quantity} · {money(it.total_price)}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium capitalize ${
                    it.item_status === "cancelled" || it.item_status === "returned"
                      ? "bg-[#FFFAF9] text-[#812F28]"
                      : "bg-[#F1F4F4] text-[#646968]"
                  }`}>
                    {it.item_status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Shipments */}
          <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5">
            <h2 className="text-[13px] font-medium text-[#101212]">
              Shipments · {shipments.length}
            </h2>
            <div className="mt-3 divide-y divide-[#F1F4F4]">
              {shipments.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] text-[#101212]">
                      {s.retailers?.name ?? "Vendor"}
                    </span>
                    {s.tracking_number && (
                      <span className="block font-mono text-[11px] text-[#8E9493]">
                        {s.carrier_code ? `${s.carrier_code} · ` : ""}{s.tracking_number}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 rounded-full bg-[#F1F4F4] px-2 py-0.5 text-[10.5px] font-medium text-[#646968]">
                    {String(s.shipment_status).replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* What has already been done */}
          {data.interventions.length > 0 && (
            <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5">
              <h2 className="flex items-center gap-2 text-[13px] font-medium text-[#101212]">
                <History size={14} className="text-[#646968]" />
                Interventions on this order
              </h2>
              <div className="mt-3 divide-y divide-[#F1F4F4]">
                {data.interventions.map(a => (
                  <div key={a.id} className="py-2.5">
                    <span className="block text-[12.5px] text-[#101212]">{a.summary ?? a.action}</span>
                    <span className="block text-[11px] text-[#8E9493]">
                      {a.actor_email ?? "system"} · {fmtWhen(a.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Intervene */}
        <div>
          <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5 lg:sticky lg:top-7">
            <h2 className="text-[13px] font-medium text-[#101212]">Intervene</h2>

            {settled ? (
              <p className="mt-2 text-[12.5px] text-[#8E9493]">
                This order is {o.status}. Nothing further can be done from here.
              </p>
            ) : mode === "none" ? (
              <>
                <button
                  onClick={() => { setMode("override"); setNote(""); }}
                  className="mt-3 w-full rounded-full border border-[#D5DBDA] bg-white py-2.5 text-[12.5px] font-medium text-[#004643] hover:bg-[#F1F4F4]"
                >
                  Override status
                </button>

                {data.viewer_can_cancel ? (
                  <button
                    onClick={() => { setMode("cancel"); setNote(""); }}
                    className="mt-2 w-full rounded-full border border-[#812F28]/30 bg-white py-2.5 text-[12.5px] font-medium text-[#812F28] hover:bg-[#FFFAF9]"
                  >
                    Cancel order
                  </button>
                ) : (
                  // The backend refuses this anyway; a button that always 403s
                  // is worse than an explanation.
                  <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-[#FBFCFC] p-3 text-[11.5px] text-[#646968]">
                    <ShieldAlert size={12} className="mt-px shrink-0 text-[#8E9493]" />
                    Your role can view and override orders but not cancel them. A
                    super admin can.
                  </p>
                )}

                <p className="mt-3 text-[11px] text-[#8E9493]">
                  Every action is saved to the audit log with your name, the time
                  and your reason.
                </p>
              </>
            ) : mode === "override" ? (
              <>
                <fieldset className="mt-3">
                  <legend className="sr-only">New status</legend>
                  <div className="space-y-1.5">
                    {OVERRIDE_OPTIONS.map(opt => (
                      <label
                        key={opt.value}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 text-[12.5px] transition-colors ${
                          newStatus === opt.value
                            ? "border-[#87DDD7] bg-[#F3FEFD]"
                            : "border-[#E6EBEA] hover:bg-[#FBFCFC]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="new-status"
                          checked={newStatus === opt.value}
                          onChange={() => setNewStatus(opt.value)}
                          className="sr-only"
                        />
                        <span className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                          newStatus === opt.value ? "border-[#004643] bg-[#004643]" : "border-[#D5DBDA]"
                        }`}>
                          {newStatus === opt.value && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </span>
                        <span>
                          <span className="block font-medium text-[#101212]">{opt.label}</span>
                          <span className="block text-[11px] text-[#8E9493]">{opt.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <NoteField value={note} onChange={setNote} label="Why are you changing this?" />

                <Actions
                  working={working}
                  disabled={!note.trim()}
                  confirmLabel="Change status"
                  onCancel={reset}
                  onConfirm={doOverride}
                />
              </>
            ) : (
              <>
                <div className="mt-3 rounded-xl border border-[#812F28]/25 bg-[#FFFAF9] p-3 text-[12.5px] text-[#4B4F4F]">
                  <strong className="block text-[#812F28]">This cannot be undone.</strong>
                  <span className="mt-1 block text-[11.5px]">
                    The customer is refunded whatever has not already been
                    returned, stock goes back on the shelf, and every shipment
                    that has not arrived is stopped.
                  </span>
                </div>

                <NoteField value={note} onChange={setNote} label="Why is this order being cancelled? The customer sees this." />

                <Actions
                  working={working}
                  disabled={!note.trim()}
                  confirmLabel="Cancel order"
                  destructive
                  onCancel={reset}
                  onConfirm={doCancel}
                />
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function NoteField({
  value, onChange, label,
}: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="mt-3 block">
      <span className="text-[11.5px] font-medium text-[#101212]">{label}</span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        className="mt-1.5 w-full resize-none rounded-xl border border-[#D5DBDA] px-3 py-2 text-[12.5px] placeholder:text-[#B3B9B9] focus:border-[#87DDD7] focus:outline-none"
      />
    </label>
  );
}

function Actions({
  working, disabled, confirmLabel, destructive = false, onCancel, onConfirm,
}: {
  working: boolean;
  disabled: boolean;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-3 flex gap-2">
      <button
        onClick={onCancel}
        disabled={working}
        className="flex-1 rounded-full border border-[#D5DBDA] bg-white py-2.5 text-[12.5px] font-medium text-[#343837] hover:bg-[#F1F4F4] disabled:opacity-50"
      >
        Back
      </button>
      <button
        onClick={onConfirm}
        disabled={working || disabled}
        className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-[12.5px] font-medium text-white disabled:opacity-40 ${
          destructive ? "bg-[#812F28] hover:bg-[#6b2721]" : "bg-[#004643] hover:bg-[#003836]"
        }`}
      >
        {working && <Loader2 size={13} className="animate-spin" />}
        {confirmLabel}
      </button>
    </div>
  );
}

function OrdersInner() {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("id");

  return selected
    ? <OrderDetail id={selected} onBack={() => router.push("/admin/orders")} />
    : <OrderSearch onOpen={id => router.push(`/admin/orders?id=${encodeURIComponent(id)}`)} />;
}

export default function AdminOrdersPage() {
  return (
    <AdminShell>
      <Suspense fallback={<div className="px-6 py-20" />}>
        <OrdersInner />
      </Suspense>
    </AdminShell>
  );
}