"use client";

/**
 * Audit log — A12
 * ----------------------------------------------------------------------------
 * Every admin decision and intervention. Read-only, and said so on the screen:
 * an audit log you can edit is not an audit log, and an admin should be able to
 * see that this one can't be.
 *
 * Filter options come from the backend rather than a list in this file. A
 * hardcoded dropdown goes stale the first time someone adds an action type, and
 * an entry nobody can filter to is an entry nobody finds — the one failure this
 * screen must not have.
 */

import React, { Suspense, useCallback, useEffect, useState } from "react";
import {
  Search, Download, Lock, Loader2, AlertCircle, ChevronLeft, ChevronRight,
} from "lucide-react";

import AdminShell from "@/components/admin/AdminShell";
import {
  getAuditLog, auditExportUrl,
  type AuditLogEntry, type AuditLogResponse,
} from "@/lib/api/admin";

/** Readable names for the action groups the data produces. */
const GROUP_LABEL: Record<string, string> = {
  vendor: "Vendors",
  user: "Users",
  admin: "Admins",
  team: "Team",
  order: "Orders",
  refund: "Refunds",
};

/** Colour by consequence, not by subject. */
function actionTone(action: string): string {
  if (action.endsWith(".approved")) return "text-[#28603A]";
  if (action.endsWith(".rejected") || action.endsWith(".suspended")) return "text-[#812F28]";
  if (action.includes("role_changed") || action.includes("created")) return "text-[#004643]";
  return "text-[#4B4F4F]";
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function AuditInner() {
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [actor, setActor] = useState("all");
  const [action, setAction] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      getAuditLog({ search: search.trim() || undefined, actor, action, page })
        .then(res => {
          if (cancelled) return;
          if (res.success) { setData(res.data); setError(null); }
          else setError(typeof res.error === "string" ? res.error : "Could not load the audit log.");
        })
        .catch(() => !cancelled && setError("Could not load the audit log."))
        .finally(() => !cancelled && setLoading(false));
    }, search ? 300 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search, actor, action, page]);

  // Changing a filter while on page 4 would otherwise show an empty page of a
  // shorter result set.
  const setFilter = useCallback((fn: () => void) => { fn(); setPage(1); }, []);

  const clearFilters = useCallback(() => {
    setSearch(""); setActor("all"); setAction("all"); setPage(1);
  }, []);

  const hasFilters = Boolean(search.trim()) || actor !== "all" || action !== "all";
  const entries: AuditLogEntry[] = data?.entries ?? [];
  const total = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <div className="px-6 py-7 lg:px-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] text-[#101212]">Audit log</h1>
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[#646968]">
            <Lock size={11} className="text-[#8E9493]" />
            Every admin decision and intervention. Read-only — entries cannot be
            edited or removed.
          </p>
        </div>

        <a
          href={auditExportUrl({ search: search.trim() || undefined, actor, action })}
          className="flex items-center gap-1.5 rounded-full border border-[#D5DBDA] bg-white px-4 py-2 text-[12.5px] font-medium text-[#004643] transition-colors hover:bg-[#F1F4F4]"
        >
          <Download size={13} />
          Export CSV
        </a>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="relative">
          <Search size={13} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#8E9493]" />
          <input
            value={search}
            onChange={e => setFilter(() => setSearch(e.target.value))}
            placeholder="Search record, action or reason"
            className="w-[260px] rounded-full border border-[#D5DBDA] bg-white py-1.5 ps-8 pe-3 text-[12.5px] placeholder:text-[#B3B9B9] focus:border-[#87DDD7] focus:outline-none"
          />
        </span>

        <select
          value={actor}
          onChange={e => setFilter(() => setActor(e.target.value))}
          aria-label="Filter by admin"
          className="rounded-full border border-[#D5DBDA] bg-white px-3 py-1.5 text-[12.5px] text-[#343837] focus:border-[#87DDD7] focus:outline-none"
        >
          <option value="all">All admins</option>
          {(data?.actors ?? []).map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select
          value={action}
          onChange={e => setFilter(() => setAction(e.target.value))}
          aria-label="Filter by action type"
          className="rounded-full border border-[#D5DBDA] bg-white px-3 py-1.5 text-[12.5px] text-[#343837] focus:border-[#87DDD7] focus:outline-none"
        >
          <option value="all">All actions</option>
          {(data?.action_groups ?? []).map(g => (
            <option key={g} value={g}>{GROUP_LABEL[g] ?? g}</option>
          ))}
        </select>

        <span className="text-[12px] text-[#8E9493]">
          {loading ? "…" : `${total} ${total === 1 ? "entry" : "entries"}`}
        </span>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-[12px] text-[#004643] underline-offset-2 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#812F28]/25 bg-[#FFFAF9] p-3.5 text-[12.5px] text-[#812F28]">
          <AlertCircle size={15} className="mt-px shrink-0" />
          {error}
        </div>
      )}

      {/* Entries */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-[#D5DBDA] bg-white">
        <div className="hidden grid-cols-[150px_180px_1fr_1.4fr] gap-4 border-b border-[#E6EBEA] bg-[#FBFCFC] px-5 py-2.5 text-[11px] font-medium uppercase tracking-wide text-[#8E9493] lg:grid">
          <span>Time</span>
          <span>Admin</span>
          <span>Action</span>
          <span>Detail</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="h-4 w-4 animate-spin text-[#8E9493]" />
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="px-5 py-14 text-center">
            <div className="text-[14px] font-medium text-[#101212]">
              {hasFilters ? "No entries match" : "Nothing recorded yet"}
            </div>
            <p className="mt-1 text-[12.5px] text-[#646968]">
              {hasFilters
                ? "Try a different admin, action type or search term."
                : "Approvals, refunds, role changes and document views appear here."}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 rounded-full border border-[#D5DBDA] bg-white px-4 py-1.5 text-[12.5px] font-medium text-[#004643] hover:bg-[#F1F4F4]"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {!loading && entries.map(e => (
          <div
            key={e.id}
            className="grid grid-cols-1 gap-1 border-b border-[#F1F4F4] px-5 py-3 last:border-b-0 lg:grid-cols-[150px_180px_1fr_1.4fr] lg:items-baseline lg:gap-4"
          >
            <span className="text-[12px] tabular-nums text-[#646968]">{fmtTime(e.created_at)}</span>

            <span className="truncate text-[12px] text-[#4B4F4F]">
              {e.actor_email ?? "system"}
            </span>

            <span className="min-w-0">
              <span className={`block font-mono text-[11.5px] ${actionTone(e.action)}`}>
                {e.action}
              </span>
              {e.entity_id && (
                <span className="block truncate font-mono text-[10.5px] text-[#B3B9B9]">
                  {e.entity_type} · {e.entity_id}
                </span>
              )}
            </span>

            <span className="text-[12.5px] text-[#101212]">{e.summary ?? "—"}</span>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[12px] text-[#8E9493]">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-full border border-[#D5DBDA] bg-white px-3 py-1.5 text-[12px] text-[#343837] hover:bg-[#F1F4F4] disabled:opacity-40"
            >
              <ChevronLeft size={12} /> Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-full border border-[#D5DBDA] bg-white px-3 py-1.5 text-[12px] text-[#343837] hover:bg-[#F1F4F4] disabled:opacity-40"
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminAuditPage() {
  return (
    <AdminShell>
      <Suspense fallback={<div className="px-6 py-20" />}>
        <AuditInner />
      </Suspense>
    </AdminShell>
  );
}