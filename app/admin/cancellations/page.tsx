"use client";

/**
 * Cancellation requests — admin
 * ----------------------------------------------------------------------------
 * Customers ask to cancel a whole order before it ships; vendors ask to cancel
 * their part of an order they can't fulfil. Approving refunds the customer
 * through the gateway they paid with, puts the stock back and reverses the
 * vendor's earnings. The amount is computed by the server, never typed here.
 */

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Check, X, AlertCircle, Store, User } from "lucide-react";

import AdminShell from "@/components/admin/AdminShell";
import {
  listCancellations, getCancellation, approveCancellation, declineCancellation, type CancellationRow,
} from "@/lib/api/admin";
import { formatMoney } from "@/lib/money";

const TABS = [
  { key: "requested", label: "Waiting" },
  { key: "approved", label: "Approved" },
  { key: "declined", label: "Declined" },
  { key: "all", label: "All" },
];
const STATUS: Record<string, string> = {
  requested: "bg-[#FFF6E5] text-[#8A5A00]",
  processing: "bg-[#EEF2FF] text-[#3B4CA8]",
  approved: "bg-[#E7FBEB] text-[#28603A]",
  declined: "bg-[#F1F4F4] text-[#646968]",
};
const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const errText = (e: unknown, f: string) => (typeof e === "string" ? e : f);

function Queue({ onOpen }: { onOpen: (id: string) => void }) {
  const [tab, setTab] = useState("requested");
  const [rows, setRows] = useState<CancellationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listCancellations(tab).then(res => {
      if (!alive) return;
      if (res.success) { setRows(res.data.requests); setError(null); }
      else setError(errText(res.error, "Could not load cancellations."));
    });
    return () => { alive = false; };
  }, [tab]);

  return (
    <div className="px-6 py-7 lg:px-10">
      <h1 className="text-[24px] text-[#101212]">Cancellations</h1>
      <p className="mt-1 text-[12.5px] text-[#646968]">
        Approving refunds the customer, restores stock and reverses the vendor&apos;s earnings. Oldest first.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setRows(null); }} aria-pressed={tab === t.key}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] ${tab === t.key ? "border-[#004643] bg-[#004643] text-white" : "border-[#D5DBDA] bg-white text-[#343837] hover:bg-[#F1F4F4]"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <section className="mt-4 rounded-2xl border border-[#D5DBDA] bg-white">
        {error && <p className="p-5 text-[12.5px] text-[#812F28]">{error}</p>}
        {!error && rows === null && <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-[#004643]" /></div>}
        {rows?.length === 0 && <p className="p-8 text-center text-[12.5px] text-[#8E9493]">Nothing waiting.</p>}
        {rows?.map(r => (
          <button key={r.id} onClick={() => onOpen(r.id)}
            className="grid w-full grid-cols-1 gap-1 border-b border-[#F1F4F4] px-5 py-3.5 text-start last:border-b-0 hover:bg-[#FBFCFC] lg:grid-cols-[1fr_1.1fr_1.8fr_0.8fr_0.7fr] lg:items-center lg:gap-3">
            <span className="font-mono text-[12.5px] font-medium text-[#101212]">{r.orders?.order_number}</span>
            <span className="flex items-center gap-1.5 text-[12px] text-[#4B4F4F]">
              {r.requester_role === "vendor" ? <Store size={12} /> : <User size={12} />}
              {r.requester_role === "vendor" ? `Vendor · ${r.order_shipments?.retailers?.name ?? ""}` : `Customer · whole order`}
            </span>
            <span className="truncate text-[12px] text-[#646968]">{r.reason}</span>
            <span><span className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${STATUS[r.status]}`}>{r.status}</span></span>
            <span className="text-[11.5px] text-[#8E9493]">{when(r.created_at)}</span>
          </button>
        ))}
      </section>
    </div>
  );
}

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<{ request: any; refund_preview: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"none" | "approve" | "decline">("none");
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    getCancellation(id).then(res => {
      if (!alive) return;
      if (res.success) { setData(res.data); setError(null); } else setError(errText(res.error, "Could not load this request."));
    });
    return () => { alive = false; };
  }, [id, version]);

  const decide = async () => {
    setWorking(true); setError(null);
    const res = mode === "approve" ? await approveCancellation(id, note.trim() || undefined) : await declineCancellation(id, note.trim());
    setWorking(false);
    if (!res.success) {
      const e = errText(res.error, "That didn't work.");
      setError(e === "already_handled" ? "Someone else handled this while you were reading." : e);
    } else {
      setDone(res.message ?? "Done"); setMode("none"); setNote("");
    }
    setVersion(v => v + 1);
  };

  if (!data) {
    return (
      <div className="px-6 py-10 lg:px-10">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] text-[#646968]"><ArrowLeft size={13} /> Cancellations</button>
        {error ? <p className="mt-6 text-[13px] text-[#812F28]">{error}</p> : <Loader2 className="mt-10 h-5 w-5 animate-spin text-[#004643]" />}
      </div>
    );
  }

  const r = data.request;
  const o = r.orders;
  const currency = o?.currency || "SAR";
  const items = (o?.order_items || []).filter((i: { retailer_id: string }) =>
    !r.shipment_id || i.retailer_id === (o?.order_shipments || []).find((s: { id: string }) => s.id === r.shipment_id)?.retailer_id);
  const open = r.status === "requested";

  return (
    <div className="px-6 py-7 lg:px-10">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] text-[#646968] hover:text-[#004643]"><ArrowLeft size={13} /> Cancellations</button>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-[22px] text-[#101212]">{o?.order_number}</h1>
          <p className="mt-1 text-[12.5px] text-[#646968]">
            {r.requester_role === "vendor" ? `Vendor (${r.order_shipments?.retailers?.name}) can't fulfil their part` : "Customer wants to cancel the whole order"} · {when(r.created_at)}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11.5px] font-medium ${STATUS[r.status]}`}>{r.status}</span>
      </div>

      {done && <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#28603A]/25 bg-[#F4FBF5] p-3 text-[12.5px] text-[#28603A]"><Check size={14} /> {done}</div>}
      {error && <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#812F28]/25 bg-[#FFFAF9] p-3 text-[12.5px] text-[#812F28]"><AlertCircle size={14} /> {error}</div>}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5">
            <h2 className="text-[13px] font-medium text-[#101212]">Reason</h2>
            <p className="mt-2 whitespace-pre-wrap text-[12.5px] text-[#4B4F4F]">{r.reason}</p>
            {r.decision_note && <p className="mt-3 rounded-xl bg-[#FBFCFC] p-3 text-[12px] text-[#646968]"><b>Decision note:</b> {r.decision_note}</p>}
          </section>
          <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5">
            <h2 className="text-[13px] font-medium text-[#101212]">{r.shipment_id ? "Items being cancelled" : "Order items"}</h2>
            {items.map((i: { id: string; quantity: number; total_price: number; item_status: string; product_variants?: { products?: { title?: string } } }) => (
              <div key={i.id} className="flex justify-between border-b border-[#F1F4F4] py-2 text-[12.5px] last:border-b-0">
                <span>{i.product_variants?.products?.title ?? "Item"} × {i.quantity} <span className="text-[11px] text-[#8E9493]">({i.item_status})</span></span>
                <span>{formatMoney(i.total_price, currency)}</span>
              </div>
            ))}
            <div className="mt-3 text-[12px] text-[#646968]">
              Shipments: {(o?.order_shipments || []).map((s: { id: string; shipment_status: string; retailers?: { name?: string } }) =>
                `${s.retailers?.name ?? "Vendor"} — ${s.shipment_status.replace(/_/g, " ")}`).join(" · ")}
            </div>
          </section>
        </div>

        <section className="h-fit rounded-2xl border border-[#D5DBDA] bg-white p-5 lg:sticky lg:top-7">
          <h2 className="text-[13px] font-medium text-[#101212]">Decision</h2>
          <div className="mt-3 rounded-xl bg-[#FBFCFC] p-3 text-[12.5px]">
            <div className="text-[#646968]">{r.status === "approved" ? "Refunded" : "Refund if approved"}</div>
            <div className="mt-0.5 text-[18px] font-semibold tabular-nums">
              {formatMoney(r.status === "approved" ? Number(r.refund_amount || 0) : Number(data.refund_preview || 0), currency)}
            </div>
            <div className="mt-0.5 text-[11px] text-[#8E9493]">
              {r.shipment_id ? "That vendor's items, their shipping and the VAT on both, less their share of any discount." : "Order total, less anything already refunded through returns."}
            </div>
          </div>
          {!open ? (
            <p className="mt-3 text-[12px] text-[#8E9493]">Decided {when(r.decided_at)}.</p>
          ) : mode === "none" ? (
            <div className="mt-3 space-y-2">
              <button onClick={() => setMode("approve")} className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#004643] py-2.5 text-[12.5px] font-medium text-white"><Check size={13} /> Approve and refund</button>
              <button onClick={() => setMode("decline")} className="flex w-full items-center justify-center gap-1.5 rounded-full border border-[#812F28]/30 py-2.5 text-[12.5px] font-medium text-[#812F28]"><X size={13} /> Decline</button>
            </div>
          ) : (
            <div className="mt-3">
              <label className="text-[11.5px] text-[#646968]">
                {mode === "approve" ? "Note (optional, kept in the audit log)" : "Why? The requester sees this."}
              </label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                className="mt-1 w-full rounded-xl border border-[#D5DBDA] p-3 text-[12.5px] focus:outline-none" />
              {mode === "approve" && <p className="mt-1 text-[11.5px] text-[#8A5A00]">This sends {formatMoney(Number(data.refund_preview || 0), currency)} back to the customer and cannot be undone.</p>}
              <div className="mt-2 flex gap-2">
                <button disabled={working || (mode === "decline" && note.trim().length < 3)} onClick={decide}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-medium text-white disabled:opacity-50 ${mode === "approve" ? "bg-[#004643]" : "bg-[#812F28]"}`}>
                  {working && <Loader2 size={12} className="animate-spin" />}{mode === "approve" ? "Confirm refund" : "Decline request"}
                </button>
                <button onClick={() => { setMode("none"); setNote(""); }} className="px-2 text-[12px] text-[#646968]">Back</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Inner() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  return id
    ? <Detail id={id} onBack={() => router.push("/admin/cancellations")} />
    : <Queue onOpen={x => router.push(`/admin/cancellations?id=${x}`)} />;
}

export default function AdminCancellationsPage() {
  return <AdminShell><Suspense fallback={null}><Inner /></Suspense></AdminShell>;
}
