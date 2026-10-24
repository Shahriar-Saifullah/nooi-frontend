"use client";

/**
 * Vendor → Payments
 * ----------------------------------------------------------------------------
 * Customers pay Nooi. A vendor's share of each order (price less Nooi's
 * commission, plus their shipping charge) shows here as:
 *
 *   Pending   sold; waiting for Nooi to approve the order and for delivery
 *   Payable   released; goes out in the next payout
 *   Paid      sent to the vendor's bank account
 *
 * Payouts are sent by Nooi to the IBAN below. A new or changed IBAN is checked
 * by Nooi before money is sent to it.
 */

import { useCallback, useEffect, useState } from "react";
import {
  getVendorPayments, saveVendorPayoutAccount,
  type VendorPaymentsData, type VendorEarningLine, type VendorPayoutRow,
} from "@/lib/api/vendor";
import { formatMoney } from "@/lib/money";

const sar = (v: number) => formatMoney(v, "SAR");
const date = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const LINE_STATUS: Record<VendorEarningLine["status"], { label: string; cls: string }> = {
  pending:   { label: "Pending",   cls: "bg-[#FFF6E5] text-[#8A5A00]" },
  payable:   { label: "Payable",   cls: "bg-[#EAF7F5] text-[#004643]" },
  in_payout: { label: "Paying out", cls: "bg-[#EEF2FF] text-[#3B4CA8]" },
  paid:      { label: "Paid",      cls: "bg-[#E7FBEB] text-[#28603A]" },
  reversed:  { label: "Refunded",  cls: "bg-[#F1F4F4] text-[#646968]" },
};

const PAYOUT_STATUS: Record<VendorPayoutRow["status"], string> = {
  creating: "Sending", queued: "Queued", initiated: "With the bank", paid: "Paid",
  failed: "Failed", canceled: "Cancelled", returned: "Returned by bank",
};

function Stat({ label, value, hint, strong }: { label: string; value: number; hint: string; strong?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${strong ? "border-[#004643]/25 bg-[#F4FBFA]" : "border-[#EAEDEC] bg-white"}`}>
      <div className="text-[13px] text-[#646968]">{label}</div>
      <div className={`mt-1 text-[22px] font-semibold ${value < 0 ? "text-[#812F28]" : "text-[#101212]"}`}>{sar(value)}</div>
      <div className="mt-1 text-[12px] text-[#8E9493]">{hint}</div>
    </div>
  );
}

function BankAccountCard({ data, onSaved }: { data: VendorPaymentsData; onSaved: () => void }) {
  const acct = data.account;
  const [editing, setEditing] = useState(!acct);
  const [form, setForm] = useState({ account_holder: acct?.account_holder ?? "", iban: "", bank_name: acct?.bank_name ?? "", mobile: acct?.mobile ?? "", city: acct?.city ?? "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const res = await saveVendorPayoutAccount(form);
    setBusy(false);
    if (!res.success) { setMsg({ ok: false, text: typeof res.error === "string" ? res.error : "Could not save" }); return; }
    setMsg({ ok: true, text: res.data.message || "Saved" });
    setEditing(false);
    onSaved();
  };

  const input = "mt-1 w-full rounded-xl border border-[#D5DBDA] bg-white px-3.5 py-2.5 text-[13px] focus:border-[#87DDD7] focus:outline-none";

  return (
    <div className="rounded-2xl border border-[#EAEDEC] bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-[#101212]">Bank account for payouts</h2>
        {acct && !editing && (
          <button onClick={() => setEditing(true)} className="text-[13px] font-medium text-[#004643] hover:underline">Change</button>
        )}
      </div>

      {acct && !editing ? (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-[13px]">
          <div><div className="text-[#8E9493]">Account holder</div><div className="font-medium text-[#101212]">{acct.account_holder}</div></div>
          <div><div className="text-[#8E9493]">IBAN</div><div className="font-mono text-[#101212]">{acct.iban_masked}</div></div>
          {acct.bank_name && <div><div className="text-[#8E9493]">Bank</div><div className="text-[#101212]">{acct.bank_name}</div></div>}
          <span className={`rounded-full px-3 py-1 text-[12px] font-medium ${acct.verified ? "bg-[#E7FBEB] text-[#28603A]" : "bg-[#FFF6E5] text-[#8A5A00]"}`}>
            {acct.verified ? "Verified" : "Being verified by Nooi"}
          </span>
        </div>
      ) : (
        <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-[11px] font-medium text-[#646968] sm:col-span-2">Account holder (exactly as on the bank account)
            <input className={input} value={form.account_holder} onChange={e => setForm({ ...form, account_holder: e.target.value })} required />
          </label>
          <label className="text-[11px] font-medium text-[#646968] sm:col-span-2">IBAN
            <input className={`${input} font-mono`} placeholder="SA00 0000 0000 0000 0000 0000" value={form.iban}
              onChange={e => setForm({ ...form, iban: e.target.value })} required />
          </label>
          <label className="text-[11px] font-medium text-[#646968]">Bank name
            <input className={input} value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} />
          </label>
          <label className="text-[11px] font-medium text-[#646968]">City
            <input className={input} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} required />
          </label>
          <label className="text-[11px] font-medium text-[#646968]">Mobile
            <input className={input} placeholder="+9665XXXXXXXX" value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} required />
          </label>
          <div className="flex items-end gap-3">
            <button disabled={busy} className="rounded-full bg-[#004643] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#003836] disabled:opacity-60">
              {busy ? "Saving…" : "Save bank account"}
            </button>
            {acct && <button type="button" onClick={() => setEditing(false)} className="text-[13px] text-[#646968]">Cancel</button>}
          </div>
          <p className="text-[12px] text-[#8E9493] sm:col-span-2">
            Changing your IBAN pauses payouts until Nooi has checked the new account. This protects you if someone else gets into your login.
          </p>
        </form>
      )}
      {msg && <p className={`mt-3 text-[12.5px] ${msg.ok ? "text-[#28603A]" : "text-[#812F28]"}`}>{msg.text}</p>}
    </div>
  );
}

export default function VendorPaymentsPanel() {
  const [data, setData] = useState<VendorPaymentsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [version, setVersion] = useState(0);
  const load = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    let alive = true;
    getVendorPayments().then(res => {
      if (!alive) return;
      if (res.success) { setData(res.data); setError(null); }
      else setError(typeof res.error === "string" ? res.error : "Could not load payments");
    });
    return () => { alive = false; };
  }, [version]);

  if (error) return <div className="rounded-2xl border border-[#812F28]/25 bg-[#FFFAF9] p-5 text-[13px] text-[#812F28]">{error}</div>;
  if (!data) return <div className="p-10 text-center text-[13px] text-[#8E9493]">Loading payments…</div>;

  const b = data.balance;
  const rate = data.commission_rates[0]?.commission_rate;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="m-0 text-[24px] font-semibold text-[#101212]">Payments</h1>
        <p className="mt-1 text-[13px] text-[#646968]">
          Customers pay Nooi. Your share{rate !== undefined ? ` (price less ${Number(rate)}% commission, plus your shipping charge)` : ""} becomes
          payable once Nooi approves the order and it is delivered{data.hold_days ? `, plus ${data.hold_days} days` : ""}, and is paid to your bank account.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pending" value={b.pending} hint="Waiting for approval or delivery" />
        <Stat label="Payable" value={b.payable} hint="In your next payout" strong />
        <Stat label="Paying out" value={b.in_payout} hint="On its way to your bank" />
        <Stat label="Paid to date" value={b.paid} hint={`From ${sar(b.gross_sales)} in sales, ${sar(b.commission)} commission`} />
      </div>

      <BankAccountCard data={data} onSaved={load} />

      <div className="rounded-2xl border border-[#EAEDEC] bg-white p-6">
        <h2 className="mb-4 text-[15px] font-semibold text-[#101212]">Payouts</h2>
        {data.payouts.length === 0 ? (
          <p className="text-[13px] text-[#8E9493]">No payouts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-[12px] text-[#8E9493]">
                <th className="py-2 pe-4 font-medium">Date</th><th className="py-2 pe-4 font-medium">Reference</th>
                <th className="py-2 pe-4 font-medium">To</th><th className="py-2 pe-4 font-medium">Status</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr></thead>
              <tbody>
                {data.payouts.map(p => (
                  <tr key={p.id} className="border-t border-[#F1F4F4]">
                    <td className="py-2.5 pe-4">{date(p.paid_at || p.created_at)}</td>
                    <td className="py-2.5 pe-4 font-mono text-[12px]">{p.sequence_number}</td>
                    <td className="py-2.5 pe-4 font-mono text-[12px]">{p.destination.iban}</td>
                    <td className="py-2.5 pe-4">{PAYOUT_STATUS[p.status]}{p.failure_reason ? ` — ${p.failure_reason}` : ""}</td>
                    <td className="py-2.5 text-right font-medium">{sar(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[#EAEDEC] bg-white p-6">
        <h2 className="mb-4 text-[15px] font-semibold text-[#101212]">Earnings</h2>
        {data.lines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D5DBDA] px-6 py-12 text-center">
            <div className="text-[15px] font-semibold text-[#101212]">No earnings yet</div>
            <div className="mt-1 text-[13px] text-[#646968]">Each paid order shows here, with Nooi&apos;s commission and what you receive.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-[12px] text-[#8E9493]">
                <th className="py-2 pe-4 font-medium">Date</th><th className="py-2 pe-4 font-medium">Order</th>
                <th className="py-2 pe-4 font-medium">For</th><th className="py-2 pe-4 text-right font-medium">Sale</th>
                <th className="py-2 pe-4 text-right font-medium">Commission</th><th className="py-2 pe-4 text-right font-medium">You get</th>
                <th className="py-2 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {data.lines.map(l => (
                  <tr key={l.id} className="border-t border-[#F1F4F4]">
                    <td className="py-2.5 pe-4">{date(l.created_at)}</td>
                    <td className="py-2.5 pe-4">{l.order_number ?? "—"}</td>
                    <td className="py-2.5 pe-4 text-[#646968]">{l.kind === "sale" ? "Item" : l.kind === "shipping" ? "Shipping" : "Refund after payout"}</td>
                    <td className="py-2.5 pe-4 text-right">{sar(l.gross)}</td>
                    <td className="py-2.5 pe-4 text-right text-[#646968]">{l.commission ? `${sar(-l.commission)} (${l.commission_rate}%)` : "—"}</td>
                    <td className={`py-2.5 pe-4 text-right font-medium ${l.net < 0 ? "text-[#812F28]" : ""}`}>{sar(l.net)}</td>
                    <td className="py-2.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${LINE_STATUS[l.status].cls}`}>{LINE_STATUS[l.status].label}</span>
                      {l.waiting_for && <span className="ms-2 text-[11.5px] text-[#8E9493]">awaiting {l.waiting_for}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
