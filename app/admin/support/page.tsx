"use client";

/**
 * Support tickets — admin
 * ----------------------------------------------------------------------------
 * Customers and vendors open tickets from their side; they land here as
 * "open" (waiting on Nooi). Replying moves a ticket to "waiting" (on them) or
 * straight to "resolved". A reply from them reopens it. Each reply notifies
 * the requester in the app.
 */

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Search, Send, CheckCircle2, Store, User, AlertCircle } from "lucide-react";

import AdminShell from "@/components/admin/AdminShell";
import {
  listSupportTickets, getSupportTicket, replySupportTicket, setSupportStatus,
  type TicketRow, type TicketMessage,
} from "@/lib/api/admin";

const TABS = [
  { key: "open", label: "Waiting on us" },
  { key: "waiting", label: "Waiting on them" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
];
const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "Waiting on us", cls: "bg-[#FFF6E5] text-[#8A5A00]" },
  waiting: { label: "Waiting on them", cls: "bg-[#EEF2FF] text-[#3B4CA8]" },
  resolved: { label: "Resolved", cls: "bg-[#E7FBEB] text-[#28603A]" },
};
const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const errText = (e: unknown, f: string) => (typeof e === "string" ? e : f);

function Queue({ onOpen }: { onOpen: (id: string) => void }) {
  const [tab, setTab] = useState("open");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<TicketRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      listSupportTickets(tab, search.trim() || undefined).then(res => {
        if (!alive) return;
        if (res.success) { setRows(res.data.tickets); setCounts(res.data.counts); setError(null); }
        else setError(errText(res.error, "Could not load tickets."));
      });
    }, search ? 300 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [tab, search]);

  return (
    <div className="px-6 py-7 lg:px-10">
      <h1 className="text-[24px] text-[#101212]">Support</h1>
      <p className="mt-1 text-[12.5px] text-[#646968]">Tickets from customers and vendors. Longest waiting first.</p>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setRows(null); }} aria-pressed={tab === t.key}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] ${tab === t.key ? "border-[#004643] bg-[#004643] text-white" : "border-[#D5DBDA] bg-white text-[#343837] hover:bg-[#F1F4F4]"}`}>
            {t.label}
            {counts[t.key] !== undefined && <span className={tab === t.key ? "text-white/60" : "text-[#8E9493]"}>{counts[t.key]}</span>}
          </button>
        ))}
        <span className="relative ms-auto">
          <Search size={13} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#8E9493]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Subject or ticket #"
            className="w-56 rounded-full border border-[#D5DBDA] bg-white py-1.5 pe-3 ps-8 text-[12.5px] focus:outline-none" />
        </span>
      </div>
      <section className="mt-4 rounded-2xl border border-[#D5DBDA] bg-white">
        {error && <p className="p-5 text-[12.5px] text-[#812F28]">{error}</p>}
        {!error && rows === null && <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-[#004643]" /></div>}
        {rows?.length === 0 && <p className="p-8 text-center text-[12.5px] text-[#8E9493]">No tickets here.</p>}
        {rows?.map(t => (
          <button key={t.id} onClick={() => onOpen(t.id)}
            className="grid w-full grid-cols-1 gap-1 border-b border-[#F1F4F4] px-5 py-3.5 text-start last:border-b-0 hover:bg-[#FBFCFC] lg:grid-cols-[70px_2fr_1.2fr_0.8fr_0.9fr] lg:items-center lg:gap-3">
            <span className="font-mono text-[12px] text-[#8E9493]">#{t.number}</span>
            <span className="min-w-0">
              <span className={`block truncate text-[13px] ${t.admin_unread ? "font-semibold text-[#101212]" : "text-[#343837]"}`}>{t.subject}</span>
              <span className="block text-[11px] capitalize text-[#8E9493]">{t.category}{t.orders?.order_number ? ` · ${t.orders.order_number}` : ""}</span>
            </span>
            <span className="flex items-center gap-1.5 truncate text-[12px] text-[#4B4F4F]">
              {t.requester_role === "vendor" ? <Store size={12} /> : <User size={12} />}{t.requester_name ?? (t.requester_role === "vendor" ? "Vendor" : "Customer")}
            </span>
            <span><span className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${STATUS[t.status].cls}`}>{STATUS[t.status].label}</span></span>
            <span className="text-[11.5px] text-[#8E9493]">{when(t.last_message_at)}</span>
          </button>
        ))}
      </section>
    </div>
  );
}

function Thread({ id, onBack }: { id: string; onBack: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [requester, setRequester] = useState<{ name: string | null; role: string | null; email: string | null } | null>(null);
  const [reply, setReply] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    getSupportTicket(id).then(res => {
      if (!alive) return;
      if (res.success) { setTicket(res.data.ticket); setMessages(res.data.messages); setRequester(res.data.requester); setError(null); }
      else setError(errText(res.error, "Could not load this ticket."));
    });
    return () => { alive = false; };
  }, [id, version]);

  const send = async (status: "waiting" | "resolved") => {
    if (!reply.trim()) return;
    setWorking(true); setError(null);
    const res = await replySupportTicket(id, reply.trim(), status);
    setWorking(false);
    if (!res.success) { setError(errText(res.error, "Could not send.")); return; }
    setReply(""); setVersion(v => v + 1);
  };
  const changeStatus = async (status: "open" | "waiting" | "resolved") => {
    await setSupportStatus(id, status); setVersion(v => v + 1);
  };

  if (!ticket) {
    return (
      <div className="px-6 py-10 lg:px-10">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] text-[#646968]"><ArrowLeft size={13} /> Support</button>
        {error ? <p className="mt-6 text-[13px] text-[#812F28]">{error}</p> : <Loader2 className="mt-10 h-5 w-5 animate-spin text-[#004643]" />}
      </div>
    );
  }
  const who = ticket.requester_role === "vendor" ? "Vendor" : "Customer";

  return (
    <div className="px-6 py-7 lg:px-10">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] text-[#646968] hover:text-[#004643]"><ArrowLeft size={13} /> Support</button>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] text-[#101212]"><span className="font-mono text-[#8E9493]">#{ticket.number}</span> {ticket.subject}</h1>
          <p className="mt-1 text-[12.5px] text-[#646968]">
            {who} · {requester?.name ?? "—"}{requester?.email ? ` · ${requester.email}` : ""} · <span className="capitalize">{ticket.category}</span>
            {ticket.orders?.order_number && <> · <Link className="text-[#004643] underline" href={`/admin/orders?id=${ticket.orders.id}`}>{ticket.orders.order_number}</Link></>}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11.5px] font-medium ${STATUS[ticket.status].cls}`}>{STATUS[ticket.status].label}</span>
      </div>
      {error && <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#812F28]/25 bg-[#FFFAF9] p-3 text-[12.5px] text-[#812F28]"><AlertCircle size={14} /> {error}</div>}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_260px]">
        <section className="rounded-2xl border border-[#D5DBDA] bg-white p-5">
          <div className="space-y-3">
            {messages.map(m => (
              <div key={m.id} className={`max-w-[85%] rounded-2xl p-3.5 text-[13px] ${m.author_role === "admin" ? "ms-auto bg-[#E9F7F5]" : "bg-[#F4F6F6]"}`}>
                <div className="mb-1 text-[11px] text-[#8E9493]">{m.author_role === "admin" ? "Nooi" : who} · {when(m.created_at)}</div>
                <div className="whitespace-pre-wrap text-[#101212]">{m.body}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-[#F1F4F4] pt-4">
            <textarea value={reply} onChange={e => setReply(e.target.value)} rows={4} placeholder={`Reply to the ${who.toLowerCase()}…`}
              className="w-full rounded-xl border border-[#D5DBDA] p-3 text-[13px] focus:outline-none" />
            <div className="mt-2 flex flex-wrap gap-2">
              <button disabled={working || !reply.trim()} onClick={() => send("waiting")}
                className="flex items-center gap-1.5 rounded-full bg-[#004643] px-4 py-2 text-[12px] font-medium text-white disabled:opacity-50">
                {working ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send
              </button>
              <button disabled={working || !reply.trim()} onClick={() => send("resolved")}
                className="flex items-center gap-1.5 rounded-full border border-[#D5DBDA] px-4 py-2 text-[12px] font-medium text-[#004643] disabled:opacity-50">
                <CheckCircle2 size={12} /> Send and resolve
              </button>
            </div>
          </div>
        </section>
        <section className="h-fit rounded-2xl border border-[#D5DBDA] bg-white p-5 text-[12.5px]">
          <h2 className="text-[13px] font-medium text-[#101212]">Status</h2>
          <div className="mt-3 space-y-2">
            {(["open", "waiting", "resolved"] as const).map(s => (
              <button key={s} disabled={ticket.status === s} onClick={() => changeStatus(s)}
                className={`w-full rounded-full border px-3 py-1.5 text-[12px] ${ticket.status === s ? "border-[#004643] bg-[#004643] text-white" : "border-[#D5DBDA] text-[#343837] hover:bg-[#F1F4F4]"}`}>
                {STATUS[s].label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[#8E9493]">Opened {when(ticket.created_at)}</p>
        </section>
      </div>
    </div>
  );
}

function Inner() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  return id
    ? <Thread id={id} onBack={() => router.push("/admin/support")} />
    : <Queue onOpen={x => router.push(`/admin/support?id=${x}`)} />;
}

export default function AdminSupportPage() {
  return <AdminShell><Suspense fallback={null}><Inner /></Suspense></AdminShell>;
}
