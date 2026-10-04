"use client";

/**
 * Vendor applications — A2
 * ----------------------------------------------------------------------------
 * Lives at /admin/applications, not /admin/vendors. The design has a separate
 * A8 "Vendor directory" for browsing approved vendors, and one route cannot be
 * both — you review applications, you browse vendors.
 *
 * Queue and detail as two states of one route, with the selection in the URL
 * (?id=). That makes a specific application shareable — "can you look at this
 * one" is the most common thing said about an approval queue — and the back
 * button behaves.
 *
 * Three pieces of this exist because approval is a shared, consequential job
 * rather than a form:
 *
 *   Duplicate CR      Two vendors on one registration number. Reported, never
 *                     blocked: a second outlet legitimately shares a CR, and so
 *                     does a fraudulent reapplication after rejection. The
 *                     difference is a phone call.
 *
 *   Review claim      Opening an application claims it, so a second admin sees
 *                     that someone is already reading and goes read-only. The
 *                     claim is advisory and goes stale after ten minutes —
 *                     someone who stepped away shouldn't block the queue — and
 *                     correctness comes from the decision being atomic, not
 *                     from the lock.
 *
 *   Already decided   If someone decided while you were reading, the backend
 *                     returns 409 and the screen says who and when rather than
 *                     reporting a failure. Nothing went wrong; the work was
 *                     already done.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, ArrowLeft, Loader2, AlertTriangle, Eye, Check, X, FileText,
  ExternalLink, Clock, Building2, MapPin, CreditCard, Info, ShieldAlert,
} from "lucide-react";

import AdminShell from "@/components/admin/AdminShell";
import {
  getVendorQueue, getVendorForReview, claimVendorReview, decideVendorApplication,
  waitingDays, waitingBand,
  type QueueVendor, type QueueCounts, type QueueTab, type QueueSort,
  type ReviewVendor, type DuplicateVendor, type ClaimResponse,
} from "@/lib/api/admin";

const TABS: { key: QueueTab; label: string }[] = [
  { key: "pending", label: "Awaiting review" },
  { key: "done", label: "Decided" },
  { key: "all", label: "All" },
];

const SORTS: { key: QueueSort; label: string }[] = [
  { key: "oldest", label: "Longest waiting" },
  { key: "newest", label: "Newest first" },
  { key: "vendor", label: "Business name" },
];

const BAND_STYLE: Record<string, string> = {
  fresh: "text-[#646968]",
  due: "text-[#8a6d1f]",
  overdue: "text-[#812F28] font-medium",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-[#F1F4F4] text-[#646968]",
  approved: "bg-[#E7FBEB] text-[#28603A]",
  rejected: "bg-[#FFFAF9] text-[#812F28]",
  suspended: "bg-[#FFFBF2] text-[#8a6d1f]",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function minutesSince(iso: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

// ─── Queue ───────────────────────────────────────────────────────────────────

function Queue({ onOpen }: { onOpen: (id: string) => void }) {
  const [tab, setTab] = useState<QueueTab>("pending");
  const [sort, setSort] = useState<QueueSort>("oldest");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<QueueVendor[]>([]);
  const [counts, setCounts] = useState<QueueCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      getVendorQueue({ tab, sort, search: search.trim() || undefined })
        .then(res => {
          if (cancelled) return;
          if (res.success) {
            setRows(res.data.vendors);
            setCounts(res.data.counts);
            setError(null);
          } else {
            setError(typeof res.error === "string" ? res.error : "Could not load the queue.");
          }
        })
        .catch(() => !cancelled && setError("Could not load the queue."))
        .finally(() => !cancelled && setLoading(false));
    }, search ? 300 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [tab, sort, search]);

  const tabCount = (k: QueueTab) =>
    counts ? (k === "pending" ? counts.pending : k === "done" ? counts.done : counts.all) : undefined;

  return (
    <div className="px-6 py-7 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] text-[#101212]">Vendor applications</h1>
          <p className="mt-1 text-[12.5px] text-[#646968]">
            Response target: 2 business days
          </p>
        </div>
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
            {tabCount(t.key) !== undefined && (
              <span className={tab === t.key ? "text-white/60" : "text-[#8E9493]"}>
                {tabCount(t.key)}
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

        <select
          value={sort}
          onChange={e => setSort(e.target.value as QueueSort)}
          aria-label="Sort"
          className="rounded-full border border-[#D5DBDA] bg-white px-3 py-1.5 text-[12.5px] text-[#343837] focus:border-[#87DDD7] focus:outline-none"
        >
          {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#D5DBDA] bg-white">
        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-[#E6EBEA] bg-[#FBFCFC] px-5 py-2.5 text-[11px] font-medium uppercase tracking-wide text-[#8E9493] md:grid">
          <span>Business</span>
          <span>Type</span>
          <span>Submitted</span>
          <span>Waiting</span>
          <span>Flags</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-14 text-[12.5px] text-[#8E9493]">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="px-5 py-10 text-center text-[12.5px] text-[#812F28]">{error}</div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="px-5 py-14 text-center">
            <div className="text-[14px] font-medium text-[#101212]">
              {search ? "Nothing matches that search" : "No applications here"}
            </div>
            <p className="mt-1 text-[12.5px] text-[#646968]">
              {search
                ? "Try a business name, city or email address."
                : tab === "pending"
                  ? "Every application has been reviewed."
                  : "Decided applications will appear here."}
            </p>
          </div>
        )}

        {!loading && !error && rows.map(v => {
          const days = waitingDays(v.submitted_at);
          const band = waitingBand(days);

          return (
            <button
              key={v.id}
              onClick={() => onOpen(v.id)}
              className="grid w-full grid-cols-1 gap-1 border-b border-[#F1F4F4] px-5 py-3.5 text-start transition-colors last:border-b-0 hover:bg-[#FBFCFC] md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-center md:gap-4"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-[#101212]">
                  {v.business_name}
                </span>
                <span className="block truncate text-[11px] text-[#8E9493]">
                  {v.city ? `${v.city} · ` : ""}{v.business_email}
                </span>
              </span>

              <span className="text-[12px] capitalize text-[#4B4F4F]">
                {v.fulfillment_type ?? "—"}
              </span>

              <span className="text-[12px] text-[#4B4F4F]">{fmtDate(v.submitted_at)}</span>

              <span className={`text-[12px] ${BAND_STYLE[band]}`}>
                {v.status === "pending"
                  ? days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"}`
                  : <span className={`rounded-full px-2 py-0.5 text-[10.5px] ${STATUS_STYLE[v.status]}`}>
                      {v.status}
                    </span>}
              </span>

              <span className="flex items-center gap-1.5">
                {v.document_count === 0 && (
                  <span
                    title="No documents provided"
                    className="rounded-full bg-[#FFFBF2] px-2 py-0.5 text-[10.5px] font-medium text-[#8a6d1f]"
                  >
                    No docs
                  </span>
                )}
                {v.review_claim_live && (
                  <span
                    title={`${v.reviewing_by_name ?? "Someone"} is reviewing`}
                    className="flex items-center gap-1 rounded-full bg-[#F3FEFD] px-2 py-0.5 text-[10.5px] font-medium text-[#004643]"
                  >
                    <Eye size={9} />
                    In review
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Detail ──────────────────────────────────────────────────────────────────

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const [vendor, setVendor] = useState<ReviewVendor | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateVendor[]>([]);
  const [claim, setClaim] = useState<ClaimResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<{ status: string; who: string | null; at: string | null } | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVendorForReview(id);
      if (!res.success) {
        setError(typeof res.error === "string" ? res.error : "Could not load this application.");
        return;
      }
      setVendor(res.data.vendor);
      setDuplicates(res.data.duplicates);
      setError(null);

      // Claiming on open is what makes the lock useful — an admin shouldn't
      // have to press anything to signal they're looking.
      if (res.data.vendor.status === "pending") {
        const c = await claimVendorReview(id);
        if (c.success) setClaim(c.data);
      }
    } catch {
      setError("Could not load this application.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const takeOver = useCallback(async () => {
    const c = await claimVendorReview(id, true);
    if (c.success) setClaim(c.data);
  }, [id]);

  const submit = useCallback(async () => {
    if (!decision) return;
    if (decision === "rejected" && !reason.trim()) return;

    setSaving(true);
    setConflict(null);
    try {
      const res = await decideVendorApplication(
        id, decision, decision === "rejected" ? reason.trim() : undefined,
      );

      if (res.success) {
        setDone(res.data.final_status);
        await load();
        return;
      }

      // 409: someone decided first. Not a failure — report what happened.
      const err: any = res.error;
      if (err === "already_decided" || String(err).includes("already_decided")) {
        setConflict({ status: "decided", who: null, at: null });
        await load();
        return;
      }
      setError(typeof err === "string" ? err : "Could not save that decision.");
    } catch {
      setError("Could not save that decision.");
    } finally {
      setSaving(false);
    }
  }, [id, decision, reason, load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center px-6 py-20">
        <Loader2 className="h-5 w-5 animate-spin text-[#004643]" />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="px-6 py-10 lg:px-10">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] text-[#646968] hover:text-[#004643]">
          <ArrowLeft size={13} /> Back to queue
        </button>
        <p className="mt-6 text-[13px] text-[#812F28]">{error ?? "Not found"}</p>
      </div>
    );
  }

  const days = waitingDays(vendor.submitted_at);
  const decided = vendor.status !== "pending";
  // Someone else holds a live claim: read-only until taken over.
  const lockedByOther = Boolean(claim && !claim.acquired && claim.holder && !claim.is_me);
  const canDecide = !decided && !lockedByOther;

  return (
    <div className="px-6 py-7 lg:px-10">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] text-[#646968] transition-colors hover:text-[#004643]">
        <ArrowLeft size={13} /> Back to queue
      </button>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-[11.5px] text-[#8E9493]">
            Submitted {fmtDate(vendor.submitted_at)}
            {!decided && ` · waiting ${days} day${days === 1 ? "" : "s"}`}
          </span>
          <h1 className="mt-0.5 text-[24px] text-[#101212]">{vendor.business_name}</h1>
          <span className="flex items-center gap-1.5 text-[12.5px] text-[#646968]">
            <span className="capitalize">{vendor.fulfillment_type ?? "—"}</span>
            {vendor.city && (<><span className="text-[#D5DBDA]">·</span><MapPin size={11} />{vendor.city}</>)}
            {vendor.category && (<><span className="text-[#D5DBDA]">·</span>{vendor.category}</>)}
          </span>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11.5px] font-medium capitalize ${STATUS_STYLE[vendor.status]}`}>
          {vendor.status}
        </span>
      </div>

      {/* Banners, most consequential first */}
      <div className="mt-5 space-y-2.5">
        {duplicates.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#8a6d1f]/25 bg-[#FFFBF2] p-3.5 text-[12.5px] text-[#4B4F4F]">
            <AlertTriangle size={15} className="mt-px shrink-0 text-[#8a6d1f]" />
            <span>
              <strong className="text-[#101212]">Registration number already in use.</strong>{" "}
              CR {vendor.cr_number} also belongs to{" "}
              {duplicates.map((d, i) => (
                <span key={d.id}>
                  {i > 0 && ", "}
                  <strong className="text-[#101212]">{d.business_name}</strong>
                  {d.city ? ` (${d.city})` : ""}
                </span>
              ))}
              . This may be a second outlet of the same business, or a
              reapplication after a rejection — worth confirming before deciding.
            </span>
          </div>
        )}

        {lockedByOther && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#87DDD7] bg-[#F3FEFD] p-3.5 text-[12.5px] text-[#004643]">
            <span className="flex items-start gap-2.5">
              <Eye size={15} className="mt-px shrink-0" />
              <span>
                <strong>{claim?.holder_name ?? "Another admin"}</strong> is reviewing this —
                opened {minutesSince(claim?.claimed_at ?? null)} min ago. You're viewing
                read-only. The first decision submitted wins.
              </span>
            </span>
            <button
              onClick={takeOver}
              className="shrink-0 rounded-full border border-[#004643] bg-white px-3 py-1.5 text-[12px] font-medium text-[#004643] hover:bg-[#F1F4F4]"
            >
              Take over
            </button>
          </div>
        )}

        {decided && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#D5DBDA] bg-white p-3.5 text-[12.5px] text-[#4B4F4F]">
            <Info size={15} className="mt-px shrink-0 text-[#646968]" />
            <span>
              <strong className="capitalize text-[#101212]">{vendor.status}</strong>
              {vendor.decided_by_name ? ` by ${vendor.decided_by_name}` : ""}
              {vendor.decided_at ? ` at ${fmtWhen(vendor.decided_at)}` : ""}.
              {vendor.rejection_reason && (
                <span className="mt-1 block text-[#646968]">{vendor.rejection_reason}</span>
              )}
            </span>
          </div>
        )}

        {conflict && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#8a6d1f]/25 bg-[#FFFBF2] p-3.5 text-[12.5px] text-[#4B4F4F]">
            <ShieldAlert size={15} className="mt-px shrink-0 text-[#8a6d1f]" />
            <span>
              Someone decided this while you were reading, so your decision wasn't
              applied. The outcome above is the one that stands.
            </span>
          </div>
        )}

        {done && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#28603A]/25 bg-[#E7FBEB] p-3.5 text-[12.5px] text-[#28603A]">
            <Check size={15} className="mt-px shrink-0" strokeWidth={3} />
            <span>Application {done}. The vendor has been notified.</span>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {/* Legal */}
          <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5">
            <h2 className="flex items-center gap-2 text-[13px] font-medium text-[#101212]">
              <Building2 size={14} className="text-[#646968]" />
              Legal and registration
            </h2>
            <dl className="mt-3 divide-y divide-[#F1F4F4]">
              <Row label="Commercial registration" value={vendor.cr_number} mono />
              <Row label="VAT number" value={vendor.vat_number} mono />
              <Row label="Tax ID" value={vendor.tax_id} mono />
              <Row label="Registered address" value={vendor.address} />
              <Row label="Contact" value={vendor.business_email} />
              <Row label="Phone" value={vendor.phone} />
              <Row label="Website" value={vendor.website} link />
            </dl>
          </section>

          {/* Documents */}
          <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5">
            <h2 className="flex items-center gap-2 text-[13px] font-medium text-[#101212]">
              <FileText size={14} className="text-[#646968]" />
              Documents
            </h2>
            {vendor.legal_documents.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-[#8a6d1f]">
                No documents provided. Worth asking for a trade licence before approving.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-[#F1F4F4]">
                {vendor.legal_documents.map(doc => (
                  <li key={doc.path} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] text-[#101212]">{doc.label}</span>
                      <span className="block text-[11px] text-[#8E9493]">
                        Uploaded {fmtDate(doc.uploaded_at)}
                      </span>
                    </span>
                    <button
                      disabled
                      title="Document viewing needs the private storage bucket"
                      className="flex shrink-0 cursor-not-allowed items-center gap-1 rounded-full border border-[#D5DBDA] px-2.5 py-1 text-[11.5px] text-[#B3B9B9]"
                    >
                      <ExternalLink size={11} />
                      View
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {vendor.description && (
            <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5">
              <h2 className="text-[13px] font-medium text-[#101212]">About the business</h2>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[#4B4F4F]">
                {vendor.description}
              </p>
            </section>
          )}
        </div>

        {/* Decision */}
        <div className="space-y-5">
          <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5">
            <h2 className="flex items-center gap-2 text-[13px] font-medium text-[#101212]">
              <CreditCard size={14} className="text-[#646968]" />
              Payout account
            </h2>
            <p className={`mt-2 text-[12.5px] ${vendor.payout_connected ? "text-[#28603A]" : "text-[#8a6d1f]"}`}>
              {vendor.payout_connected
                ? "Connected"
                : "Not connected. They can be approved, but can't be paid until it's set up."}
            </p>
          </section>

          <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5 lg:sticky lg:top-7">
            <h2 className="text-[13px] font-medium text-[#101212]">Decision</h2>

            {!canDecide ? (
              <p className="mt-2 text-[12.5px] text-[#8E9493]">
                {decided
                  ? "This application has already been decided."
                  : "Read-only while another admin is reviewing."}
              </p>
            ) : (
              <>
                <div className="mt-3 space-y-1.5">
                  {([
                    { v: "approved" as const, label: "Approve", hint: "They can list products immediately." },
                    { v: "rejected" as const, label: "Reject", hint: "They'll see the reason you give." },
                  ]).map(opt => (
                    <label
                      key={opt.v}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-[12.5px] transition-colors ${
                        decision === opt.v
                          ? "border-[#87DDD7] bg-[#F3FEFD]"
                          : "border-[#E6EBEA] hover:bg-[#FBFCFC]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="decision"
                        checked={decision === opt.v}
                        onChange={() => setDecision(opt.v)}
                        className="sr-only"
                      />
                      <span
                        className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                          decision === opt.v ? "border-[#004643] bg-[#004643]" : "border-[#D5DBDA]"
                        }`}
                      >
                        {decision === opt.v && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      <span>
                        <span className="block font-medium text-[#101212]">{opt.label}</span>
                        <span className="block text-[11px] text-[#8E9493]">{opt.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>

                {decision === "rejected" && (
                  <label className="mt-3 block">
                    <span className="text-[11.5px] font-medium text-[#101212]">
                      Reason — the vendor sees this
                    </span>
                    <textarea
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      rows={3}
                      placeholder="What would they need to change to reapply successfully?"
                      className="mt-1.5 w-full resize-none rounded-xl border border-[#D5DBDA] px-3 py-2 text-[12.5px] placeholder:text-[#B3B9B9] focus:border-[#87DDD7] focus:outline-none"
                    />
                  </label>
                )}

                <button
                  onClick={submit}
                  disabled={!decision || saving || (decision === "rejected" && !reason.trim())}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#004643] py-2.5 text-[12.5px] font-medium text-white transition-colors hover:bg-[#003836] disabled:opacity-40"
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  {decision === "rejected" ? "Reject application" : "Approve vendor"}
                </button>

                {decision === "approved" && (
                  <p className="mt-2 flex items-start gap-1.5 text-[11px] text-[#8E9493]">
                    <Clock size={11} className="mt-px shrink-0" />
                    They can list products as soon as this is saved.
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({
  label, value, mono = false, link = false,
}: { label: string; value: string | null; mono?: boolean; link?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-2.5">
      <dt className="shrink-0 text-[12px] text-[#8E9493]">{label}</dt>
      <dd className={`min-w-0 truncate text-end text-[12.5px] ${value ? "text-[#101212]" : "text-[#B3B9B9]"} ${mono && value ? "font-mono" : ""}`}>
        {value
          ? link
            ? <a href={value} target="_blank" rel="noreferrer" className="hover:underline">{value}</a>
            : value
          : "Not provided"}
      </dd>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function ApplicationsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("id");

  const open = useCallback(
    (id: string) => router.push(`/admin/applications?id=${encodeURIComponent(id)}`),
    [router],
  );
  const back = useCallback(() => router.push("/admin/applications"), [router]);

  return selected
    ? <Detail id={selected} onBack={back} />
    : <Queue onOpen={open} />;
}

export default function AdminApplicationsPage() {
  return (
    <AdminShell>
      <Suspense fallback={<div className="px-6 py-20" />}>
        <ApplicationsInner />
      </Suspense>
    </AdminShell>
  );
}