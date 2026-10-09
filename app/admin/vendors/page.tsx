"use client";

/**
 * Vendor directory — A8
 * ----------------------------------------------------------------------------
 * "Every approved vendor. Issues are visible without opening each one."
 *
 * That sentence is the design brief, and it drives the layout: the badges on
 * each row say what is wrong — no documents, no payout account, no storefront —
 * rather than making an admin open seven drawers to find the one that needs
 * work. The drawer is for detail, not for discovery.
 *
 * Pending and rejected applications are deliberately absent. They belong to the
 * approval queue; a directory of vendors who cannot trade is a different screen
 * wearing this one's clothes.
 */

import React, { Suspense, useCallback, useEffect, useState } from "react";
import {
  Search, X, Loader2, AlertCircle, Store, Clock, CreditCard,
  FileText, Package, TrendingUp, ExternalLink,
} from "lucide-react";

import AdminShell from "@/components/admin/AdminShell";
import {
  getVendorDirectory,
  type DirectoryVendor, type DirectoryCounts, type DirectoryTab,
} from "@/lib/api/admin";

const TABS: { key: DirectoryTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "attention", label: "Needs attention" },
  { key: "approved", label: "Trading" },
  { key: "suspended", label: "Suspended" },
];

function money(v: number): string {
  return `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

/** How long since they last signed in, which is the useful form of that date. */
function signInAge(iso: string | null): { label: string; stale: boolean } {
  if (!iso) return { label: "never signed in", stale: true };
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return { label: "today", stale: false };
  if (days === 1) return { label: "yesterday", stale: false };
  // A vendor who has not signed in for a month is not minding their listings.
  return { label: `${days}d ago`, stale: days > 30 };
}

function DirectoryInner() {
  const [vendors, setVendors] = useState<DirectoryVendor[]>([]);
  const [counts, setCounts] = useState<DirectoryCounts | null>(null);
  const [windowDays, setWindowDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<DirectoryTab>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DirectoryVendor | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      getVendorDirectory({ tab, search: search.trim() || undefined })
        .then(res => {
          if (cancelled) return;
          if (res.success) {
            setVendors(res.data.vendors);
            setCounts(res.data.counts);
            setWindowDays(res.data.gmv_window_days);
            setError(null);
          } else {
            setError(typeof res.error === "string" ? res.error : "Could not load the directory.");
          }
        })
        .catch(() => !cancelled && setError("Could not load the directory."))
        .finally(() => !cancelled && setLoading(false));
    }, search ? 300 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [tab, search]);

  // Escape closes the drawer — the usual expectation for a panel over content.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const count = useCallback(
    (k: DirectoryTab) => counts ? counts[k] : undefined,
    [counts],
  );

  return (
    <div className="px-6 py-7 lg:px-10">
      <div>
        <h1 className="text-[24px] text-[#101212]">Vendors</h1>
        <p className="mt-1 text-[12.5px] text-[#646968]">
          Every approved vendor. Issues are visible without opening each one.
        </p>
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
            {count(t.key) !== undefined && (
              <span className={tab === t.key ? "text-white/60" : "text-[#8E9493]"}>
                {count(t.key)}
              </span>
            )}
          </button>
        ))}

        <span className="relative ms-auto">
          <Search size={13} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#8E9493]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Business, city, email"
            className="w-[220px] rounded-full border border-[#D5DBDA] bg-white py-1.5 ps-8 pe-3 text-[12.5px] placeholder:text-[#B3B9B9] focus:border-[#87DDD7] focus:outline-none"
          />
        </span>
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#812F28]/25 bg-[#FFFAF9] p-3.5 text-[12.5px] text-[#812F28]">
          <AlertCircle size={15} className="mt-px shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#D5DBDA] bg-white">
        <div className="hidden grid-cols-[2fr_1fr_1fr_1.2fr] gap-4 border-b border-[#E6EBEA] bg-[#FBFCFC] px-5 py-2.5 text-[11px] font-medium uppercase tracking-wide text-[#8E9493] lg:grid">
          <span>Business</span>
          <span>GMV · {windowDays}d</span>
          <span>Open items</span>
          <span>Flags</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="h-4 w-4 animate-spin text-[#8E9493]" />
          </div>
        )}

        {!loading && vendors.length === 0 && (
          <div className="px-5 py-14 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F4F4] text-[#B3B9B9]">
              <Store size={20} strokeWidth={1.25} />
            </span>
            <div className="text-[14px] font-medium text-[#101212]">
              {search ? "Nothing matches that search" : "No vendors in this view"}
            </div>
            <p className="mt-1 text-[12.5px] text-[#646968]">
              {tab === "attention"
                ? "Every trading vendor has documents, a payout account and a storefront."
                : "Vendors appear here once their application is approved."}
            </p>
          </div>
        )}

        {!loading && vendors.map(v => {
          const age = signInAge(v.last_sign_in_at);
          return (
            <button
              key={v.id}
              onClick={() => setSelected(v)}
              className="grid w-full grid-cols-1 gap-1 border-b border-[#F1F4F4] px-5 py-3.5 text-start transition-colors last:border-b-0 hover:bg-[#FBFCFC] lg:grid-cols-[2fr_1fr_1fr_1.2fr] lg:items-center lg:gap-4"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-[#101212]">
                  {v.business_name}
                </span>
                <span className="block truncate text-[11px] text-[#8E9493]">
                  {v.city ? `${v.city} · ` : ""}
                  <span className="capitalize">{v.fulfillment_type ?? "—"}</span>
                  {" · "}
                  <span className={age.stale ? "text-[#8a6d1f]" : ""}>
                    last sign-in {age.label}
                  </span>
                </span>
              </span>

              <span className="text-[12.5px] tabular-nums text-[#101212]">
                {v.gmv_90d > 0 ? money(v.gmv_90d) : <span className="text-[#B3B9B9]">—</span>}
              </span>

              <span className="text-[12.5px] tabular-nums text-[#4B4F4F]">
                {v.open_items > 0 ? v.open_items : <span className="text-[#B3B9B9]">—</span>}
              </span>

              <span className="flex flex-wrap items-center gap-1">
                {v.issues.length === 0 ? (
                  <span className="rounded-full bg-[#E7FBEB] px-2 py-0.5 text-[10.5px] font-medium text-[#28603A]">
                    Trading
                  </span>
                ) : (
                  v.issues.map(issue => (
                    <span
                      key={issue}
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                        issue === "Suspended"
                          ? "bg-[#FFFAF9] text-[#812F28]"
                          : "bg-[#FFFBF2] text-[#8a6d1f]"
                      }`}
                    >
                      {issue}
                    </span>
                  ))
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-[60] flex justify-end bg-black/25"
          onClick={() => setSelected(null)}
        >
          <aside
            role="dialog"
            aria-label={selected.business_name}
            onClick={e => e.stopPropagation()}
            className="h-full w-full max-w-[420px] overflow-y-auto border-s border-[#D5DBDA] bg-white"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#E6EBEA] px-5 py-4">
              <div className="min-w-0">
                <span className="block text-[11px] text-[#8E9493]">
                  <span className="capitalize">{selected.fulfillment_type ?? "—"}</span>
                  {selected.category ? ` · ${selected.category}` : ""}
                </span>
                <h2 className="truncate text-[17px] font-medium text-[#101212]">
                  {selected.business_name}
                </h2>
                {selected.city && (
                  <span className="block text-[12px] text-[#646968]">
                    {selected.city}{selected.country ? `, ${selected.country}` : ""}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#8E9493] hover:bg-[#F1F4F4]"
              >
                <X size={14} />
              </button>
            </div>

            {selected.issues.length > 0 && (
              <div className="border-b border-[#E6EBEA] bg-[#FFFBF2] px-5 py-3">
                <span className="text-[11.5px] font-medium text-[#8a6d1f]">
                  Needs attention
                </span>
                <ul className="mt-1 space-y-0.5">
                  {selected.issues.map(i => (
                    <li key={i} className="text-[12px] text-[#4B4F4F]">· {i}</li>
                  ))}
                </ul>
              </div>
            )}

            <dl className="divide-y divide-[#F1F4F4] px-5">
              <Row icon={<Store size={13} />} label="Status">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                  selected.status === "approved"
                    ? "bg-[#E7FBEB] text-[#28603A]"
                    : "bg-[#FFFAF9] text-[#812F28]"
                }`}>
                  {selected.status}
                </span>
              </Row>

              <Row icon={<FileText size={13} />} label="Documents">
                {selected.document_count > 0
                  ? `${selected.document_count} on file`
                  : <span className="text-[#8a6d1f]">None provided</span>}
              </Row>

              <Row icon={<CreditCard size={13} />} label="Payouts">
                {selected.payout_connected
                  ? <span className="text-[#28603A]">Connected</span>
                  : <span className="text-[#8a6d1f]">Not connected</span>}
              </Row>

              <Row icon={<TrendingUp size={13} />} label="Commission">
                {selected.commission_rate != null
                  ? `${selected.commission_rate}%`
                  : <span className="text-[#B3B9B9]">Not set</span>}
              </Row>

              <Row icon={<TrendingUp size={13} />} label={`GMV · ${windowDays} days`}>
                <span className="tabular-nums">{money(selected.gmv_90d)}</span>
                <span className="block text-[10.5px] text-[#8E9493]">
                  Before commission
                </span>
              </Row>

              <Row icon={<Package size={13} />} label="Open items">
                {selected.open_items > 0
                  ? `${selected.open_items} not yet delivered`
                  : <span className="text-[#B3B9B9]">None outstanding</span>}
              </Row>

              <Row icon={<Clock size={13} />} label="Last sign-in">
                {fmtDate(selected.last_sign_in_at)}
              </Row>

              <Row icon={<Store size={13} />} label="Storefronts">
                {selected.storefronts.length === 0
                  ? <span className="text-[#8a6d1f]">None — cannot list products</span>
                  : selected.storefronts.map(s => (
                      <span key={s.id} className="block">{s.name}</span>
                    ))}
              </Row>
            </dl>

            <div className="px-5 py-4">
              <a
                href={`/admin/applications?id=${selected.id}`}
                className="flex items-center justify-center gap-1.5 rounded-full border border-[#D5DBDA] bg-white py-2 text-[12.5px] font-medium text-[#004643] hover:bg-[#F1F4F4]"
              >
                <ExternalLink size={12} />
                View original application
              </a>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Row({
  icon, label, children,
}: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <dt className="flex shrink-0 items-center gap-1.5 text-[12px] text-[#8E9493]">
        <span className="text-[#B3B9B9]">{icon}</span>
        {label}
      </dt>
      <dd className="min-w-0 text-end text-[12.5px] text-[#101212]">{children}</dd>
    </div>
  );
}

export default function AdminDirectoryPage() {
  return (
    <AdminShell>
      <Suspense fallback={<div className="px-6 py-20" />}>
        <DirectoryInner />
      </Suspense>
    </AdminShell>
  );
}