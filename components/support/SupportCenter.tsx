"use client";

/**
 * Support Center — customers (/support) and vendors (Support in their dashboard)
 * ----------------------------------------------------------------------------
 * List of my tickets, "New ticket", and a conversation view. Nooi's admins
 * answer from /admin/support; their replies show here and arrive as a
 * notification. Replying to a resolved ticket reopens it.
 *
 * `initialOrderId` (e.g. /support?order=…) pre-links a new ticket to an order.
 */

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Send, Plus, MessageCircle, AlertCircle } from "lucide-react";
import {
  listMyTickets, createTicket, getMyTicket, replyToTicket, SUPPORT_CATEGORIES,
  type MyTicket, type SupportMessage,
} from "@/lib/api/support";
import { PhotoPicker, MessagePhotos } from "@/components/support/SupportPhotos";

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "With Nooi", cls: "bg-[#FFF6E5] text-[#8A5A00]" },
  waiting: { label: "Nooi replied", cls: "bg-[#EAF7F5] text-[#004643]" },
  resolved: { label: "Resolved", cls: "bg-[#F1F4F4] text-[#646968]" },
};
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const errText = (e: unknown, f: string) => (typeof e === "string" ? e : f);
const input = "mt-1 w-full rounded-xl border border-[#D5DBDA] bg-white px-3.5 py-2.5 text-[13px] focus:border-[#87DDD7] focus:outline-none";

export default function SupportCenter({
  audience = "customer",
  initialTicketId,
  initialOrderId,
}: {
  audience?: "customer" | "vendor";
  initialTicketId?: string | null;
  initialOrderId?: string | null;
}) {
  const [view, setView] = useState<{ kind: "list" } | { kind: "new" } | { kind: "ticket"; id: string }>(
    initialTicketId ? { kind: "ticket", id: initialTicketId } : initialOrderId ? { kind: "new" } : { kind: "list" },
  );

  return (
    <div className="flex flex-col gap-5">
      {view.kind === "list" && <TicketList onOpen={id => setView({ kind: "ticket", id })} onNew={() => setView({ kind: "new" })} audience={audience} />}
      {view.kind === "new" && (
        <NewTicket audience={audience} orderId={initialOrderId ?? null}
          onBack={() => setView({ kind: "list" })} onCreated={id => setView({ kind: "ticket", id })} />
      )}
      {view.kind === "ticket" && <Thread id={view.id} onBack={() => setView({ kind: "list" })} />}
    </div>
  );
}

function TicketList({ onOpen, onNew, audience }: { onOpen: (id: string) => void; onNew: () => void; audience: string }) {
  const [rows, setRows] = useState<MyTicket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    listMyTickets().then(r => {
      if (!alive) return;
      if (r.success) setRows(r.data.tickets); else setError(errText(r.error, "Could not load your tickets."));
    });
    return () => { alive = false; };
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-[24px] font-semibold text-[#101212]">Support</h1>
          <p className="mt-1 text-[13px] text-[#646968]">
            {audience === "vendor"
              ? "Questions about orders, listings or payouts. Nooi usually replies within 1 business day."
              : "Questions about an order, a payment or a return. We usually reply within 1 business day."}
          </p>
        </div>
        <button onClick={onNew} className="flex items-center gap-1.5 rounded-full bg-[#004643] px-4 py-2.5 text-[13px] font-medium text-white hover:bg-[#003836]">
          <Plus size={14} /> New ticket
        </button>
      </div>
      <section className="rounded-2xl border border-[#EAEDEC] bg-white">
        {error && <p className="p-5 text-[13px] text-[#812F28]">{error}</p>}
        {!error && rows === null && <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[#004643]" /></div>}
        {rows?.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <MessageCircle className="h-7 w-7 text-[#B3B9B9]" />
            <div className="text-[14px] font-semibold text-[#101212]">No tickets yet</div>
            <div className="text-[13px] text-[#646968]">Open one and we&apos;ll get back to you here.</div>
          </div>
        )}
        {rows?.map(t => (
          <button key={t.id} onClick={() => onOpen(t.id)}
            className="flex w-full items-center gap-3 border-b border-[#F1F4F4] px-5 py-3.5 text-start last:border-b-0 hover:bg-[#FBFCFC]">
            <span className="w-14 font-mono text-[12px] text-[#8E9493]">#{t.number}</span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-[13.5px] ${t.requester_unread ? "font-semibold text-[#101212]" : "text-[#343837]"}`}>
                {t.subject}{t.requester_unread && <span className="ms-2 inline-block h-2 w-2 rounded-full bg-[#004643] align-middle" />}
              </span>
              <span className="block text-[11.5px] text-[#8E9493]">Updated {when(t.last_message_at)}</span>
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS[t.status].cls}`}>{STATUS[t.status].label}</span>
          </button>
        ))}
      </section>
    </>
  );
}

function NewTicket({ audience, orderId, onBack, onCreated }: {
  audience: "customer" | "vendor"; orderId: string | null; onBack: () => void; onCreated: (id: string) => void;
}) {
  const cats = SUPPORT_CATEGORIES.filter(c =>
    audience === "vendor" ? c.key !== "return" : !["listing", "payout"].includes(c.key));
  const [category, setCategory] = useState<string>(orderId ? "order" : "general");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const r = await createTicket({ subject: subject.trim(), category, body: body.trim(), order_id: orderId }, photos);
    setBusy(false);
    if (r.success) onCreated(r.data.ticket.id); else setError(errText(r.error, "Could not open the ticket."));
  };

  return (
    <>
      <button onClick={onBack} className="flex w-fit items-center gap-1.5 text-[13px] text-[#646968] hover:text-[#004643]"><ArrowLeft size={14} /> All tickets</button>
      <form onSubmit={submit} className="rounded-2xl border border-[#EAEDEC] bg-white p-6">
        <h2 className="m-0 text-[18px] font-semibold text-[#101212]">New ticket</h2>
        {orderId && <p className="mt-1 text-[12.5px] text-[#646968]">About your order — we&apos;ll see its details.</p>}
        <div className="mt-4 grid grid-cols-1 gap-4">
          <label className="text-[12px] font-medium text-[#646968]">What is it about?
            <select className={input} value={category} onChange={e => setCategory(e.target.value)}>
              {cats.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>
          <label className="text-[12px] font-medium text-[#646968]">Subject
            <input className={input} value={subject} onChange={e => setSubject(e.target.value)} maxLength={140} placeholder="A short summary" />
          </label>
          <label className="text-[12px] font-medium text-[#646968]">Message
            <textarea className={input} rows={6} value={body} onChange={e => setBody(e.target.value)} maxLength={5000}
              placeholder="Tell us what happened, with any order numbers or dates." />
          </label>
          <div className="-mt-2 text-[12px] text-[#8E9493]">
            Photos help — e.g. damage, the wrong item or colour, or the delivery note.
            <PhotoPicker photos={photos} onChange={setPhotos} disabled={busy} />
          </div>
        </div>
        {error && <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-[#812F28]"><AlertCircle size={13} /> {error}</p>}
        <button disabled={busy || subject.trim().length < 3 || body.trim().length < 5}
          className="mt-4 flex items-center gap-1.5 rounded-full bg-[#004643] px-5 py-2.5 text-[13px] font-medium text-white disabled:opacity-50">
          {busy && <Loader2 size={13} className="animate-spin" />} {busy && photos.length ? "Uploading…" : "Send to Nooi"}
        </button>
      </form>
    </>
  );
}

function Thread({ id, onBack }: { id: string; onBack: () => void }) {
  const [ticket, setTicket] = useState<(MyTicket & { orders: { order_number: string } | null }) | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    getMyTicket(id).then(r => {
      if (!alive) return;
      if (r.success) { setTicket(r.data.ticket); setMessages(r.data.messages); }
      else setError(errText(r.error, "Could not load this ticket."));
    });
    return () => { alive = false; };
  }, [id, version]);

  const send = async () => {
    setBusy(true); setError(null);
    const r = await replyToTicket(id, reply.trim(), photos);
    setBusy(false);
    if (r.success) { setReply(""); setPhotos([]); setVersion(v => v + 1); } else setError(errText(r.error, "Could not send."));
  };

  return (
    <>
      <button onClick={onBack} className="flex w-fit items-center gap-1.5 text-[13px] text-[#646968] hover:text-[#004643]"><ArrowLeft size={14} /> All tickets</button>
      {!ticket ? (
        error ? <p className="text-[13px] text-[#812F28]">{error}</p> : <Loader2 className="h-5 w-5 animate-spin text-[#004643]" />
      ) : (
        <section className="rounded-2xl border border-[#EAEDEC] bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-[18px] font-semibold text-[#101212]"><span className="font-mono text-[#8E9493]">#{ticket.number}</span> {ticket.subject}</h2>
              {ticket.orders?.order_number && <p className="mt-1 text-[12.5px] text-[#646968]">Order {ticket.orders.order_number}</p>}
            </div>
            <span className={`rounded-full px-3 py-1 text-[11.5px] font-medium ${STATUS[ticket.status].cls}`}>{STATUS[ticket.status].label}</span>
          </div>
          <div className="mt-5 space-y-3">
            {messages.map(m => (
              <div key={m.id} className={`max-w-[85%] rounded-2xl p-3.5 text-[13.5px] ${m.author_role === "admin" ? "bg-[#E9F7F5]" : "ms-auto bg-[#F4F6F6]"}`}>
                <div className="mb-1 text-[11px] text-[#8E9493]">{m.author_role === "admin" ? "Nooi support" : "You"} · {when(m.created_at)}</div>
                {m.body && <div className="whitespace-pre-wrap text-[#101212]">{m.body}</div>}
                <MessagePhotos attachments={m.attachments} />
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-[#F1F4F4] pt-4">
            <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3} maxLength={5000}
              placeholder={ticket.status === "resolved" ? "Reply to reopen this ticket…" : "Write a reply…"} className={input} />
            <PhotoPicker photos={photos} onChange={setPhotos} disabled={busy} />
            {error && <p className="mt-2 text-[12.5px] text-[#812F28]">{error}</p>}
            <button disabled={busy || (!reply.trim() && !photos.length)} onClick={send}
              className="mt-2 flex items-center gap-1.5 rounded-full bg-[#004643] px-4 py-2 text-[12.5px] font-medium text-white disabled:opacity-50">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send
            </button>
          </div>
        </section>
      )}
    </>
  );
}
