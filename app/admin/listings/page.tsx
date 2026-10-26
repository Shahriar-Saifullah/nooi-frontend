"use client";

/**
 * Listing review — admin
 * ----------------------------------------------------------------------------
 * Every new vendor listing starts hidden ("pending") and only appears in the
 * marketplace once an admin approves it here. Rejecting sends it back to the
 * vendor with a note they see on their Products page; they fix it and
 * resubmit. Approved listings can be taken off sale (deactivated) and put
 * back.
 */

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Search, Check, X, EyeOff, Eye, AlertCircle } from "lucide-react";

import AdminShell from "@/components/admin/AdminShell";
import { listListings, getListing, decideListing, type ListingRow, type ListingStatus, type ListingDetail } from "@/lib/api/admin";
import { formatMoney } from "@/lib/money";

const TABS: { key: string; label: string }[] = [
  { key: "pending", label: "Waiting" },
  { key: "approved", label: "Live" },
  { key: "rejected", label: "Changes requested" },
  { key: "deactivated", label: "Off sale" },
  { key: "all", label: "All" },
];

const STATUS: Record<ListingStatus, { label: string; cls: string }> = {
  pending: { label: "Waiting", cls: "bg-[#FFF6E5] text-[#8A5A00]" },
  approved: { label: "Live", cls: "bg-[#E7FBEB] text-[#28603A]" },
  rejected: { label: "Changes requested", cls: "bg-[#FFFAF9] text-[#812F28]" },
  deactivated: { label: "Off sale", cls: "bg-[#F1F4F4] text-[#646968]" },
};

const sar = (v: number) => formatMoney(v, "SAR");
const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const errText = (e: unknown, fallback: string) => (typeof e === "string" ? e : fallback);

function Queue({ onOpen }: { onOpen: (id: string) => void }) {
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ListingRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      listListings(tab, search.trim() || undefined).then(res => {
        if (!alive) return;
        if (res.success) { setRows(res.data.listings); setCounts(res.data.counts); setError(null); }
        else setError(errText(res.error, "Could not load listings."));
      });
    }, search ? 300 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [tab, search]);

  return (
    <div className="px-6 py-7 lg:px-10">
      <h1 className="text-[24px] text-[#101212]">Listings</h1>
      <p className="mt-1 text-[12.5px] text-[#646968]">
        New listings stay hidden from shoppers until you approve them. Oldest first.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setRows(null); }} aria-pressed={tab === t.key}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] ${
              tab === t.key ? "border-[#004643] bg-[#004643] text-white" : "border-[#D5DBDA] bg-white text-[#343837] hover:bg-[#F1F4F4]"}`}>
            {t.label}
            {t.key !== "all" && counts[t.key] !== undefined && (
              <span className={tab === t.key ? "text-white/60" : "text-[#8E9493]"}>{counts[t.key]}</span>
            )}
          </button>
        ))}
        <span className="relative ms-auto">
          <Search size={13} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#8E9493]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search titles"
            className="w-56 rounded-full border border-[#D5DBDA] bg-white py-1.5 pe-3 ps-8 text-[12.5px] focus:outline-none" />
        </span>
      </div>

      <section className="mt-4 rounded-2xl border border-[#D5DBDA] bg-white">
        {error && <p className="p-5 text-[12.5px] text-[#812F28]">{error}</p>}
        {!error && rows === null && <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-[#004643]" /></div>}
        {rows?.length === 0 && <p className="p-8 text-center text-[12.5px] text-[#8E9493]">Nothing here.</p>}
        {rows?.map(l => {
          const img = l.product_variants?.[0]?.images?.[0];
          return (
            <button key={l.id} onClick={() => onOpen(l.id)}
              className="grid w-full grid-cols-[48px_1fr] items-center gap-3 border-b border-[#F1F4F4] px-5 py-3 text-start last:border-b-0 hover:bg-[#FBFCFC] lg:grid-cols-[48px_1.6fr_1fr_0.7fr_0.8fr_0.7fr]">
              <span className="h-12 w-12 overflow-hidden rounded-lg bg-[#F1F4F4]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {img && <img src={img} alt="" className="h-full w-full object-cover" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-[#101212]">{l.title}</span>
                <span className="block truncate text-[11px] text-[#8E9493]">{l.category} · {String(l.specs_json?.kind ?? "")}</span>
              </span>
              <span className="hidden truncate text-[12px] text-[#4B4F4F] lg:block">{l.retailers?.name ?? "—"}</span>
              <span className="hidden text-[12.5px] tabular-nums lg:block">{sar(Number(l.base_price))}</span>
              <span className="hidden lg:block">
                <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${STATUS[l.listing_status].cls}`}>{STATUS[l.listing_status].label}</span>
              </span>
              <span className="hidden text-[11.5px] text-[#8E9493] lg:block">{when(l.listing_status === "pending" ? l.submitted_at : l.reviewed_at ?? l.created_at)}</span>
            </button>
          );
        })}
      </section>
    </div>
  );
}

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const [l, setL] = useState<ListingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"none" | "reject" | "deactivate">("none");
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    getListing(id).then(res => {
      if (!alive) return;
      if (res.success) { setL(res.data.listing); setError(null); }
      else setError(errText(res.error, "Could not load this listing."));
    });
    return () => { alive = false; };
  }, [id, version]);

  const act = useCallback(async (action: "approve" | "reject" | "deactivate" | "reactivate") => {
    setWorking(true); setError(null);
    const res = await decideListing(id, action, note.trim() || undefined);
    setWorking(false);
    if (!res.success) { setError(errText(res.error, "That didn't work.")); return; }
    setDone(res.message ?? "Saved"); setMode("none"); setNote(""); setVersion(v => v + 1);
  }, [id, note]);

  if (!l) {
    return (
      <div className="px-6 py-10 lg:px-10">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] text-[#646968]"><ArrowLeft size={13} /> Listings</button>
        {error ? <p className="mt-6 text-[13px] text-[#812F28]">{error}</p> : <Loader2 className="mt-10 h-5 w-5 animate-spin text-[#004643]" />}
      </div>
    );
  }

  const images = [...new Set((l.product_variants || []).flatMap(v => v.images || []))];
  const status = l.listing_status;

  return (
    <div className="px-6 py-7 lg:px-10">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] text-[#646968] hover:text-[#004643]"><ArrowLeft size={13} /> Listings</button>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] text-[#101212]">{l.title}</h1>
          <p className="mt-1 text-[12.5px] text-[#646968]">{l.retailers?.name} · submitted {when(l.submitted_at ?? l.created_at)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11.5px] font-medium ${STATUS[status].cls}`}>{STATUS[status].label}</span>
      </div>

      {done && <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#28603A]/25 bg-[#F4FBF5] p-3 text-[12.5px] text-[#28603A]"><Check size={14} /> {done}</div>}
      {error && <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#812F28]/25 bg-[#FFFAF9] p-3 text-[12.5px] text-[#812F28]"><AlertCircle size={14} /> {error}</div>}
      {l.review_note && status !== "approved" && (
        <div className="mt-4 rounded-xl bg-[#FFFBF2] p-3 text-[12.5px] text-[#4B4F4F]"><b>Note to vendor:</b> {l.review_note}</div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5">
            <h2 className="text-[13px] font-medium text-[#101212]">Photos · {images.length}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {images.map(src => (
                // eslint-disable-next-line @next/next/no-img-element
                <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt="" className="aspect-square w-full rounded-lg object-cover" /></a>
              ))}
            </div>
            {images.some(s => s.includes("picsum.photos")) && (
              <p className="mt-2 text-[11.5px] text-[#8A5A00]">Placeholder photo — the vendor didn&apos;t upload real images.</p>
            )}
          </section>
          <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5 text-[12.5px]">
            <h2 className="text-[13px] font-medium text-[#101212]">Details</h2>
            <p className="mt-2 whitespace-pre-wrap text-[#4B4F4F]">{l.description || "No description."}</p>
            <div className="mt-4 grid grid-cols-[140px_1fr] gap-y-1.5">
              <span className="text-[#8E9493]">Price</span><span>{sar(Number(l.base_price))}</span>
              <span className="text-[#8E9493]">Category</span><span>{l.category} · {l.type_id}</span>
              <span className="text-[#8E9493]">Kind</span><span>{String(l.specs_json?.kind ?? "—")}</span>
              <span className="text-[#8E9493]">Lead time</span><span>{l.lead_time_days ? `${l.lead_time_days} days` : "—"}</span>
              <span className="text-[#8E9493]">Returnable</span><span>{l.is_returnable ? "Yes" : "No"}</span>
              <span className="text-[#8E9493]">3D model</span><span>{l.specs_json?.has_3d ? "Uploaded" : `Default (${l.canvas_model_id})`}</span>
              <span className="text-[#8E9493]">Commission</span><span>{l.retailers?.commission_rate}%</span>
            </div>
          </section>
          <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5 text-[12.5px]">
            <h2 className="text-[13px] font-medium text-[#101212]">Options · {l.product_variants.length}</h2>
            {l.product_variants.map(v => (
              <div key={v.id} className="flex justify-between border-b border-[#F1F4F4] py-2 last:border-b-0">
                <span className="font-mono text-[11.5px]">{v.sku}</span>
                <span>{sar(Number(v.price))} · {v.stock_quantity} in stock</span>
              </div>
            ))}
          </section>
        </div>

        <section className="h-fit rounded-2xl border border-[#D5DBDA] bg-white p-5 lg:sticky lg:top-7">
          <h2 className="text-[13px] font-medium text-[#101212]">Decision</h2>
          {mode === "none" ? (
            <div className="mt-3 space-y-2">
              {(status === "pending" || status === "rejected") && (
                <button disabled={working} onClick={() => act("approve")}
                  className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#004643] py-2.5 text-[12.5px] font-medium text-white disabled:opacity-60">
                  {working ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve — put on sale
                </button>
              )}
              {status === "pending" && (
                <button onClick={() => setMode("reject")} className="flex w-full items-center justify-center gap-1.5 rounded-full border border-[#812F28]/30 py-2.5 text-[12.5px] font-medium text-[#812F28]">
                  <X size={13} /> Request changes
                </button>
              )}
              {status === "approved" && (
                <button onClick={() => setMode("deactivate")} className="flex w-full items-center justify-center gap-1.5 rounded-full border border-[#D5DBDA] py-2.5 text-[12.5px] font-medium text-[#343837]">
                  <EyeOff size={13} /> Take off sale
                </button>
              )}
              {status === "deactivated" && (
                <button disabled={working} onClick={() => act("reactivate")} className="flex w-full items-center justify-center gap-1.5 rounded-full border border-[#D5DBDA] py-2.5 text-[12.5px] font-medium text-[#004643]">
                  <Eye size={13} /> Put back on sale
                </button>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <label className="text-[11.5px] text-[#646968]">
                {mode === "reject" ? "What needs to change? The vendor sees this." : "Why is it coming off sale? The vendor sees this."}
              </label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={4}
                className="mt-1 w-full rounded-xl border border-[#D5DBDA] p-3 text-[12.5px] focus:outline-none"
                placeholder={mode === "reject" ? "e.g. Photos are placeholders — please upload real product photos." : "e.g. Reported as counterfeit, under investigation."} />
              <div className="mt-2 flex gap-2">
                <button disabled={working || note.trim().length < 3} onClick={() => act(mode === "reject" ? "reject" : "deactivate")}
                  className="rounded-full bg-[#812F28] px-4 py-2 text-[12px] font-medium text-white disabled:opacity-50">
                  {mode === "reject" ? "Send back to vendor" : "Take off sale"}
                </button>
                <button onClick={() => { setMode("none"); setNote(""); }} className="px-2 text-[12px] text-[#646968]">Cancel</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ListingsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  return id
    ? <Detail id={id} onBack={() => router.push("/admin/listings")} />
    : <Queue onOpen={x => router.push(`/admin/listings?id=${x}`)} />;
}

export default function AdminListingsPage() {
  return (
    <AdminShell>
      <Suspense fallback={null}><ListingsInner /></Suspense>
    </AdminShell>
  );
}
