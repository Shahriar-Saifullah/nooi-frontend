"use client";

/**
 * Moyasar's hosted payment form — mada, Visa/Mastercard, Apple Pay, STC Pay.
 * ----------------------------------------------------------------------------
 * Card details go from the shopper's browser straight to Moyasar; Nooi never
 * sees them. Flow:
 *
 *   on_completed(payment) → tell our server the payment id (bind) BEFORE
 *   Moyasar redirects for 3-D Secure, so a dropped connection cannot lose a
 *   paid order. Moyasar then sends the shopper to /checkout/callback?id=…,
 *   where the server confirms the payment with Moyasar and creates the order.
 *
 * The script is Moyasar's own, from their CDN (pin the version with
 * NEXT_PUBLIC_MOYASAR_FORM_VERSION).
 */

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Lock, CreditCard } from "lucide-react";
import { bindMoyasarPayment, type MoyasarFormConfig } from "@/lib/api/checkout";

const VERSION = process.env.NEXT_PUBLIC_MOYASAR_FORM_VERSION || "1.15.0";
const BASE = `https://cdn.moyasar.com/mpf/${VERSION}`;

declare global {
  interface Window { Moyasar?: { init: (opts: Record<string, unknown>) => void } }
}

let loader: Promise<void> | null = null;

function loadMoyasar(): Promise<void> {
  if (window.Moyasar) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${BASE}/moyasar.css"]`)) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = `${BASE}/moyasar.css`;
      document.head.appendChild(css);
    }
    const s = document.createElement("script");
    s.src = `${BASE}/moyasar.js`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { loader = null; reject(new Error("Could not load the payment form")); };
    document.head.appendChild(s);
  });
  return loader;
}

export default function MoyasarPaymentForm({
  config,
  checkoutAttemptId,
  language,
  labels,
}: {
  config: MoyasarFormConfig;
  checkoutAttemptId: string;
  language: "en" | "ar";
  labels: { paymentMethod: string; encrypted: string; loadFailed: string; terms: string };
}) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMoyasar()
      .then(() => {
        if (cancelled || !host.current || !window.Moyasar) return;
        // A fresh element every time: Moyasar.init renders into it once.
        host.current.innerHTML = '<div class="mysr-form"></div>';
        window.Moyasar.init({
          element: ".mysr-form",
          language,
          ...config,
          // Back to the site the shopper is actually on. The server's guess
          // (first FRONTEND_URL entry) may be localhost or another domain,
          // which Moyasar rejects as "Callback URL is invalid". Safe: the
          // callback page only asks the server, which verifies with Moyasar.
          callback_url: `${window.location.origin}/checkout/callback`,
          on_completed: async (payment: { id: string }) => {
            // Must succeed before the redirect, or the order can only be
            // recovered by the webhook. Throwing here stops the redirect.
            const res = await bindMoyasarPayment(checkoutAttemptId, payment.id);
            if (!res.success) throw new Error(typeof res.error === "string" ? res.error : "Could not start the payment");
          },
        });
        setReady(true);
      })
      .catch(() => !cancelled && setError(labels.loadFailed));
    return () => { cancelled = true; };
  }, [config, checkoutAttemptId, language, labels.loadFailed]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E6EBEA] bg-white p-6">
        <div className="mb-4 flex items-center justify-between border-b border-[#F1F4F4] pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[#004643]" />
            <h3 className="text-[14px] font-medium text-[#101212]">{labels.paymentMethod}</h3>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#8E9493]">
            <Lock className="h-3 w-3 text-[#28603A]" />
            <span>{labels.encrypted}</span>
          </div>
        </div>

        {!ready && !error && (
          <div className="flex items-center justify-center py-10 text-[#8E9493]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        <div ref={host} />

        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#812F28]/25 bg-[#FFFAF9] p-3.5 text-[12.5px] text-[#812F28]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
      <p className="text-center text-[11px] text-[#8E9493]">{labels.terms}</p>
    </div>
  );
}
