"use client";

/**
 * Orders — screen 06
 * ----------------------------------------------------------------------------
 * One row per order: number, item count, date placed, how many shipments, the
 * total, a status pill and a way into tracking.
 *
 * The status pill is the part worth understanding. An order with three vendors
 * has three shipments, each at its own stage, and no single status of its own.
 * `deriveOrderStage` takes the least-progressed one — an order is only as
 * complete as its slowest parcel. Showing "Delivered" while two of three boxes
 * are still in transit is how you generate a support ticket and a refund
 * request from someone whose furniture is fine.
 *
 * Tabs filter on that derived stage, and their counts come from the same
 * function, so a row can never appear under a tab it doesn't match.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, ChevronRight, Loader2, AlertCircle, Truck, Check } from "lucide-react";

import ShopHeader from "@/components/marketplace/ShopHeader";
import { useLanguage } from "@/lib/i18n/useTranslations";
import {
  getUserOrders, deriveOrderStage,
  type Order, type ShipmentStage,
} from "@/lib/api/orders";

const COPY = {
  en: {
    title: "Orders",
    subtitle: "Each vendor ships separately. Track every shipment here.",
    tabAll: "All",
    tabProgress: "In progress",
    tabDelivered: "Delivered",
    empty: "No orders in this view.",
    emptyAllTitle: "No orders yet",
    emptyAllBody: "When you buy something, it'll appear here with tracking for each vendor.",
    browse: "Browse marketplace",
    placed: (d: string) => `Placed ${d}`,
    items: (n: number) => `${n} item${n === 1 ? "" : "s"}`,
    shipments: (n: number) => `${n} shipment${n === 1 ? "" : "s"}`,
    loadFailed: "We couldn't load your orders. Please try again.",
    stage: {
      label_pending: "Preparing",
      label_created: "Ready to ship",
      in_transit: "In transit",
      out_for_delivery: "Out for delivery",
      delivered: "Delivered",
    } as Record<ShipmentStage, string>,
  },
  ar: {
    title: "الطلبات",
    subtitle: "يشحن كل مورد على حدة. تتبع كل شحنة هنا.",
    tabAll: "الكل",
    tabProgress: "قيد التنفيذ",
    tabDelivered: "تم التسليم",
    empty: "لا توجد طلبات في هذا العرض.",
    emptyAllTitle: "لا توجد طلبات بعد",
    emptyAllBody: "عند إتمام عملية شراء، ستظهر هنا مع تتبع لكل مورد.",
    browse: "تصفح المتجر",
    placed: (d: string) => `بتاريخ ${d}`,
    items: (n: number) => `${n} منتج`,
    shipments: (n: number) => `${n} شحنة`,
    loadFailed: "تعذّر تحميل طلباتك. حاول مرة أخرى.",
    stage: {
      label_pending: "قيد التجهيز",
      label_created: "جاهز للشحن",
      in_transit: "في الطريق",
      out_for_delivery: "قيد التسليم",
      delivered: "تم التسليم",
    } as Record<ShipmentStage, string>,
  },
};

type Copy = typeof COPY["en"];
type Tab = "all" | "progress" | "delivered";

/** Pill colour by stage. Delivered is the only one that reads as finished. */
const STAGE_STYLE: Record<ShipmentStage, string> = {
  label_pending: "bg-[#F1F4F4] text-[#646968]",
  label_created: "bg-[#F1F4F4] text-[#646968]",
  in_transit: "bg-[#F3FEFD] text-[#004643]",
  out_for_delivery: "bg-[#F3FEFD] text-[#004643]",
  delivered: "bg-[#E7FBEB] text-[#28603A]",
};

function OrdersInner() {
  const router = useRouter();
  const { language, isRtl } = useLanguage();
  const t = COPY[language === "ar" ? "ar" : "en"];

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");

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
  const num = useCallback((v: number) => toArabicDigits(String(v)), [toArabicDigits]);
  const shortDate = useCallback(
    (iso: string) =>
      new Date(iso).toLocaleDateString(isRtl ? "ar" : "en-US", {
        day: "numeric", month: "short", year: "numeric",
      }),
    [isRtl],
  );

  useEffect(() => {
    let cancelled = false;
    getUserOrders()
      .then(res => {
        if (cancelled) return;
        if (res.success) setOrders(res.data.orders ?? []);
        else setError(typeof res.error === "string" ? res.error : t.loadFailed);
      })
      .catch(err => {
        if (!cancelled) {
          console.error("[orders] load failed:", err);
          setError(t.loadFailed);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [t.loadFailed]);

  /** Derived once so the tab counts and the rows can never disagree. */
  const staged = useMemo(
    () => orders.map(o => ({ order: o, stage: deriveOrderStage(o) })),
    [orders],
  );

  const counts = useMemo(() => ({
    all: staged.length,
    progress: staged.filter(s => s.stage !== "delivered").length,
    delivered: staged.filter(s => s.stage === "delivered").length,
  }), [staged]);

  const visible = useMemo(() => {
    if (tab === "progress") return staged.filter(s => s.stage !== "delivered");
    if (tab === "delivered") return staged.filter(s => s.stage === "delivered");
    return staged;
  }, [staged, tab]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: t.tabAll, count: counts.all },
    { key: "progress", label: t.tabProgress, count: counts.progress },
    { key: "delivered", label: t.tabDelivered, count: counts.delivered },
  ];

  return (
    <div className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <ShopHeader />

      <main className="mx-auto max-w-[1180px] px-5 pt-[120px] pb-20">
        <div>
          <h1 className="text-[27px] text-[#101212]">{t.title}</h1>
          <p className="mt-1 text-[12.5px] text-[#646968]">{t.subtitle}</p>
        </div>

        {/* Tabs */}
        {!loading && orders.length > 0 && (
          <div className="mt-6 flex items-center gap-2">
            {tabs.map(x => (
              <button
                key={x.key}
                onClick={() => setTab(x.key)}
                aria-pressed={tab === x.key}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors ${
                  tab === x.key
                    ? "border-[#004643] bg-[#004643] text-white"
                    : "border-[#D5DBDA] bg-white text-[#343837] hover:bg-[#F1F4F4]"
                }`}
              >
                {x.label}
                <span className={tab === x.key ? "text-white/60" : "text-[#8E9493]"}>
                  {num(x.count)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[76px] animate-pulse rounded-2xl border border-[#E6EBEA] bg-[#FBFCFC]" />
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-[#812F28]/25 bg-[#FFFAF9] p-4 text-[12.5px] text-[#812F28]">
            <AlertCircle className="mt-px h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* No orders at all */}
        {!loading && !error && orders.length === 0 && (
          <div className="mt-8 rounded-2xl border border-[#E6EBEA] bg-[#FBFCFC] py-16 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#B3B9B9]">
              <Package className="h-6 w-6" strokeWidth={1.25} />
            </span>
            <div className="text-[15px] font-medium text-[#101212]">{t.emptyAllTitle}</div>
            <p className="mx-auto mt-1.5 max-w-[380px] text-[12.5px] text-[#646968]">
              {t.emptyAllBody}
            </p>
            <button
              onClick={() => router.push("/marketplace")}
              className="mt-5 rounded-full bg-[#004643] px-4 py-2 text-[12.5px] font-medium text-white hover:bg-[#003836]"
            >
              {t.browse}
            </button>
          </div>
        )}

        {/* Rows */}
        {!loading && !error && orders.length > 0 && (
          <div className="mt-5 space-y-3">
            {visible.length === 0 && (
              <div className="rounded-2xl border border-[#E6EBEA] bg-[#FBFCFC] py-10 text-center text-[12.5px] text-[#8E9493]">
                {t.empty}
              </div>
            )}

            {visible.map(({ order, stage }) => {
              const itemCount = (order.order_items ?? []).reduce(
                (n, i) => n + (i.quantity ?? 0), 0,
              );
              const shipmentCount = (order.order_shipments ?? []).length;
              const thumb = (order.order_items ?? [])
                .map(i => i.product_variants?.images?.[0])
                .find(Boolean);

              return (
                <button
                  key={order.id}
                  onClick={() => router.push(`/orders/${order.id}`)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-[#E6EBEA] bg-white p-4 text-start transition-colors hover:border-[#D5DBDA] hover:bg-[#FBFCFC]"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E6EBEA] bg-[#F1F4F4]">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-4 w-4 text-[#B3B9B9]" strokeWidth={1.25} />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-[#101212]">
                      {order.order_number}
                      <span className="font-normal text-[#8E9493]"> · {t.items(itemCount)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[#646968]">
                      {t.placed(shortDate(order.created_at))}
                      <span className="text-[#D5DBDA]">·</span>
                      <Truck className="h-2.5 w-2.5" />
                      {t.shipments(shipmentCount)}
                    </span>
                  </span>

                  <span className="shrink-0 text-[13px] font-semibold text-[#004643]">
                    {money(order.total_amount)}
                  </span>

                  <span
                    className={`hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline-flex ${STAGE_STYLE[stage]}`}
                  >
                    {stage === "delivered" && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                    {t.stage[stage]}
                  </span>

                  <ChevronRight
                    className={`h-4 w-4 shrink-0 text-[#B3B9B9] ${isRtl ? "rotate-180" : ""}`}
                  />
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <OrdersInner />
    </Suspense>
  );
}