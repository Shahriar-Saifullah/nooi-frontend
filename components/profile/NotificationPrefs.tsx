"use client";

/**
 * Profile → Notifications
 * ----------------------------------------------------------------------------
 * Switches for the in-app notifications a customer can turn off. Each change
 * saves straight away (profiles.notification_prefs) and the backend checks it
 * before sending. Money and account notices are always sent, and the page
 * says so rather than offering a switch that wouldn't work.
 */

import React, { useEffect, useState } from "react";
import { Loader2, Check, Lock } from "lucide-react";
import { getNotificationPrefs, updateNotificationPrefs, type NotificationPrefs } from "@/lib/api/notifications";

const SWITCHES: { key: string; label: string; desc: string }[] = [
  { key: "order_status", label: "Order updates", desc: "When an order is confirmed or its status changes." },
  { key: "shipment", label: "Shipping & delivery", desc: "When your items are being made, shipped, out for delivery and delivered." },
  { key: "return", label: "Returns", desc: "Updates on return requests you've made." },
  { key: "support", label: "Support replies", desc: "When Nooi replies to one of your support tickets." },
];

function Switch({ on, disabled, onChange, label }: { on: boolean; disabled?: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${on ? "bg-[#004643]" : "bg-gray-200"}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

export default function NotificationPrefsPanel() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getNotificationPrefs()
      .then(p => { if (alive) setPrefs(p); })
      .catch(e => { if (alive) setLoadError(e instanceof Error ? e.message : "Could not load your settings."); });
    return () => { alive = false; };
  }, []);

  const toggle = async (key: string) => {
    if (!prefs) return;
    const before = prefs;
    const next = { ...prefs, [key]: !(prefs[key] !== false) };
    setPrefs(next); // instant; put back if the save fails
    setSaving(key); setError(null); setSaved(null);
    try {
      setPrefs(await updateNotificationPrefs({ [key]: next[key] }));
      setSaved(key);
      setTimeout(() => setSaved(s => (s === key ? null : s)), 2000);
    } catch (e) {
      setPrefs(before);
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <div className="border-t border-[#f0f0f0] px-6 sm:px-8 pt-6 pb-2">
        <h2 className="text-base font-[700] text-[#0a0a0a]">In-app notifications</h2>
        <p className="text-xs text-[#737373]">What shows up under the bell at the top of the page.</p>
      </div>

      <div className="px-6 sm:px-8">
        {loadError && <p className="py-4 text-sm text-[#812F28]">{loadError}</p>}
        {!loadError && !prefs && (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#004643]" /></div>
        )}
        {prefs && SWITCHES.map(item => (
          <div key={item.key} className="flex items-center justify-between py-4 border-t border-[#f5f5f5]">
            <div className="pr-6">
              <h3 className="text-sm font-[600] text-[#0a0a0a]">{item.label}</h3>
              <p className="text-xs text-[#737373] mt-0.5">{item.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              {saving === item.key && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8E9493]" />}
              {saved === item.key && <span className="flex items-center gap-1 text-[11px] text-[#28603A]"><Check className="h-3 w-3" /> Saved</span>}
              <Switch on={prefs[item.key] !== false} disabled={saving === item.key} onChange={() => void toggle(item.key)} label={item.label} />
            </div>
          </div>
        ))}
        {error && <p className="pb-3 text-xs text-[#812F28]">{error}</p>}

        <div className="flex items-start gap-3 py-4 border-t border-[#f5f5f5]">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#8E9493]" />
          <p className="text-xs text-[#737373]">
            <span className="font-[600] text-[#0a0a0a]">Always on:</span> refunds, cancellations and problems with a payment.
            These involve your money, so they&apos;re always sent.
          </p>
        </div>
      </div>

      <div className="border-t border-[#f0f0f0] px-6 sm:px-8 py-6">
        <h2 className="text-base font-[700] text-[#0a0a0a]">Email</h2>
        <p className="mt-1 text-xs text-[#737373]">
          Nooi only emails you about your account — confirming your email address and resetting your password.
          These can&apos;t be turned off, and we don&apos;t send marketing emails.
        </p>
      </div>
    </>
  );
}
