"use client";

/**
 * Settings — admin
 * ----------------------------------------------------------------------------
 *   Marketplace rules   default commission for new vendors, payout hold,
 *                       return window, minimum payout (super admin edits)
 *   Platform contact    support email / phone and legal details shown to
 *                       customers (super admin edits)
 *   My account          your name and password
 *   Payments            read-only: gateway, test/live, webhook and payout health
 */

import React, { useEffect, useState } from "react";
import { Loader2, Check, AlertCircle, AlertTriangle, ShieldCheck } from "lucide-react";

import AdminShell from "@/components/admin/AdminShell";
import {
  getPlatformSettings, updatePlatformSettings, getPaymentStatus, getMe, updateMe, changeMyPassword,
  type PlatformSettings, type PaymentStatus,
} from "@/lib/api/admin";
import { formatMoney } from "@/lib/money";

const errText = (e: unknown, f: string) => (typeof e === "string" ? e : f);
const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "never";
const input = "mt-1 w-full rounded-xl border border-[#D5DBDA] bg-white px-3 py-2 text-[13px] focus:border-[#87DDD7] focus:outline-none disabled:bg-[#F7F9F9] disabled:text-[#646968]";

function Flash({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <p className={`mt-3 flex items-center gap-1.5 text-[12.5px] ${msg.ok ? "text-[#28603A]" : "text-[#812F28]"}`}>
      {msg.ok ? <Check size={13} /> : <AlertCircle size={13} />} {msg.text}
    </p>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#D5DBDA] bg-white p-6">
      <h2 className="text-[15px] font-medium text-[#101212]">{title}</h2>
      {sub && <p className="mt-0.5 text-[12px] text-[#646968]">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PlatformForm() {
  const [s, setS] = useState<PlatformSettings | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [busy, setBusy] = useState<"rules" | "contact" | null>(null);
  const [msg, setMsg] = useState<{ section: string; ok: boolean; text: string } | null>(null);

  useEffect(() => {
    getPlatformSettings().then(r => { if (r.success) { setS(r.data.settings); setCanEdit(r.data.can_edit); } });
  }, []);
  if (!s) return <Card title="Marketplace rules"><Loader2 className="h-5 w-5 animate-spin text-[#004643]" /></Card>;

  const set = (k: keyof PlatformSettings, v: string) => setS({ ...s, [k]: v } as PlatformSettings);
  const save = async (section: "rules" | "contact", keys: (keyof PlatformSettings)[]) => {
    setBusy(section); setMsg(null);
    const patch = Object.fromEntries(keys.map(k => [k, s[k]])) as Partial<PlatformSettings>;
    const r = await updatePlatformSettings(patch);
    setBusy(null);
    if (r.success) { setS(r.data.settings); setMsg({ section, ok: true, text: "Saved" }); }
    else setMsg({ section, ok: false, text: errText(r.error, "Could not save.") });
  };
  const ro = !canEdit;

  return (
    <>
      <Card title="Marketplace rules" sub={ro ? "Only a super administrator can change these." : "Apply to new orders and payouts from now on."}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-[12px] text-[#646968]">Default commission for new vendors (%)
            <input className={input} disabled={ro} inputMode="decimal" value={String(s.default_commission_rate)} onChange={e => set("default_commission_rate", e.target.value)} />
            <span className="mt-1 block text-[11px] text-[#8E9493]">Existing vendors keep their current rate.</span>
          </label>
          <label className="text-[12px] text-[#646968]">Payout hold after delivery (days)
            <input className={input} disabled={ro} inputMode="numeric" value={String(s.payout_hold_days)} onChange={e => set("payout_hold_days", e.target.value)} />
            <span className="mt-1 block text-[11px] text-[#8E9493]">0 pays as soon as an approved order is delivered. A hold covers returns.</span>
          </label>
          <label className="text-[12px] text-[#646968]">Return window (days after delivery)
            <input className={input} disabled={ro} inputMode="numeric" value={String(s.return_window_days)} onChange={e => set("return_window_days", e.target.value)} />
          </label>
          <label className="text-[12px] text-[#646968]">Minimum payout (SAR)
            <input className={input} disabled={ro} inputMode="decimal" value={String(s.min_payout_sar)} onChange={e => set("min_payout_sar", e.target.value)} />
            <span className="mt-1 block text-[11px] text-[#8E9493]">{formatMoney(Number(s.min_payout_sar) || 0, "SAR")} — smaller balances wait for the next payout.</span>
          </label>
        </div>
        {!ro && (
          <button disabled={busy !== null} onClick={() => save("rules", ["default_commission_rate", "payout_hold_days", "return_window_days", "min_payout_sar"])}
            className="mt-4 flex items-center gap-1.5 rounded-full bg-[#004643] px-5 py-2 text-[12.5px] font-medium text-white disabled:opacity-60">
            {busy === "rules" && <Loader2 size={12} className="animate-spin" />} Save rules
          </button>
        )}
        {msg?.section === "rules" && <Flash msg={msg} />}
      </Card>

      <Card title="Platform contact info" sub="Shown to customers on support pages and receipts. Use the legal details from Nooi's CR.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-[12px] text-[#646968]">Support email
            <input className={input} disabled={ro} value={s.support_email ?? ""} onChange={e => set("support_email", e.target.value)} placeholder="support@nooi.sa" />
          </label>
          <label className="text-[12px] text-[#646968]">Support phone
            <input className={input} disabled={ro} value={s.support_phone ?? ""} onChange={e => set("support_phone", e.target.value)} placeholder="+9665XXXXXXXX" />
          </label>
          <label className="text-[12px] text-[#646968]">Legal company name
            <input className={input} disabled={ro} value={s.legal_name ?? ""} onChange={e => set("legal_name", e.target.value)} />
          </label>
          <label className="text-[12px] text-[#646968]">CR number
            <input className={input} disabled={ro} value={s.cr_number ?? ""} onChange={e => set("cr_number", e.target.value)} />
          </label>
          <label className="text-[12px] text-[#646968]">VAT number
            <input className={input} disabled={ro} value={s.vat_number ?? ""} onChange={e => set("vat_number", e.target.value)} />
          </label>
          <label className="text-[12px] text-[#646968] sm:col-span-2">Registered address
            <textarea className={input} rows={2} disabled={ro} value={s.legal_address ?? ""} onChange={e => set("legal_address", e.target.value)} />
          </label>
        </div>
        {!ro && (
          <button disabled={busy !== null} onClick={() => save("contact", ["support_email", "support_phone", "legal_name", "cr_number", "vat_number", "legal_address"])}
            className="mt-4 flex items-center gap-1.5 rounded-full bg-[#004643] px-5 py-2 text-[12.5px] font-medium text-white disabled:opacity-60">
            {busy === "contact" && <Loader2 size={12} className="animate-spin" />} Save contact info
          </button>
        )}
        {msg?.section === "contact" && <Flash msg={msg} />}
        {s.updated_at && <p className="mt-3 text-[11px] text-[#8E9493]">Last changed {when(s.updated_at)}</p>}
      </Card>
    </>
  );
}

function MyAccount() {
  const [me, setMe] = useState<{ email: string; full_name: string | null; role: string } | null>(null);
  const [name, setName] = useState("");
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState<"name" | "pw" | null>(null);
  const [msg, setMsg] = useState<{ section: string; ok: boolean; text: string } | null>(null);

  useEffect(() => {
    getMe().then(r => { if (r.success) { setMe(r.data); setName(r.data.full_name ?? ""); } });
  }, []);

  const saveName = async () => {
    setBusy("name"); setMsg(null);
    const r = await updateMe(name.trim());
    setBusy(null);
    setMsg({ section: "name", ok: r.success, text: r.success ? "Saved" : errText(r.error, "Could not save.") });
  };
  const savePw = async () => {
    if (next !== again) { setMsg({ section: "pw", ok: false, text: "The new passwords don't match." }); return; }
    setBusy("pw"); setMsg(null);
    const r = await changeMyPassword(cur, next);
    setBusy(null);
    if (r.success) { setCur(""); setNext(""); setAgain(""); }
    setMsg({ section: "pw", ok: r.success, text: r.success ? "Password changed" : errText(r.error, "Could not change it.") });
  };

  return (
    <Card title="My account" sub={me ? `${me.email} · ${me.role.replace("_", " ")}` : undefined}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <label className="text-[12px] text-[#646968]">Name
            <input className={input} value={name} onChange={e => setName(e.target.value)} />
          </label>
          <button disabled={busy !== null || name.trim().length < 2} onClick={saveName}
            className="mt-3 flex items-center gap-1.5 rounded-full border border-[#D5DBDA] px-4 py-2 text-[12.5px] font-medium text-[#004643] disabled:opacity-50">
            {busy === "name" && <Loader2 size={12} className="animate-spin" />} Save name
          </button>
          {msg?.section === "name" && <Flash msg={msg} />}
        </div>
        <div>
          <label className="text-[12px] text-[#646968]">Current password
            <input type="password" autoComplete="current-password" className={input} value={cur} onChange={e => setCur(e.target.value)} />
          </label>
          <label className="mt-3 block text-[12px] text-[#646968]">New password (10+ characters)
            <input type="password" autoComplete="new-password" className={input} value={next} onChange={e => setNext(e.target.value)} />
          </label>
          <label className="mt-3 block text-[12px] text-[#646968]">New password again
            <input type="password" autoComplete="new-password" className={input} value={again} onChange={e => setAgain(e.target.value)} />
          </label>
          <button disabled={busy !== null || !cur || next.length < 10} onClick={savePw}
            className="mt-3 flex items-center gap-1.5 rounded-full border border-[#D5DBDA] px-4 py-2 text-[12.5px] font-medium text-[#004643] disabled:opacity-50">
            {busy === "pw" && <Loader2 size={12} className="animate-spin" />} Change password
          </button>
          {msg?.section === "pw" && <Flash msg={msg} />}
        </div>
      </div>
    </Card>
  );
}

function Payments() {
  const [p, setP] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getPaymentStatus().then(r => { if (r.success) setP(r.data); else setError(errText(r.error, "Could not load.")); });
  }, []);
  const row = (k: string, v: React.ReactNode) => (
    <><span className="text-[#8E9493]">{k}</span><span className="text-[#101212]">{v}</span></>
  );
  const yes = (b: boolean) => b ? <span className="text-[#28603A]">Set</span> : <span className="text-[#812F28]">Missing</span>;

  return (
    <Card title="Payments" sub="Read-only. These come from the backend's environment variables on Railway.">
      {error && <p className="text-[12.5px] text-[#812F28]">{error}</p>}
      {!p && !error && <Loader2 className="h-5 w-5 animate-spin text-[#004643]" />}
      {p && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#F1F4F4] px-3 py-1 text-[12px] font-medium capitalize">{p.provider}</span>
            <span className={`rounded-full px-3 py-1 text-[12px] font-medium ${p.mode === "live" ? "bg-[#E7FBEB] text-[#28603A]" : p.mode === "test" ? "bg-[#FFF6E5] text-[#8A5A00]" : "bg-[#FFFAF9] text-[#812F28]"}`}>
              {p.mode === "live" ? "Live — real money" : p.mode === "test" ? "Test mode" : "Not configured"}
            </span>
            <span className="rounded-full bg-[#F1F4F4] px-3 py-1 text-[12px]">{p.currency}</span>
          </div>
          {p.warnings.length > 0 ? (
            <ul className="mt-4 space-y-1.5">
              {p.warnings.map(w => (
                <li key={w} className="flex items-start gap-1.5 text-[12.5px] text-[#8A5A00]"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> {w}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 flex items-center gap-1.5 text-[12.5px] text-[#28603A]"><ShieldCheck size={13} /> Everything needed is configured.</p>
          )}
          <div className="mt-4 grid grid-cols-[180px_1fr] gap-y-1.5 text-[12.5px]">
            {row("Secret key", yes(p.keys.secret))}
            {row("Publishable key", yes(p.keys.publishable))}
            {row("Webhook secret", yes(p.webhook_secret_set))}
            {row("Payout account", yes(p.payout_source_set))}
            {row("Payout purpose", <span className="font-mono text-[12px]">{p.payout_purpose}</span>)}
            {row("Payment methods", p.methods.join(", "))}
            {row("Last webhook", p.last_webhook ? `${p.last_webhook.event_type} · ${p.last_webhook.status} · ${when(p.last_webhook.created_at)}` : "never")}
            {row("Failed webhooks (7 days)", p.failed_webhooks_7d)}
            {row("Last payout", p.last_payout ? `${p.last_payout.status} · ${when(p.last_payout.created_at)}` : "none yet")}
          </div>
        </>
      )}
    </Card>
  );
}

export default function AdminSettingsPage() {
  return (
    <AdminShell>
      <div className="px-6 py-7 lg:px-10">
        <h1 className="text-[24px] text-[#101212]">Settings</h1>
        <p className="mt-1 text-[12.5px] text-[#646968]">Marketplace rules, contact details, your account and payment health.</p>
        <div className="mt-6 space-y-5">
          <PlatformForm />
          <MyAccount />
          <Payments />
        </div>
      </div>
    </AdminShell>
  );
}
