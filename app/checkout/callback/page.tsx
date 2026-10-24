"use client";

/**
 * Moyasar return page — /checkout/callback?id=<payment id>&status=…&message=…
 * ----------------------------------------------------------------------------
 * Moyasar sends the shopper here after the card / 3-D Secure / STC Pay step.
 * The `status` in the URL is only a hint: the server fetches the payment from
 * Moyasar with the secret key and creates the order only if it is really paid,
 * for the right amount. Then we hand over to /checkout/success, which already
 * knows how to show an order looked up by its payment id.
 */

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { confirmMoyasarPayment } from "@/lib/api/checkout";
import { useLanguage } from "@/lib/i18n/useTranslations";

const COPY = {
  en: {
    confirming: "Confirming your payment…",
    failedTitle: "Your payment did not go through",
    failedBody: "You have not been charged. You can try again with another card or method.",
    refundedTitle: "Your payment was refunded",
    slowTitle: "Still confirming",
    slowBody: "Your bank is taking a while. If you were charged, your order will appear in My orders within a few minutes — please don't pay again.",
    missing: "We could not find a payment to confirm.",
    retry: "Back to checkout",
    orders: "Go to my orders",
  },
  ar: {
    confirming: "جارٍ تأكيد الدفع…",
    failedTitle: "لم تتم عملية الدفع",
    failedBody: "لم يتم خصم أي مبلغ. يمكنك المحاولة مرة أخرى ببطاقة أو طريقة أخرى.",
    refundedTitle: "تم استرداد المبلغ",
    slowTitle: "ما زال التأكيد جارياً",
    slowBody: "يستغرق البنك وقتاً أطول. إذا تم الخصم، سيظهر طلبك في طلباتي خلال دقائق — يرجى عدم الدفع مرة أخرى.",
    missing: "لم نجد عملية دفع لتأكيدها.",
    retry: "العودة إلى الدفع",
    orders: "الذهاب إلى طلباتي",
  },
};

const POLL_MS = 2000;
const GIVE_UP_MS = 30000;

type View =
  | { kind: "confirming" }
  | { kind: "failed"; message?: string }
  | { kind: "refunded"; message?: string }
  | { kind: "slow" }
  | { kind: "missing" };

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const paymentId = params.get("id");
  const { language, isRtl } = useLanguage();
  const t = COPY[language === "ar" ? "ar" : "en"];
  const [polled, setView] = useState<View>({ kind: "confirming" });
  const view: View = paymentId ? polled : { kind: "missing" };

  useEffect(() => {
    if (!paymentId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const started = Date.now();

    const attempt = async () => {
      if (stopped) return;
      const res = await confirmMoyasarPayment(paymentId);
      if (stopped) return;
      if (res.success) {
        const d = res.data;
        if (d.status === "succeeded") {
          router.replace(`/checkout/success?payment_intent=${encodeURIComponent(paymentId)}`);
          return;
        }
        if (d.status === "payment_failed") { setView({ kind: "failed", message: d.message }); return; }
        if (d.status === "refunded") { setView({ kind: "refunded", message: d.message }); return; }
      }
      // processing, or a transient error: keep asking for a while
      if (Date.now() - started > GIVE_UP_MS) { setView({ kind: "slow" }); return; }
      timer = setTimeout(attempt, POLL_MS);
    };
    attempt();
    return () => { stopped = true; clearTimeout(timer); };
  }, [paymentId, router]);

  const box = (title: string, body?: string, retry = true) => (
    <div className="mx-auto max-w-md rounded-2xl border border-[#E6EBEA] bg-white p-8 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#FFFAF9] text-[#812F28]">
        <AlertCircle className="h-7 w-7" />
      </div>
      <h1 className="text-[18px] font-medium text-[#101212]">{title}</h1>
      {body && <p className="mt-2 text-[13px] text-[#646968]">{body}</p>}
      <div className="mt-6 flex flex-col items-center gap-2">
        {retry && (
          <Link href="/checkout" className="inline-flex items-center gap-2 rounded-full bg-[#004643] px-5 py-2.5 text-[12.5px] font-medium text-white hover:bg-[#003836]">
            <ArrowLeft className={`h-3.5 w-3.5 ${isRtl ? "rotate-180" : ""}`} />
            {t.retry}
          </Link>
        )}
        <Link href="/orders" className="text-[12.5px] text-[#004643] underline-offset-2 hover:underline">{t.orders}</Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4" dir={isRtl ? "rtl" : "ltr"}>
      {view.kind === "confirming" && (
        <div className="flex flex-col items-center gap-3 text-[13px] text-[#646968]">
          <Loader2 className="h-7 w-7 animate-spin text-[#004643]" />
          {t.confirming}
        </div>
      )}
      {view.kind === "failed" && box(t.failedTitle, [view.message, t.failedBody].filter(Boolean).join(" "))}
      {view.kind === "refunded" && box(t.refundedTitle, view.message)}
      {view.kind === "slow" && box(t.slowTitle, t.slowBody, false)}
      {view.kind === "missing" && box(t.missing)}
    </div>
  );
}

export default function MoyasarCallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#004643]" /></div>}>
      <CallbackInner />
    </Suspense>
  );
}
