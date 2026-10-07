"use client";

/**
 * Returns and refunds — A4
 * ----------------------------------------------------------------------------
 * Full-item refunds only in v1, per the design.
 *
 * The amount is never editable here, and that is deliberate rather than a
 * simplification. The figure comes from the order item in the database; the
 * client sends only a decision. A refund amount a browser could name is a
 * refund amount a browser could choose.
 *
 * Refunding asks for confirmation. Every other decision in this console is
 * reversible or merely administrative — this one sends money, and Stripe will
 * not give it back. The confirm step names the amount and the customer so the
 * last thing an admin reads before paying is what they are paying.
 */

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, ArrowLeft, Loader2, AlertCircle, AlertTriangle, Check, X,
  Package, RotateCcw, Info, Clock,
} from "lucide-react";

import AdminShell from "@/components/admin/AdminShell";
import {
  getReturnsQueue, getReturnForReview, refundReturn, declineReturn,
  type ReturnRow, type ReturnCounts, type ReturnDetail,
} from "@/lib/api/admin";

const TABS = [
  { key: "requested", label: "Waiting" },
  { key: "done", label: "Decided" },
  { key: "all", label: "All" },
] as const;

const STATUS_STYLE: Record<string, string> = {
  requested: "bg-[#F1F4F4] text-[#646968]",
  refunding: "bg-[#F3FEFD] text-[#004643]",
  refunded: "bg-[#E7FBEB] text-[#28603A]",
  declined: "bg-[#FFFAF9] text-[#812F28]",
};

function money(v: number): string {
  return `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ageLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "today";
  return `${days} day${days === 1 ? "" : "s"}`;
}

function fmtWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// ─── Queue ───────────────────────────────────────────────────────────────────

function Queue({ onOpen }: { onOpen: (id: string) => void }) {
  const [tab, setTab] = useState<string>("requested");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [counts, setCounts] = useState<ReturnCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      getReturnsQueue({ tab, search: search.trim() || undefined })
        .then(res => {
          if (cancelled) return;
          if (res.success) { setRows(res.data.returns); setCounts(res.data.counts); setError(null); }
          else setError(typeof res.error === "string" ? res.error : "Could not load returns.");
        })
        .catch(() => !cancelled && setError("Could not load returns."))
        .finally(() => !cancelled && setLoading(false));
    }, search ? 300 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [tab, search]);

  return (
    <div className="px-6 py-7 lg:px-10">
      <div>
        <h1 className="text-[24px] text-[#101212]">Returns and refunds</h1>
        <p className="mt-1 text-[12.5px] text-[#646968]">Full-item refunds only in v1.</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors ${
              tab === t.key
                ? "border-[#004643] bg-[#004643] text-white"
                : "border-[#D5DBDA] bg-white text-[#343837] hover:bg-[#F1F4F4]"
            }`}
          >
            {t.label}
            {counts && (
              <span className={tab === t.key ? "text-white/60" : "text-[#8E9493]"}>
                {t.key === "requested" ? counts.requested : t.key === "done" ? counts.done : counts.all}
              </span>
            )}
          </button>
        ))}

        <span className="relative ms-auto">
          <Search size={13} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#8E9493]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Item, order, vendor, reason"
            className="w-[240px] rounded-full border border-[#D5DBDA] bg-white py-1.5 ps-8 pe-3 text-[12.5px] placeholder:text-[#B3B9B9] focus:border-[#87DDD7] focus:outline-none"
          />
        </span>
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#812F28]/25 bg-[#FFFAF9] p-3.5 text-[12.5px] text-[#812F28]">
          <AlertCircle size={15} className="mt-px shrink-0" />{error}
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#D5DBDA] bg-white">
        <div className="hidden grid-cols-[2fr_1.4fr_0.8fr_0.8fr] gap-4 border-b border-[#E6EBEA] bg-[#FBFCFC] px-5 py-2.5 text-[11px] font-medium uppercase tracking-wide text-[#8E9493] lg:grid">
          <span>Item</span>
          <span>Reason</span>
          <span>Amount</span>
          <span>Waiting</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="h-4 w-4 animate-spin text-[#8E9493]" />
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="px-5 py-14 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F4F4] text-[#B3B9B9]">
              <RotateCcw size={20} strokeWidth={1.25} />
            </span>
            <div className="text-[14px] font-medium text-[#101212]">
              {search ? "Nothing matches that search" : "No returns waiting"}
            </div>
            <p className="mt-1 text-[12.5px] text-[#646968]">
              {tab === "done"
                ? "Decisions you make will appear here."
                : "Return requests from customers arrive here."}
            </p>
          </div>
        )}

        {!loading && rows.map(r => (
          <button
            key={r.id}
            onClick={() => onOpen(r.id)}
            className="grid w-full grid-cols-1 gap-1 border-b border-[#F1F4F4] px-5 py-3.5 text-start transition-colors last:border-b-0 hover:bg-[#FBFCFC] lg:grid-cols-[2fr_1.4fr_0.8fr_0.8fr] lg:items-center lg:gap-4"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E6EBEA] bg-[#F1F4F4]">
                {r.item_image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={r.item_image} alt="" className="h-full w-full object-cover" />
                  : <Package size={14} className="text-[#B3B9B9]" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-[#101212]">
                  {r.item_title}
                </span>
                <span className="block truncate text-[11px] text-[#8E9493]">
                  {r.order_number ?? "—"}{r.vendor_name ? ` · ${r.vendor_name}` : ""}
                </span>
              </span>
            </span>

            <span className="truncate text-[12.5px] text-[#4B4F4F]">{r.reason}</span>

            <span className="text-[12.5px] font-medium tabular-nums text-[#101212]">
              {money(r.amount)}
            </span>

            <span className="text-[12px]">
              {r.status === "requested" || r.status === "refunding" ? (
                <span className={ageLabel(r.created_at).includes("day") ? "text-[#812F28]" : "text-[#646968]"}>
                  {ageLabel(r.created_at)}
                </span>
              ) : (
                <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium capitalize ${STATUS_STYLE[r.status]}`}>
                  {r.status}
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

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<ReturnDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Separate from `error` because every action reloads afterwards, and a
   *  successful reload would clear the message explaining the failure. */
  const [actionError, setActionError] = useState<string | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getReturnForReview(id);
      if (res.success) { setData(res.data); setError(null); }
      else setError(typeof res.error === "string" ? res.error : "Could not load this return.");
    } catch {
      setError("Could not load this return.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const doRefund = useCallback(async () => {
    setWorking(true);
    setActionError(null);
    try {
      const res = await refundReturn(id);
      if (!res.success) {
        const e: any = res.error;
        setActionError(
          String(e).includes("already_handled")
            ? "Someone else handled this while you were reading. The outcome below is the one that stands."
            : typeof e === "string" ? e : "The refund did not go through.",
        );
        await load();
        return;
      }
      setDone(`Refunded ${money(res.data.amount)}`);
      setConfirming(false);
      await load();
    } catch {
      setActionError("The refund did not go through.");
    } finally {
      setWorking(false);
    }
  }, [id, load]);

  const doDecline = useCallback(async () => {
    if (!note.trim()) return;
    setWorking(true);
    setActionError(null);
    try {
      const res = await declineReturn(id, note.trim());
      if (!res.success) {
        const e: any = res.error;
        setActionError(
          String(e).includes("already_handled")
            ? "Someone else handled this while you were reading."
            : typeof e === "string" ? e : "Could not decline this return.",
        );
        await load();
        return;
      }
      setDone("Return declined. The customer has been told why.");
      setDeclining(false);
      await load();
    } catch {
      setActionError("Could not decline this return.");
    } finally {
      setWorking(false);
    }
  }, [id, note, load]);

  if (loading) {
    return <div className="flex items-center justify-center px-6 py-24">
      <Loader2 className="h-5 w-5 animate-spin text-[#004643]" />
    </div>;
  }

  if (error && !data) {
    return (
      <div className="px-6 py-10 lg:px-10">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] text-[#646968] hover:text-[#004643]">
          <ArrowLeft size={13} /> Back to returns
        </button>
        <p className="mt-6 text-[13px] text-[#812F28]">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const r = data.return;
  const item: any = data.item;
  const order: any = data.order;
  const pending = r.status === "requested";
  const amount = Number(r.amount);

  return (
    <div className="px-6 py-7 lg:px-10">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] text-[#646968] transition-colors hover:text-[#004643]">
        <ArrowLeft size={13} /> Back to returns
      </button>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-[11.5px] text-[#8E9493]">
            {order?.order_number} · requested {ageLabel(r.created_at)} ago
          </span>
          <h1 className="mt-0.5 text-[24px] text-[#101212]">
            {item?.product_variants?.products?.title ?? "Item"}
          </h1>
          <span className="text-[12.5px] text-[#646968]">
            {item?.product_variants?.color ? `${item.product_variants.color} · ` : ""}
            {item?.retailers?.name ?? "—"} · qty {item?.quantity ?? 0}
          </span>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11.5px] font-medium capitalize ${STATUS_STYLE[r.status]}`}>
          {r.status}
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

        {!data.refundable && pending && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#8a6d1f]/25 bg-[#FFFBF2] p-3.5 text-[12.5px] text-[#4B4F4F]">
            <AlertTriangle size={15} className="mt-px shrink-0 text-[#8a6d1f]" />
            This order has no recorded payment, so there is nothing to refund
            against. It can be declined, or settled outside the system.
          </div>
        )}

        {data.other_returns_on_order.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#E6EBEA] bg-white p-3.5 text-[12.5px] text-[#4B4F4F]">
            <Info size={15} className="mt-px shrink-0 text-[#646968]" />
            <span>
              {data.other_returns_on_order.length} other return
              {data.other_returns_on_order.length === 1 ? "" : "s"} on this order.
              Worth a look before deciding.
            </span>
          </div>
        )}

        {r.status !== "requested" && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#D5DBDA] bg-white p-3.5 text-[12.5px] text-[#4B4F4F]">
            <Info size={15} className="mt-px shrink-0 text-[#646968]" />
            <span>
              <strong className="capitalize text-[#101212]">{r.status}</strong>
              {r.decided_by_name ? ` by ${r.decided_by_name}` : ""}
              {r.decided_at ? ` at ${fmtWhen(r.decided_at)}` : ""}.
              {r.stripe_refund_id && (
                <span className="mt-0.5 block font-mono text-[11px] text-[#8E9493]">
                  {r.stripe_refund_id}
                </span>
              )}
              {r.decision_note && (
                <span className="mt-1 block text-[#646968]">{r.decision_note}</span>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5">
            <h2 className="text-[13px] font-medium text-[#101212]">What the customer said</h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[#4B4F4F]">{r.reason}</p>

            {r.photo_urls?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {r.photo_urls.map((url, i) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer"
                     className="h-20 w-20 overflow-hidden rounded-lg border border-[#E6EBEA]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5">
            <h2 className="text-[13px] font-medium text-[#101212]">Order</h2>
            <dl className="mt-3 divide-y divide-[#F1F4F4]">
              <Row label="Order" value={order?.order_number} mono />
              <Row label="Placed" value={order?.created_at ? fmtWhen(order.created_at) : null} />
              <Row label="Customer" value={order?.shipping_address?.fullName} />
              <Row label="Order total" value={order ? money(order.total_amount) : null} />
              <Row label="This item" value={money(amount)} />
            </dl>
          </section>
        </div>

        {/* Decision */}
        <div>
          <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5 lg:sticky lg:top-7">
            <h2 className="text-[13px] font-medium text-[#101212]">Decision</h2>

            {!pending ? (
              <p className="mt-2 text-[12.5px] text-[#8E9493]">
                This return has already been decided.
              </p>
            ) : confirming ? (
              <>
                <div className="mt-3 rounded-xl border border-[#8a6d1f]/25 bg-[#FFFBF2] p-3 text-[12.5px] text-[#4B4F4F]">
                  <strong className="block text-[#101212]">
                    Refund {money(amount)} to {order?.shipping_address?.fullName ?? "the customer"}?
                  </strong>
                  <span className="mt-1 block text-[11.5px]">
                    This sends money through Stripe and cannot be undone from
                    here. Stock for this item goes back on the shelf.
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={working}
                    className="flex-1 rounded-full border border-[#D5DBDA] bg-white py-2.5 text-[12.5px] font-medium text-[#343837] hover:bg-[#F1F4F4] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={doRefund}
                    disabled={working}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#004643] py-2.5 text-[12.5px] font-medium text-white hover:bg-[#003836] disabled:opacity-40"
                  >
                    {working && <Loader2 size={13} className="animate-spin" />}
                    {working ? "Refunding" : "Yes, refund"}
                  </button>
                </div>
              </>
            ) : declining ? (
              <>
                <label className="mt-3 block">
                  <span className="text-[11.5px] font-medium text-[#101212]">
                    Reason — the customer sees this
                  </span>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={4}
                    placeholder="Explain what they can do next, if anything."
                    className="mt-1.5 w-full resize-none rounded-xl border border-[#D5DBDA] px-3 py-2 text-[12.5px] placeholder:text-[#B3B9B9] focus:border-[#87DDD7] focus:outline-none"
                  />
                </label>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => { setDeclining(false); setNote(""); }}
                    disabled={working}
                    className="flex-1 rounded-full border border-[#D5DBDA] bg-white py-2.5 text-[12.5px] font-medium text-[#343837] hover:bg-[#F1F4F4] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={doDecline}
                    disabled={working || !note.trim()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#812F28] py-2.5 text-[12.5px] font-medium text-white hover:bg-[#6b2721] disabled:opacity-40"
                  >
                    {working && <Loader2 size={13} className="animate-spin" />}
                    Decline
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mt-3 rounded-xl bg-[#FBFCFC] p-3">
                  <span className="block text-[11px] text-[#8E9493]">Refund amount</span>
                  <span className="block text-[20px] font-semibold tabular-nums text-[#101212]">
                    {money(amount)}
                  </span>
                  <span className="mt-0.5 block text-[10.5px] text-[#8E9493]">
                    Full item — v1 does not do partial refunds
                  </span>
                </div>

                <button
                  onClick={() => setConfirming(true)}
                  disabled={!data.refundable}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#004643] py-2.5 text-[12.5px] font-medium text-white hover:bg-[#003836] disabled:opacity-40"
                >
                  <RotateCcw size={13} />
                  Refund {money(amount)}
                </button>

                <button
                  onClick={() => setDeclining(true)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-[#D5DBDA] bg-white py-2.5 text-[12.5px] font-medium text-[#812F28] hover:bg-[#FFFAF9]"
                >
                  <X size={13} />
                  Decline
                </button>

                <p className="mt-3 flex items-start gap-1.5 text-[11px] text-[#8E9493]">
                  <Clock size={11} className="mt-px shrink-0" />
                  Refunds usually reach the customer within five working days.
                </p>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-2.5">
      <dt className="shrink-0 text-[12px] text-[#8E9493]">{label}</dt>
      <dd className={`min-w-0 truncate text-end text-[12.5px] ${value ? "text-[#101212]" : "text-[#B3B9B9]"} ${mono && value ? "font-mono" : ""}`}>
        {value || "—"}
      </dd>
    </div>
  );
}

function RefundsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("id");

  return selected
    ? <Detail id={selected} onBack={() => router.push("/admin/refunds")} />
    : <Queue onOpen={id => router.push(`/admin/refunds?id=${encodeURIComponent(id)}`)} />;
}

export default function AdminRefundsPage() {
  return (
    <AdminShell>
      <Suspense fallback={<div className="px-6 py-20" />}>
        <RefundsInner />
      </Suspense>
    </AdminShell>
  );
}