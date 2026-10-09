"use client";

/**
 * Admin dashboard — A1
 * ----------------------------------------------------------------------------
 * A work queue, not a metrics board. The question it answers is "what is
 * waiting on me, and what has been waiting longest" — which is why the counts
 * at the top are pending items rather than totals, and why the KPIs sit at the
 * bottom as a footnote.
 *
 * "Waiting longest" spans every queue on purpose. The item that has been
 * ignored for eleven days is rarely in the queue you happened to open, and a
 * dashboard that only shows per-queue counts hides exactly that.
 *
 * Queues without a backend report available:false and render as "Not built
 * yet" rather than zero. Zero is a claim — it means nothing is waiting — and
 * this code cannot make it about listings or cancellations, because there is no
 * table to look in. On a screen whose entire job is telling an admin what they
 * have missed, an encouraging lie is the worst possible failure.
 */

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store, RotateCcw, PackageCheck, XCircle, LifeBuoy, Check, ChevronRight,
  Loader2, RefreshCw, ScrollText, AlertCircle,
} from "lucide-react";

import AdminShell from "@/components/admin/AdminShell";
import { getAdminOverview, type AdminOverview, type QueueSummary } from "@/lib/api/admin";

const QUEUE_ICON: Record<string, React.ReactNode> = {
  vendors: <Store size={15} />,
  refunds: <RotateCcw size={15} />,
  listings: <PackageCheck size={15} />,
  cancellations: <XCircle size={15} />,
  support: <LifeBuoy size={15} />,
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Age of the oldest item, phrased the way someone would say it aloud. */
function ageLabel(iso: string | null): string {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days >= 1) return `oldest ${days}d`;
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours >= 1) return `oldest ${hours}h`;
  return "just now";
}

function fullAge(iso: string | null): string {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return "Just now";
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function DashboardInner() {
  const router = useRouter();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await getAdminOverview();
      if (res.success) {
        setData(res.data);
        setLoadedAt(new Date());
        setError(null);
      } else {
        setError(typeof res.error === "string" ? res.error : "Could not load the dashboard.");
      }
    } catch {
      setError("Could not load the dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Counts go stale while a tab sits open all afternoon. Rather than claiming
  // they're live, say when they were taken and offer a refresh.
  const [stale, setStale] = useState(false);
  useEffect(() => {
    if (!loadedAt) return;
    const t = setTimeout(() => setStale(true), 5 * 60_000);
    setStale(false);
    return () => clearTimeout(t);
  }, [loadedAt]);

  if (loading) {
    return (
      <div className="flex items-center justify-center px-6 py-24">
        <Loader2 className="h-5 w-5 animate-spin text-[#004643]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-6 py-10 lg:px-10">
        <div className="flex items-start gap-2.5 rounded-xl border border-[#812F28]/25 bg-[#FFFAF9] p-4 text-[12.5px] text-[#812F28]">
          <AlertCircle size={15} className="mt-px shrink-0" />
          {error ?? "No data"}
        </div>
      </div>
    );
  }

  const live = data.queues.filter(q => q.available);
  const unbuilt = data.queues.filter(q => !q.available);
  const allClear = data.total_waiting === 0;

  return (
    <div className="px-6 py-7 lg:px-10">
      <div>
        <h1 className="text-[24px] text-[#101212]">{greeting()}, Shahriar</h1>
        <p className="mt-1 text-[12.5px] text-[#646968]">
          {allClear
            ? "Nothing waiting across your queues."
            : `${data.total_waiting} item${data.total_waiting === 1 ? "" : "s"} waiting across your queues. Oldest first.`}
        </p>
      </div>

      {stale && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E6EBEA] bg-white p-3 text-[12px] text-[#646968]">
          <span>
            Counts are from {loadedAt?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} and may not match the queues.
          </span>
          <button
            onClick={() => void load(true)}
            className="flex items-center gap-1.5 rounded-full border border-[#D5DBDA] bg-white px-3 py-1 text-[12px] font-medium text-[#004643] hover:bg-[#F1F4F4]"
          >
            <RefreshCw size={11} />
            Refresh now
          </button>
        </div>
      )}

      {/* Queues */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {live.map(q => (
          <QueueCard key={q.key} queue={q} onClick={() => router.push(q.href)} />
        ))}
        {unbuilt.map(q => (
          <QueueCard key={q.key} queue={q} />
        ))}
      </div>

      {allClear ? (
        <div className="mt-6 rounded-2xl border border-[#D5DBDA] bg-white py-14 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#E7FBEB] text-[#28603A]">
            <Check size={22} strokeWidth={3} />
          </span>
          <div className="text-[15px] font-medium text-[#101212]">All queues are clear</div>
          <p className="mt-1 text-[12.5px] text-[#646968]">
            Nothing waiting on you right now.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {/* Waiting longest */}
          <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5">
            <h2 className="text-[13px] font-medium text-[#101212]">Waiting longest</h2>
            <div className="mt-3 divide-y divide-[#F1F4F4]">
              {data.oldest.map(item => (
                <button
                  key={`${item.queue}-${item.ref}`}
                  onClick={() => router.push(item.href)}
                  className="flex w-full items-center gap-3 py-2.5 text-start transition-colors hover:bg-[#FBFCFC]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] text-[#8E9493]">{item.queue}</span>
                    <span className="block truncate text-[12.5px] text-[#101212]">{item.title}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-[#812F28]">{fullAge(item.since)}</span>
                  <ChevronRight size={14} className="shrink-0 text-[#B3B9B9]" />
                </button>
              ))}
            </div>
          </section>

          {/* Recent interventions */}
          <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[13px] font-medium text-[#101212]">Recent interventions</h2>
              <span
                title="Not built yet"
                className="flex cursor-not-allowed items-center gap-1 text-[11.5px] text-[#B3B9B9]"
              >
                <ScrollText size={11} />
                Audit log
              </span>
            </div>

            {data.interventions.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-[#8E9493]">
                Nothing recorded yet. Approvals, refunds and role changes appear here.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-[#F1F4F4]">
                {data.interventions.map(a => (
                  <div key={a.id} className="py-2.5">
                    <span className="block text-[12.5px] text-[#101212]">
                      {a.summary || a.action}
                    </span>
                    <span className="block text-[11px] text-[#8E9493]">
                      {a.actor_name} · {fmtWhen(a.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* KPIs — deliberately last and quiet. Useful context, not the job. */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Users" value={data.kpis.total_users} />
        <Kpi label="Vendors" value={data.kpis.total_vendors} sub={`${data.kpis.approved_vendors} approved`} />
        <Kpi label="Orders" value={data.kpis.total_orders} />
        <Kpi label="Waiting on you" value={data.total_waiting} sub="across live queues" />
      </div>
    </div>
  );
}

function QueueCard({ queue, onClick }: { queue: QueueSummary; onClick?: () => void }) {
  if (!queue.available) {
    return (
      <div
        title="Not built yet"
        className="flex items-center gap-3 rounded-2xl border border-dashed border-[#D5DBDA] bg-transparent px-4 py-3.5"
      >
        <span className="text-[#B3B9B9]">{QUEUE_ICON[queue.key]}</span>
        <span className="flex-1 text-[13px] text-[#B3B9B9]">{queue.label}</span>
        <span className="text-[11px] text-[#B3B9B9]">Not built yet</span>
      </div>
    );
  }

  const empty = queue.count === 0;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-[#D5DBDA] bg-white px-4 py-3.5 text-start transition-colors hover:border-[#87DDD7] hover:bg-[#FBFCFC]"
    >
      <span className={empty ? "text-[#8E9493]" : "text-[#004643]"}>{QUEUE_ICON[queue.key]}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] text-[#101212]">{queue.label}</span>
        {!empty && (
          <span className="block text-[11px] text-[#8E9493]">{ageLabel(queue.oldest)}</span>
        )}
      </span>
      <span
        className={`text-[18px] font-semibold tabular-nums ${empty ? "text-[#B3B9B9]" : "text-[#004643]"}`}
      >
        {queue.count}
      </span>
    </button>
  );
}

function Kpi({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[#E6EBEA] bg-white px-4 py-3">
      <span className="block text-[11px] text-[#8E9493]">{label}</span>
      <span className="mt-0.5 block text-[19px] font-semibold text-[#101212]">{value}</span>
      {sub && <span className="block text-[11px] text-[#8E9493]">{sub}</span>}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminShell>
      <Suspense fallback={<div className="px-6 py-20" />}>
        <DashboardInner />
      </Suspense>
    </AdminShell>
  );
}