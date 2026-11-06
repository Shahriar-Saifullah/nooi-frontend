"use client";

/**
 * Documents — the client's downloads: a Nooi tax invoice for every order, and
 * the terms they have accepted (which version, when).
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Download, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { getMyDocuments, downloadInvoice, type DocumentOrder } from "@/lib/api/documents";
import { getTermsStatus } from "@/lib/api/terms";
import { DOC_TITLE, ROLE_LABEL, TERMS_VERSIONS, docHref, type AcceptanceRow, type TermsDocument, type TermsRole } from "@/lib/legal/terms";
import { formatMoney } from "@/lib/money";

const errText = (e: unknown, fallback: string) => (typeof e === "string" && e ? e : fallback);

export default function DocumentsPanel() {
  const [orders, setOrders] = useState<DocumentOrder[] | null>(null);
  const [accepted, setAccepted] = useState<AcceptanceRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});

  useEffect(() => {
    let live = true;
    getMyDocuments().then(res => {
      if (!live) return;
      if (res.success) setOrders(res.data.orders);
      else { setOrders([]); setError(errText(res.error, "We couldn't load your documents.")); }
    });
    getTermsStatus().then(res => { if (live && res.success) setAccepted(res.data.accepted); });
    return () => { live = false; };
  }, []);

  const download = async (o: DocumentOrder) => {
    setBusy(o.id);
    setRowError(r => ({ ...r, [o.id]: "" }));
    const err = await downloadInvoice(o.id);
    setBusy(null);
    if (err) setRowError(r => ({ ...r, [o.id]: err }));
    else {
      // Now issued — refresh so it shows its number.
      const res = await getMyDocuments();
      if (res.success) setOrders(res.data.orders);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-3xl px-6 sm:px-8 py-6 sm:py-7 shadow-sm border border-[#f0f0f0]">
        <h1 className="text-2xl sm:text-3xl font-[600] text-[#0a0a0a] tracking-tight">Documents</h1>
        <p className="text-sm text-[#737373] mt-1 mb-6">
          Tax invoices for your orders, issued by Nooi with VAT. Download any of them as a PDF.
        </p>

        {orders === null ? (
          <div className="flex items-center gap-2 text-sm text-[#737373] py-6"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-[#b42318] py-4"><AlertCircle className="w-4 h-4" /> {error}</div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#e5e5e5] py-10 text-center">
            <FileText className="w-6 h-6 mx-auto text-[#a3a3a3]" />
            <p className="text-[13px] font-medium text-[#404040] mt-2">No invoices yet</p>
            <p className="text-[12px] text-[#a3a3a3] mt-1">Each order gets a tax invoice here.</p>
            <Link href="/marketplace" className="inline-block mt-4 text-[12.5px] font-[600] text-[#004643]">Browse the marketplace</Link>
          </div>
        ) : (
          <div className="divide-y divide-[#f0f0f0]">
            {orders.map(o => (
              <div key={o.id} className="py-3.5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#eef3ef] flex items-center justify-center shrink-0">
                  <FileText className="w-4.5 h-4.5 text-[#004643]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-[600] text-[#0a0a0a] truncate">
                    {o.invoice ? `Invoice ${o.invoice.invoice_number}` : "Tax invoice"}
                  </p>
                  <p className="text-[12px] text-[#737373] mt-0.5">
                    Order <Link href={`/orders/${o.id}`} className="hover:text-[#004643] underline-offset-2 hover:underline">{o.order_number}</Link>
                    {" · "}{new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}{formatMoney(Number(o.total_amount), (o.currency || "SAR").toUpperCase())}
                  </p>
                  {rowError[o.id] && <p className="text-[12px] text-[#b42318] mt-1">{rowError[o.id]}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => download(o)}
                  disabled={busy === o.id}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-[#e5e5e5] px-3.5 py-2 text-[12.5px] font-[600] text-[#0a0a0a] hover:border-[#004643] hover:text-[#004643] disabled:opacity-60"
                >
                  {busy === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl px-6 sm:px-8 py-6 sm:py-7 shadow-sm border border-[#f0f0f0]">
        <h2 className="text-lg font-[600] text-[#0a0a0a]">Agreements</h2>
        <p className="text-sm text-[#737373] mt-1 mb-4">The terms you&apos;ve accepted, with the version and date.</p>
        {accepted.length === 0 ? (
          <p className="text-[12.5px] text-[#a3a3a3]">You accept Nooi&apos;s terms when you place your first order.</p>
        ) : (
          <div className="divide-y divide-[#f0f0f0]">
            {accepted.map((a, i) => {
              const doc = a.document as TermsDocument;
              const current = TERMS_VERSIONS[doc] === a.version;
              return (
                <div key={i} className="py-3 flex items-center gap-3">
                  <ShieldCheck className={`w-4 h-4 shrink-0 ${current ? "text-[#28603A]" : "text-[#a3a3a3]"}`} />
                  <div className="flex-1 min-w-0">
                    <Link href={docHref(doc)} className="text-[13px] font-[600] text-[#0a0a0a] hover:text-[#004643]">
                      {DOC_TITLE[doc]?.en ?? a.document}
                    </Link>
                    <p className="text-[12px] text-[#737373]">
                      Version {a.version}{current ? "" : " (older)"} · as {ROLE_LABEL[a.role as TermsRole] ?? a.role}
                      {a.accepted_at ? ` · ${new Date(a.accepted_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
