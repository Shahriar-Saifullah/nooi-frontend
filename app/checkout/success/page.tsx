"use client";

/**
 * Order placed — screen 05
 * ----------------------------------------------------------------------------
 * Where Stripe redirects after a successful payment. The order does not exist
 * yet at that moment: Stripe redirects the browser and delivers the webhook
 * independently, and the webhook is what runs create_order_atomic. So this page
 * polls until the order row appears.
 *
 * The state machine is unchanged from the original and handles the cases that
 * actually occur: the webhook lands in a second or two (SUCCESS), stock ran out
 * between payment and fulfilment and a refund was issued (STOCK_FAILED), the
 * card was declined (PAYMENT_FAILED), or the webhook is slow and we stop
 * spinning rather than hanging forever (PROCESSING).
 *
 * What's new is the per-vendor breakdown the design calls for. A three-vendor
 * order means three deliveries on three dates, and a shopper who sees one total
 * and one "thank you" will be confused when a single box turns up. Naming each
 * vendor and its arrival date here prevents the support email.
 *
 * clearCart runs only on confirmed success. Clearing on redirect would empty
 * the cart of someone whose payment then failed.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Check, Clock, AlertOctagon, XCircle, ArrowRight, PackageCheck,
  RefreshCw, Truck, Box, MapPin,
} from "lucide-react";

import { getOrderByPaymentIntent } from "@/lib/api/checkout";
import { useCartStore } from "@/lib/store/cart.store";
import { useLanguage } from "@/lib/i18n/useTranslations";

type CheckoutState =
  | "CONFIRMING" | "SUCCESS" | "STOCK_FAILED" | "PAYMENT_FAILED" | "PROCESSING";

const COPY = {
  en: {
    confirmingTitle: "Confirming your order",
    confirmingBody: "Your payment went through. We're reserving stock with each vendor now.",
    polling: "This usually takes a few seconds",
    placedTitle: "Order placed",
    placedBody: "Thank you. Each vendor has been notified and will confirm shortly.",
    orderNumber: "Order number",
    paid: "Paid",
    deliveringTo: "Delivering to",
    whatNext: "What happens next",
    confirms: (vendor: string) => `${vendor} confirms within 24 hours`,
    items: (n: number) => `${n} item${n === 1 ? "" : "s"}`,
    arrivesBy: (date: string) => `Arrives by ${date}`,
    arrivalPending: "Arrival date confirmed at dispatch",
    continueShopping: "Continue shopping",
    trackOrder: "Track order",
    stockTitle: "An item sold out",
    stockBody: "One of your items became unavailable before we could reserve it. Your card has been refunded in full — it usually clears within five working days.",
    backToShop: "Back to marketplace",
    failedTitle: "Payment didn't go through",
    failedBody: "Your card was not charged. Check the details and try again.",
    tryAgain: "Try again",
    processingTitle: "Payment received",
    processingBody: "Your payment is confirmed and your order is being created. It will appear in Orders in a moment — nothing further is needed from you.",
    goToOrders: "Go to orders",
    missingIntent: "We couldn't identify this payment.",
    declined: "Your payment was declined by your bank.",
  },
  ar: {
    confirmingTitle: "جارٍ تأكيد طلبك",
    confirmingBody: "تم الدفع بنجاح. نقوم الآن بحجز المخزون لدى كل مورد.",
    polling: "يستغرق هذا عادةً بضع ثوانٍ",
    placedTitle: "تم تقديم الطلب",
    placedBody: "شكرًا لك. تم إخطار كل مورد وسيؤكد قريبًا.",
    orderNumber: "رقم الطلب",
    paid: "المدفوع",
    deliveringTo: "التوصيل إلى",
    whatNext: "ما الذي سيحدث بعد ذلك",
    confirms: (vendor: string) => `${vendor} يؤكد خلال 24 ساعة`,
    items: (n: number) => `${n} منتج`,
    arrivesBy: (date: string) => `يصل بحلول ${date}`,
    arrivalPending: "يُحدَّد تاريخ الوصول عند الشحن",
    continueShopping: "متابعة التسوق",
    trackOrder: "تتبع الطلب",
    stockTitle: "نفدت كمية أحد المنتجات",
    stockBody: "أصبح أحد منتجاتك غير متوفر قبل أن نتمكن من حجزه. تم استرداد المبلغ بالكامل — يصل عادةً خلال خمسة أيام عمل.",
    backToShop: "العودة إلى المتجر",
    failedTitle: "لم تتم عملية الدفع",
    failedBody: "لم يتم خصم أي مبلغ من بطاقتك. تحقق من التفاصيل وحاول مرة أخرى.",
    tryAgain: "حاول مرة أخرى",
    processingTitle: "تم استلام الدفع",
    processingBody: "تم تأكيد دفعتك ويجري إنشاء طلبك. سيظهر في الطلبات بعد لحظات — لا يلزمك فعل أي شيء.",
    goToOrders: "الذهاب إلى الطلبات",
    missingIntent: "تعذّر التعرّف على هذه العملية.",
    declined: "تم رفض الدفع من قبل البنك.",
  },
};

type Copy = typeof COPY["en"];

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

function SuccessContent() {
  const params = useSearchParams();
  const paymentIntentId = params.get("payment_intent");
  const redirectStatus = params.get("redirect_status");

  const { language, isRtl } = useLanguage();
  const t = COPY[language === "ar" ? "ar" : "en"];

  const [state, setState] = useState<CheckoutState>("CONFIRMING");
  const [order, setOrder] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearCart = useCartStore(s => s.clearCart);
  // Kept in a ref so the polling effect doesn't restart when the store changes.
  const clearCartRef = useRef(clearCart);
  clearCartRef.current = clearCart;

  const toArabicDigits = useCallback(
    (s: string) => (isRtl ? s.replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[+d]) : s),
    [isRtl],
  );
  const money = useCallback(
    (v: number) =>
      toArabicDigits(
        `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ),
    [toArabicDigits],
  );
  const shortDate = useCallback(
    (iso?: string | null) => {
      if (!iso) return null;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleDateString(isRtl ? "ar" : "en-US", {
        day: "numeric", month: "long",
      });
    },
    [isRtl],
  );

  useEffect(() => {
    if (!paymentIntentId) {
      setState("PAYMENT_FAILED");
      setErrorMessage(t.missingIntent);
      return;
    }
    if (redirectStatus === "failed") {
      setState("PAYMENT_FAILED");
      setErrorMessage(t.declined);
      return;
    }

    let intervalId: ReturnType<typeof setInterval>;
    let stopped = false;
    const startedAt = Date.now();

    const stop = () => {
      stopped = true;
      clearInterval(intervalId);
    };

    const poll = async () => {
      if (stopped) return;
      try {
        const res = await getOrderByPaymentIntent(paymentIntentId);

        if (res.success) {
          const data = res.data;

          if (data.status === "succeeded") {
            setOrder(data.order);
            setState("SUCCESS");
            // Only here. Clearing earlier would empty the cart of someone
            // whose payment then failed.
            clearCartRef.current();
            stop();
            return;
          }
          if (data.status === "stock_failed") {
            setState("STOCK_FAILED");
            setErrorMessage(data.message ?? null);
            stop();
            return;
          }
          if (data.status === "payment_failed") {
            setState("PAYMENT_FAILED");
            setErrorMessage(data.message ?? null);
            stop();
            return;
          }
        }

        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          // The payment is real either way — say so rather than implying
          // something went wrong.
          setState("PROCESSING");
          stop();
        }
      } catch {
        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          setState("PROCESSING");
          stop();
        }
      }
    };

    void poll();
    intervalId = setInterval(poll, POLL_INTERVAL_MS);
    return () => { stopped = true; clearInterval(intervalId); };
  }, [paymentIntentId, redirectStatus, t.missingIntent, t.declined]);

  /** One row per vendor: who, how many items, when it arrives. */
  const shipments = useMemo(() => {
    if (!order) return [];
    const items: any[] = order.order_items ?? [];
    return (order.order_shipments ?? []).map((s: any) => {
      const mine = items.filter(i => i.retailer_id === s.retailer_id);
      return {
        id: s.id,
        vendor: s.retailers?.name ?? "Vendor",
        city: s.retailers?.city ?? null,
        itemCount: mine.reduce((n, i) => n + (i.quantity ?? 0), 0),
        eta: shortDate(s.estimated_delivery),
      };
    });
  }, [order, shortDate]);

  const city = order?.shipping_address?.city ?? null;

  return (
    <div className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <MinimalHeader />

      <main className="mx-auto max-w-[620px] px-5 pt-[140px] pb-20">
        {state === "CONFIRMING" && (
          <Panel
            tone="neutral"
            icon={<RefreshCw className="h-7 w-7 animate-spin" />}
            title={t.confirmingTitle}
            body={t.confirmingBody}
          >
            <div className="mt-5 flex items-center justify-center gap-1.5 text-[11.5px] text-[#8E9493]">
              <Clock className="h-3 w-3" />
              {t.polling}
            </div>
          </Panel>
        )}

        {state === "SUCCESS" && (
          <>
            <div className="text-center">
              <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#E7FBEB] text-[#28603A]">
                <Check className="h-7 w-7" strokeWidth={2.5} />
              </span>
              <h1 className="text-[27px] text-[#101212]">{t.placedTitle}</h1>
              <p className="mt-2 text-[13px] text-[#646968]">{t.placedBody}</p>
            </div>

            {order && (
              <>
                <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-[#E6EBEA] bg-[#E6EBEA]">
                  <Fact label={t.orderNumber} value={order.order_number} mono />
                  <Fact label={t.paid} value={money(order.total_amount)} accent />
                  <Fact label={t.deliveringTo} value={city ?? "—"} />
                </div>

                {shipments.length > 0 && (
                  <section className="mt-7 rounded-2xl border border-[#E6EBEA] p-5">
                    <span className="text-[13px] font-medium text-[#101212]">
                      {t.whatNext}
                    </span>
                    <div className="mt-3 divide-y divide-[#F1F4F4]">
                      {shipments.map((s: any) => (
                        <div key={s.id} className="flex items-start gap-3 py-3">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F4F4] text-[#646968]">
                            <Truck className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12.5px] text-[#101212]">
                              {t.confirms(s.vendor)}
                              <span className="text-[#8E9493]"> · {t.items(s.itemCount)}</span>
                            </span>
                            <span className="mt-0.5 flex items-center gap-1 text-[11.5px] text-[#646968]">
                              {s.eta ? (
                                t.arrivesBy(s.eta)
                              ) : (
                                <span className="text-[#8E9493]">{t.arrivalPending}</span>
                              )}
                              {s.city && (
                                <>
                                  <span className="text-[#D5DBDA]">·</span>
                                  <MapPin className="h-2.5 w-2.5" />
                                  {s.city}
                                </>
                              )}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/marketplace"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#D5DBDA] bg-white py-3 text-[12.5px] font-medium text-[#004643] transition hover:bg-[#F1F4F4]"
              >
                {t.continueShopping}
                <ArrowRight className={`h-3.5 w-3.5 ${isRtl ? "rotate-180" : ""}`} />
              </Link>
              <Link
                href={order?.id ? `/orders/${order.id}` : "/orders"}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#004643] py-3 text-[12.5px] font-medium text-white transition hover:bg-[#003836]"
              >
                <PackageCheck className="h-3.5 w-3.5" />
                {t.trackOrder}
              </Link>
            </div>
          </>
        )}

        {state === "STOCK_FAILED" && (
          <Panel
            tone="alert"
            icon={<AlertOctagon className="h-7 w-7" />}
            title={t.stockTitle}
            body={errorMessage || t.stockBody}
          >
            <Link
              href="/marketplace"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#004643] px-5 py-2.5 text-[12.5px] font-medium text-white transition hover:bg-[#003836]"
            >
              {t.backToShop}
            </Link>
          </Panel>
        )}

        {state === "PAYMENT_FAILED" && (
          <Panel
            tone="alert"
            icon={<XCircle className="h-7 w-7" />}
            title={t.failedTitle}
            body={errorMessage || t.failedBody}
          >
            <Link
              href="/checkout"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#004643] px-5 py-2.5 text-[12.5px] font-medium text-white transition hover:bg-[#003836]"
            >
              {t.tryAgain}
            </Link>
          </Panel>
        )}

        {state === "PROCESSING" && (
          <Panel
            tone="neutral"
            icon={<Clock className="h-7 w-7" />}
            title={t.processingTitle}
            body={t.processingBody}
          >
            <Link
              href="/orders"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#004643] px-5 py-2.5 text-[12.5px] font-medium text-white transition hover:bg-[#003836]"
            >
              <PackageCheck className="h-3.5 w-3.5" />
              {t.goToOrders}
            </Link>
          </Panel>
        )}
      </main>
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function Fact({
  label, value, mono = false, accent = false,
}: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="bg-white px-4 py-3.5">
      <span className="block text-[11px] text-[#8E9493]">{label}</span>
      <span
        className={`mt-0.5 block truncate text-[13.5px] font-medium ${
          accent ? "text-[#004643]" : "text-[#101212]"
        } ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function Panel({
  tone, icon, title, body, children,
}: {
  tone: "neutral" | "alert";
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const alert = tone === "alert";
  return (
    <div
      className={`rounded-2xl border p-8 text-center ${
        alert ? "border-[#812F28]/25 bg-[#FFFAF9]" : "border-[#E6EBEA] bg-[#FBFCFC]"
      }`}
    >
      <span
        className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${
          alert ? "bg-white text-[#812F28]" : "bg-white text-[#646968]"
        }`}
      >
        {icon}
      </span>
      <h1 className="text-[19px] font-medium text-[#101212]">{title}</h1>
      <p className="mx-auto mt-2 max-w-[420px] text-[13px] leading-relaxed text-[#646968]">
        {body}
      </p>
      {children}
    </div>
  );
}

/** No cart, no search — this page is the end of a transaction, not a shop. */
function MinimalHeader() {
  return (
    <>
      <div
        aria-hidden
        className="fixed top-0 left-0 right-0 h-[118px] z-40 pointer-events-none bg-gradient-to-b from-white via-white/90 to-transparent"
      />
      <header className="fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[1240px] h-[72px] z-50">
        <div className="flex h-full w-full items-center rounded-[22px] border border-[#e2eaf0] bg-[#f7fbfc]/90 px-[16px] backdrop-blur-[100px] md:px-[24px]">
          <Link href="/" className="flex items-center gap-[9px]">
            <Image
              width={100}
              height={100}
              src="/assets/logo.png"
              alt="NOOI"
              className="h-auto w-[32px] object-contain md:w-[40px]"
            />
            <span className="font-inter text-[18px] font-bold tracking-tight text-[#111d27] md:text-[20px]">
              NOOI
            </span>
          </Link>
        </div>
      </header>
    </>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <RefreshCw className="h-7 w-7 animate-spin text-[#004643]" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}