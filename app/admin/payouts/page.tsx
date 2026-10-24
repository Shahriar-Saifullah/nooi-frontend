"use client";

/**
 * Payments and payouts — admin
 * ----------------------------------------------------------------------------
 * Customers pay Nooi (through Moyasar, into Nooi's bank account). This screen
 * shows what Nooi holds and what it owes:
 *
 *   Owed, pending    vendors' shares of orders not yet approved / delivered
 *   Owed, payable    released, ready to pay out
 *   Paid out         sent to vendors' banks
 *   Commission       Nooi's share
 *
 * "Pay" sends a vendor everything payable to their VERIFIED IBAN through
 * Moyasar Payouts, from Nooi's payout account. It is super-admin only, asks
 * for confirmation, and the amount is never typed here — the server sums the
 * ledger, so a browser cannot choose how much leaves the account.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, AlertCircle, RefreshCw, ShieldCheck, Wallet, Check } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import {
  getPaymentsOverview, listPayouts, createPayout, refreshPayout,
  getVendorPayoutAccount, verifyVendorPayoutAccount,
  type PaymentsOverview, type PaymentsVendorRow, type PayoutRow,
} from "@/lib/api/admin";
import { formatMoney } from "@/lib/money";

interface VendorAccountRow { account_holder: string; iban: string; bank_name: string | null; city: string; mobile: string }

const sar = (v: number) => formatMoney(v, "SAR");
const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const PAYOUT_STYLE: Record<string, string> = {
  creating: "bg-[#FFF6E5] text-[#8A5A00]", queued: "bg-[#EEF2FF] text-[#3B4CA8]",
  initiated: "bg-[#EEF2FF] text-[#3B4CA8]", paid: "bg-[#E7FBEB] text-[#28603A]",
  failed: "bg-[#FFFAF9] text-[#812F28]", canceled: "bg-[#F1F4F4] text-[#646968]",
  returned: "bg-[#FFFAF9] text-[#812F28]",
};

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[#D5DBDA] bg-white p-4">
      <div className="text-[11.5px] text-[#646968]">{label}</div>
      <div className="mt-1 text-[18px] font-semibold tabular-nums text-[#101212]">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-[#8E9493]">{hint}</div>}
    </div>
  );
}

function VerifyAccount({ vendor, onDone }: { vendor: PaymentsVendorRow; onDone: () => void }) {
  const [acct, setAcct] = useState<VendorAccountRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    getVendorPayoutAccount(vendor.vendor_id).then(r => { if (r.success) setAcct(r.data.account as VendorAccountRow | null); });
  }, [vendor.vendor_id]);
  if (!acct) return <Loader2 className="h-4 w-4 animate-spin text-[#8E9493]" />;
  return (
    <div className="mt-2 rounded-xl bg-[#FBFCFC] p-3 text-[12px]">
      <div className="grid grid-cols-[110px_1fr] gap-y-1">
        <span className="text-[#8E9493]">Holder</span><span>{acct.account_holder}</span>
        <span className="text-[#8E9493]">IBAN</span><span className="font-mono">{acct.iban}</span>
        <span className="text-[#8E9493]">Bank / city</span><span>{acct.bank_name ?? "—"} · {acct.city}</span>
        <span className="text-[#8E9493]">Mobile</span><span>{acct.mobile}</span>
      </div>
      <p className="mt-2 text-[11.5px] text-[#646968]">
        Check this against the vendor&apos;s bank letter / commercial registration before verifying. Money goes to this IBAN.
      </p>
      {err && <p className="mt-1 text-[#812F28]">{err}</p>}
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true); setErr(null);
          const r = await verifyVendorPayoutAccount(vendor.vendor_id, acct.iban);
          setBusy(false);
          if (!r.success) setErr(typeof r.error === "string" ? r.error : "Could not verify"); else onDone();
        }}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#004643] px-4 py-1.5 text-[12px] font-medium text-white disabled:opacity-60"
      >
        <ShieldCheck size={13} /> Verify this account
      </button>
    </div>
  );
}

const fetchPayments = () => Promise.all([getPaymentsOverview(), listPayouts()]);

function PayoutsInner() {
  const [data, setData] = useState<PaymentsOverview | null>(null);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirming, setConfirming] = useState<PaymentsVendorRow | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const apply = useCallback(([o, p]: Awaited<ReturnType<typeof fetchPayments>>) => {
    if (o.success) { setData(o.data); setError(null); } else setError(typeof o.error === "string" ? o.error : "Could not load payments");
    if (p.success) setPayouts(p.data.payouts);
  }, []);
  const load = useCallback(() => fetchPayments().then(apply), [apply]);
  useEffect(() => {
    let alive = true;
    fetchPayments().then(r => { if (alive) apply(r); });
    return () => { alive = false; };
  }, [apply]);

  const nameOf = (id: string) => data?.vendors.find(v => v.vendor_id === id)?.name ?? "Vendor";

  const pay = async (v: PaymentsVendorRow) => {
    setWorking(true); setFlash(null);
    const r = await createPayout(v.vendor_id);
    setWorking(false); setConfirming(null);
    setFlash(r.success
      ? { ok: true, text: `Payout of ${sar(r.data.payout.amount)} to ${v.name}: ${r.data.payout.status}.` }
      : { ok: false, text: typeof r.error === "string" ? r.error : "The payout failed." });
    await load();
  };

  if (error) return <div className="px-6 py-10 text-[13px] text-[#812F28]">{error}</div>;
  if (!data) return <div className="flex justify-center py-24"><Loader2 className="h-5 w-5 animate-spin text-[#004643]" /></div>;
  const t = data.totals;

  return (
    <div className="px-6 py-7 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[20px] font-medium text-[#101212]"><Wallet size={18} /> Payments & payouts</h1>
          <p className="mt-1 text-[12.5px] text-[#646968]">
            Vendors are paid once an order is approved and their shipment delivered{data.hold_days ? `, plus a ${data.hold_days}-day hold` : ""}.
            {t.orders_awaiting_approval > 0 && <> <a href="/admin/orders" className="text-[#004643] underline">{t.orders_awaiting_approval} order{t.orders_awaiting_approval === 1 ? "" : "s"} to approve</a>.</>}
          </p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-full border border-[#D5DBDA] px-3.5 py-1.5 text-[12px] text-[#4B4F4F] hover:bg-[#F1F4F4]">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {flash && (
        <div className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-[12.5px] ${flash.ok ? "border-[#28603A]/25 bg-[#F4FBF5] text-[#28603A]" : "border-[#812F28]/25 bg-[#FFFAF9] text-[#812F28]"}`}>
          {flash.ok ? <Check size={14} /> : <AlertCircle size={14} />} {flash.text}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Collected from customers" value={sar(t.collected)} hint={`incl. ${sar(t.vat_collected)} VAT`} />
        <Tile label="Nooi commission" value={sar(t.commission)} />
        <Tile label="Owed to vendors · pending" value={sar(t.owed_pending)} hint="awaiting approval / delivery" />
        <Tile label="Owed to vendors · payable" value={sar(t.owed_payable)} hint={`${sar(t.in_payout)} in flight · ${sar(t.paid_out)} paid`} />
      </div>

      <section className="mt-6 rounded-2xl border border-[#D5DBDA] bg-white">
        <h2 className="border-b border-[#F1F4F4] px-5 py-3 text-[13px] font-medium text-[#101212]">Vendors</h2>
        {data.vendors.length === 0 && <p className="px-5 py-6 text-[12.5px] text-[#8E9493]">No vendor earnings yet.</p>}
        {data.vendors.map(v => (
          <div key={v.vendor_id} className="border-b border-[#F1F4F4] px-5 py-3.5 last:border-b-0">
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_1.4fr_auto] lg:items-center">
              <span className="text-[13px] font-medium text-[#101212]">{v.name}</span>
              <span className="text-[12px] text-[#646968]">pending <b className="tabular-nums text-[#101212]">{sar(v.pending)}</b></span>
              <span className="text-[12px] text-[#646968]">payable <b className={`tabular-nums ${v.payable < 0 ? "text-[#812F28]" : "text-[#004643]"}`}>{sar(v.payable)}</b></span>
              <span className="text-[12px] text-[#646968]">paid <b className="tabular-nums text-[#101212]">{sar(v.paid)}</b></span>
              <span className="text-[12px]">
                {!v.account ? <span className="text-[#812F28]">No bank account</span>
                  : <span className="font-mono text-[11.5px] text-[#4B4F4F]">{v.account.iban_masked}{" "}
                      {v.account.verified
                        ? <span className="ms-1 rounded-full bg-[#E7FBEB] px-2 py-0.5 font-sans text-[10.5px] text-[#28603A]">verified</span>
                        : <button onClick={() => setVerifying(verifying === v.vendor_id ? null : v.vendor_id)} className="ms-1 rounded-full bg-[#FFF6E5] px-2 py-0.5 font-sans text-[10.5px] text-[#8A5A00] hover:underline">verify</button>}
                    </span>}
              </span>
              <button
                disabled={working || v.payable <= 0 || !v.account?.verified}
                onClick={() => setConfirming(v)}
                className="rounded-full bg-[#004643] px-4 py-1.5 text-[12px] font-medium text-white hover:bg-[#003836] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Pay {v.payable > 0 ? sar(v.payable) : ""}
              </button>
            </div>
            {verifying === v.vendor_id && <VerifyAccount vendor={v} onDone={() => { setVerifying(null); void load(); }} />}
            {confirming?.vendor_id === v.vendor_id && (
              <div className="mt-3 rounded-xl border border-[#004643]/25 bg-[#F4FBFA] p-3 text-[12.5px]">
                Send <b>{sar(v.payable)}</b> to <b>{v.account?.holder}</b> ({v.account?.iban_masked}) from Nooi&apos;s account? This moves real money.
                <div className="mt-2 flex gap-2">
                  <button disabled={working} onClick={() => void pay(v)} className="inline-flex items-center gap-1.5 rounded-full bg-[#004643] px-4 py-1.5 text-[12px] font-medium text-white disabled:opacity-60">
                    {working && <Loader2 size={12} className="animate-spin" />} Send payout
                  </button>
                  <button onClick={() => setConfirming(null)} className="px-3 text-[12px] text-[#646968]">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-[#D5DBDA] bg-white">
        <h2 className="border-b border-[#F1F4F4] px-5 py-3 text-[13px] font-medium text-[#101212]">Recent payouts</h2>
        {payouts.length === 0 && <p className="px-5 py-6 text-[12.5px] text-[#8E9493]">No payouts yet.</p>}
        {payouts.map(p => (
          <div key={p.id} className="grid grid-cols-1 gap-1 border-b border-[#F1F4F4] px-5 py-3 text-[12px] last:border-b-0 lg:grid-cols-[1fr_1.2fr_0.8fr_0.9fr_1.4fr_auto] lg:items-center lg:gap-3">
            <span className="text-[#646968]">{when(p.created_at)}</span>
            <span className="font-medium text-[#101212]">{nameOf(p.vendor_id)}</span>
            <span className="tabular-nums font-medium">{sar(p.amount)}</span>
            <span><span className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${PAYOUT_STYLE[p.status] ?? ""}`}>{p.status}</span>{p.channel ? <span className="ms-1 text-[10.5px] text-[#8E9493]">{p.channel}</span> : null}</span>
            <span className="truncate text-[11.5px] text-[#8E9493]">
              <span className="font-mono">{p.sequence_number}</span>
              {p.failure_reason ? ` · ${p.failure_reason}` : p.last_error ? ` · ${p.last_error}` : ""}
            </span>
            {["creating", "queued", "initiated"].includes(p.status) ? (
              <button onClick={async () => { await refreshPayout(p.id); await load(); }} className="text-[11.5px] text-[#004643] hover:underline">
                {p.status === "creating" ? "Retry" : "Check status"}
              </button>
            ) : <span />}
          </div>
        ))}
      </section>
    </div>
  );
}

export default function AdminPayoutsPage() {
  return (
    <AdminShell>
      <PayoutsInner />
    </AdminShell>
  );
}
