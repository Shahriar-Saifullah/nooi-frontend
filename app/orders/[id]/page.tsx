"use client";

/**
 * Order tracking — screen 07
 * ----------------------------------------------------------------------------
 * One section per shipment: which vendor, what's in it, where it is, and the
 * timeline. Plus the return flow, which the design opens from an item here
 * rather than as a separate page.
 *
 * The timeline needs explaining. `order_tracking_events` is read in three
 * places and written in none — carrier tracking (NOOI-61, ShipEngine) isn't
 * built. So rather than render an empty list, the five canonical stages are
 * drawn from `shipment_status`: everything up to the current stage reads as
 * reached, everything after as pending.
 *
 * When real events do exist they overlay their own timestamps and locations on
 * the matching stages. So this page works today with zero events and gets
 * richer on its own once the carrier integration writes them — no change here.
 *
 * Returns are gated on delivery. Whether that window should be 14 or 30 days is
 * still an open decision, so for now the only rule is that a shipment must have
 * arrived; add the SLA check in `canReturn` once someone decides.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Package, Truck, Check, Copy, CheckCheck, Info, Loader2,
  AlertCircle, X, MapPin,
} from "lucide-react";

import ShopHeader from "@/components/marketplace/ShopHeader";
import { useLanguage } from "@/lib/i18n/useTranslations";
import {
  getOrderById, submitReturnRequest, deriveOrderStage,
  SHIPMENT_PROGRESSION,
  type Order, type OrderItem, type OrderShipment, type ShipmentStage,
} from "@/lib/api/orders";

const COPY = {
  en: {
    allOrders: "All orders",
    placedLine: (date: string, total: string, city: string) =>
      `Placed ${date} · ${total} paid · delivering to ${city}`,
    multi: (n: number) =>
      `This order ships in ${n} shipments, one per vendor. It stays open until every shipment is delivered.`,
    shipment: (n: number, vendor: string) => `Shipment ${n} · ${vendor}`,
    shipsFrom: (city: string) => `from ${city}`,
    etaBy: (d: string) => `Arrives by ${d}`,
    etaPending: "Arrival date confirmed at dispatch",
    qty: "Qty",
    trackingNumber: "Tracking number",
    copy: "Copy",
    copied: "Copied",
    reportIssue: "Return or report an issue",
    returnRequested: "Return requested",
    returnTitle: "Return or report an issue",
    returnBody: "Tell us what went wrong. The vendor reviews every request and responds within two working days.",
    reasonLabel: "What's the problem?",
    reasons: [
      "Arrived damaged",
      "Wrong item sent",
      "Not as described",
      "Changed my mind",
      "Something else",
    ],
    detailsLabel: "Anything else we should know? (optional)",
    detailsPlaceholder: "A short description helps the vendor resolve it faster.",
    submit: "Request return",
    submitting: "Sending",
    cancel: "Cancel",
    returnSent: "Return requested. The vendor will be in touch within two working days.",
    returnFailed: "We couldn't send that request. Please try again.",
    notDelivered: "Available once this shipment arrives",
    loadFailed: "We couldn't load this order.",
    notFound: "Order not found",
    notFoundBody: "This order may belong to another account.",
    stage: {
      label_pending: "Order confirmed",
      label_created: "Preparing for dispatch",
      in_transit: "In transit",
      out_for_delivery: "Out for delivery",
      delivered: "Delivered",
    } as Record<ShipmentStage, string>,
  },
  ar: {
    allOrders: "كل الطلبات",
    placedLine: (date: string, total: string, city: string) =>
      `بتاريخ ${date} · تم دفع ${total} · التوصيل إلى ${city}`,
    multi: (n: number) =>
      `يُشحن هذا الطلب في ${n} شحنات، واحدة لكل مورد. يبقى مفتوحًا حتى تسليم كل الشحنات.`,
    shipment: (n: number, vendor: string) => `شحنة ${n} · ${vendor}`,
    shipsFrom: (city: string) => `من ${city}`,
    etaBy: (d: string) => `يصل بحلول ${d}`,
    etaPending: "يُحدَّد تاريخ الوصول عند الشحن",
    qty: "الكمية",
    trackingNumber: "رقم التتبع",
    copy: "نسخ",
    copied: "تم النسخ",
    reportIssue: "إرجاع أو الإبلاغ عن مشكلة",
    returnRequested: "تم طلب الإرجاع",
    returnTitle: "إرجاع أو الإبلاغ عن مشكلة",
    returnBody: "أخبرنا بما حدث. يراجع المورد كل طلب ويرد خلال يومي عمل.",
    reasonLabel: "ما المشكلة؟",
    reasons: [
      "وصل تالفًا",
      "تم إرسال منتج خاطئ",
      "لا يطابق الوصف",
      "غيّرت رأيي",
      "شيء آخر",
    ],
    detailsLabel: "هل من شيء آخر ينبغي معرفته؟ (اختياري)",
    detailsPlaceholder: "وصف قصير يساعد المورد على الحل بسرعة.",
    submit: "طلب الإرجاع",
    submitting: "جارٍ الإرسال",
    cancel: "إلغاء",
    returnSent: "تم طلب الإرجاع. سيتواصل المورد خلال يومي عمل.",
    returnFailed: "تعذّر إرسال الطلب. حاول مرة أخرى.",
    notDelivered: "متاح بعد وصول هذه الشحنة",
    loadFailed: "تعذّر تحميل هذا الطلب.",
    notFound: "الطلب غير موجود",
    notFoundBody: "قد يكون هذا الطلب تابعًا لحساب آخر.",
    stage: {
      label_pending: "تم تأكيد الطلب",
      label_created: "قيد التجهيز للشحن",
      in_transit: "في الطريق",
      out_for_delivery: "قيد التسليم",
      delivered: "تم التسليم",
    } as Record<ShipmentStage, string>,
  },
};

type Copy = typeof COPY["en"] | typeof COPY["ar"];

const STAGE_STYLE: Record<ShipmentStage, string> = {
  label_pending: "bg-[#F1F4F4] text-[#646968]",
  label_created: "bg-[#F1F4F4] text-[#646968]",
  in_transit: "bg-[#F3FEFD] text-[#004643]",
  out_for_delivery: "bg-[#F3FEFD] text-[#004643]",
  delivered: "bg-[#E7FBEB] text-[#28603A]",
};

function TrackingInner() {
  const router = useRouter();
  const routeParams = useParams<{ id: string }>();
  const orderId = routeParams?.id;

  const { language, isRtl } = useLanguage();
  const t = COPY[language === "ar" ? "ar" : "en"];

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Return flow
  const [returningItem, setReturningItem] = useState<OrderItem | null>(null);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [requestedItemIds, setRequestedItemIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

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
    (iso?: string | null) => {
      if (!iso) return null;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleDateString(isRtl ? "ar" : "en-US", {
        day: "numeric", month: "short", year: "numeric",
      });
    },
    [isRtl],
  );

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    getOrderById(orderId)
      .then(res => {
        if (cancelled) return;
        if (res.success) setOrder(res.data.order);
        else setError(typeof res.error === "string" ? res.error : t.loadFailed);
      })
      .catch(err => {
        if (!cancelled) {
          console.error("[order] load failed:", err);
          setError(t.loadFailed);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [orderId, t.loadFailed]);

  const copyTracking = useCallback(async (shipmentId: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(shipmentId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard can be blocked; the number is on screen either way.
    }
  }, []);

  const sendReturn = useCallback(async () => {
    if (!order || !returningItem || !reason) return;
    setSending(true);
    setReturnError(null);
    try {
      const res = await submitReturnRequest(order.id, {
        order_item_id: returningItem.id,
        reason: details.trim() ? `${reason} — ${details.trim()}` : reason,
      });
      if (!res.success) {
        setReturnError(typeof res.error === "string" ? res.error : t.returnFailed);
        setSending(false);
        return;
      }
      setRequestedItemIds(prev => new Set(prev).add(returningItem.id));
      setReturningItem(null);
      setReason("");
      setDetails("");
      setToast(t.returnSent);
      setTimeout(() => setToast(null), 6000);
    } catch (err) {
      console.error("[order] return failed:", err);
      setReturnError(t.returnFailed);
    } finally {
      setSending(false);
    }
  }, [order, returningItem, reason, details, t.returnFailed, t.returnSent]);

  const shipments: OrderShipment[] = order?.order_shipments ?? [];
  const orderStage = order ? deriveOrderStage(order) : "label_pending";
  const city = order?.shipping_address?.city ?? "—";

  if (loading) {
    return (
      <div className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
        <ShopHeader />
        <main className="mx-auto max-w-[1180px] px-5 pt-[120px]">
          <div className="h-8 w-48 animate-pulse rounded bg-[#F1F4F4]" />
          <div className="mt-6 h-64 animate-pulse rounded-2xl bg-[#F1F4F4]" />
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
        <ShopHeader />
        <main className="mx-auto max-w-[620px] px-5 pt-[160px] text-center">
          <h1 className="text-[20px] font-medium text-[#101212]">{t.notFound}</h1>
          <p className="mt-2 text-[13px] text-[#646968]">{error || t.notFoundBody}</p>
          <button
            onClick={() => router.push("/orders")}
            className="mt-5 rounded-full bg-[#004643] px-4 py-2 text-[12.5px] font-medium text-white hover:bg-[#003836]"
          >
            {t.allOrders}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <ShopHeader />

      <main className="mx-auto max-w-[1180px] px-5 pt-[120px] pb-20">
        <button
          onClick={() => router.push("/orders")}
          className="flex items-center gap-1.5 text-[12.5px] text-[#646968] transition-colors hover:text-[#004643]"
        >
          <ArrowLeft className={`h-3.5 w-3.5 ${isRtl ? "rotate-180" : ""}`} />
          {t.allOrders}
        </button>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[27px] text-[#101212]">{order.order_number}</h1>
            <p className="mt-1 text-[12.5px] text-[#646968]">
              {t.placedLine(
                shortDate(order.created_at) ?? "—",
                money(order.total_amount),
                city,
              )}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-medium ${STAGE_STYLE[orderStage]}`}
          >
            {orderStage === "delivered" && <Check className="h-3 w-3" strokeWidth={3} />}
            {t.stage[orderStage]}
          </span>
        </div>

        {shipments.length > 1 && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#E6EBEA] bg-[#FBFCFC] p-3.5 text-[12.5px] text-[#4B4F4F]">
            <Info className="mt-px h-4 w-4 shrink-0 text-[#646968]" />
            {t.multi(shipments.length)}
          </div>
        )}

        {toast && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#28603A]/25 bg-[#E7FBEB] p-3.5 text-[12.5px] text-[#28603A]">
            <Check className="mt-px h-4 w-4 shrink-0" strokeWidth={3} />
            {toast}
          </div>
        )}

        <div className="mt-6 space-y-5">
          {shipments.map((shipment, index) => (
            <ShipmentSection
              key={shipment.id}
              shipment={shipment}
              index={index}
              order={order}
              t={t}
              isRtl={isRtl}
              money={money}
              num={num}
              shortDate={shortDate}
              copiedId={copiedId}
              onCopy={copyTracking}
              requestedItemIds={requestedItemIds}
              onReturn={item => {
                setReturningItem(item);
                setReason("");
                setDetails("");
                setReturnError(null);
              }}
            />
          ))}
        </div>
      </main>

      {/* Return dialog */}
      {returningItem && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 sm:items-center"
          onClick={() => !sending && setReturningItem(null)}
        >
          <div
            role="dialog"
            aria-label={t.returnTitle}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-[460px] rounded-2xl border border-[#E6EBEA] bg-white p-5"
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-medium text-[#101212]">{t.returnTitle}</h2>
                <p className="mt-1 text-[12px] text-[#646968]">{t.returnBody}</p>
              </div>
              <button
                onClick={() => !sending && setReturningItem(null)}
                aria-label={t.cancel}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#8E9493] hover:bg-[#F1F4F4]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#E6EBEA] bg-[#FBFCFC] p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E6EBEA] bg-white">
                {returningItem.product_variants?.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={returningItem.product_variants.images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-4 w-4 text-[#B3B9B9]" strokeWidth={1.25} />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-medium text-[#101212]">
                  {returningItem.product_variants?.products?.title ?? "Item"}
                </span>
                <span className="block text-[11px] text-[#8E9493]">
                  {returningItem.product_variants?.color
                    ? `${returningItem.product_variants.color} · `
                    : ""}
                  {t.qty} {num(returningItem.quantity)}
                </span>
              </span>
            </div>

            <fieldset className="mt-4">
              <legend className="text-[12px] font-medium text-[#101212]">{t.reasonLabel}</legend>
              <div className="mt-2 space-y-1.5">
                {t.reasons.map(r => (
                  <label
                    key={r}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-[12.5px] transition-colors ${
                      reason === r
                        ? "border-[#87DDD7] bg-[#F3FEFD] text-[#004643]"
                        : "border-[#E6EBEA] text-[#343837] hover:bg-[#FBFCFC]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="return-reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="sr-only"
                    />
                    <span
                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                        reason === r ? "border-[#004643] bg-[#004643]" : "border-[#D5DBDA]"
                      }`}
                    >
                      {reason === r && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                    {r}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-4 block">
              <span className="text-[12px] font-medium text-[#101212]">{t.detailsLabel}</span>
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                rows={3}
                placeholder={t.detailsPlaceholder}
                className="mt-1.5 w-full resize-none rounded-xl border border-[#D5DBDA] px-3 py-2 text-[12.5px] text-[#101212] placeholder:text-[#B3B9B9] focus:border-[#87DDD7] focus:outline-none"
              />
            </label>

            {returnError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#812F28]/25 bg-[#FFFAF9] p-2.5 text-[11.5px] text-[#812F28]">
                <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                {returnError}
              </div>
            )}

            <div className="mt-5 flex gap-2.5">
              <button
                onClick={() => setReturningItem(null)}
                disabled={sending}
                className="flex-1 rounded-full border border-[#D5DBDA] bg-white py-2.5 text-[12.5px] font-medium text-[#343837] hover:bg-[#F1F4F4] disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                onClick={sendReturn}
                disabled={!reason || sending}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#004643] py-2.5 text-[12.5px] font-medium text-white hover:bg-[#003836] disabled:opacity-40"
              >
                {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {sending ? t.submitting : t.submit}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shipment ────────────────────────────────────────────────────────────────

function ShipmentSection({
  shipment, index, order, t, isRtl, money, num, shortDate,
  copiedId, onCopy, requestedItemIds, onReturn,
}: {
  shipment: OrderShipment;
  index: number;
  order: Order;
  t: Copy;
  isRtl: boolean;
  money: (v: number) => string;
  num: (v: number) => string;
  shortDate: (iso?: string | null) => string | null;
  copiedId: string | null;
  onCopy: (id: string, value: string) => void;
  requestedItemIds: Set<string>;
  onReturn: (item: OrderItem) => void;
}) {
  const items = (order.order_items ?? []).filter(i => i.retailer_id === shipment.retailer_id);
  const stage = (SHIPMENT_PROGRESSION.indexOf(shipment.shipment_status as ShipmentStage) === -1
    ? "label_pending"
    : shipment.shipment_status) as ShipmentStage;
  const currentIndex = SHIPMENT_PROGRESSION.indexOf(stage);
  const delivered = stage === "delivered";
  const eta = shortDate(shipment.estimated_delivery);

  /**
   * Real events keyed by the stage they correspond to. When carrier tracking
   * starts writing them, their timestamps and locations appear on the matching
   * steps without any change here.
   */
  const eventsByStage = useMemo(() => {
    const map = new Map<string, { timestamp: string; location: string | null; description: string | null }>();
    for (const e of shipment.order_tracking_events ?? []) {
      if (!map.has(e.status)) {
        map.set(e.status, { timestamp: e.timestamp, location: e.location, description: e.description });
      }
    }
    return map;
  }, [shipment.order_tracking_events]);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#E6EBEA]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6EBEA] bg-[#FBFCFC] px-4 py-3">
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium text-[#101212]">
            {t.shipment(index + 1, shipment.retailers?.name ?? "Vendor")}
          </span>
          {shipment.retailers?.city && (
            <span className="flex items-center gap-1 text-[11px] text-[#8E9493]">
              <MapPin className="h-2.5 w-2.5" />
              {t.shipsFrom(shipment.retailers.city)}
            </span>
          )}
        </span>
        <span className="shrink-0 text-[11.5px] text-[#646968]">
          {eta ? t.etaBy(eta) : t.etaPending}
        </span>
      </header>

      <div className="grid gap-5 p-4 md:grid-cols-[1fr_260px]">
        {/* Items */}
        <div className="space-y-3">
          {items.map(item => {
            const requested = requestedItemIds.has(item.id);
            const title = item.product_variants?.products?.title ?? "Item";
            const image = item.product_variants?.images?.[0];

            return (
              <div key={item.id} className="flex gap-3">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E6EBEA] bg-[#F1F4F4]">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-4 w-4 text-[#B3B9B9]" strokeWidth={1.25} />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium text-[#101212]">
                    {title}
                  </span>
                  <span className="block text-[11px] text-[#8E9493]">
                    {item.product_variants?.color ? `${item.product_variants.color} · ` : ""}
                    {t.qty} {num(item.quantity)} · {money(item.total_price)}
                  </span>

                  {requested ? (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#FFFBF2] px-2 py-0.5 text-[10.5px] font-medium text-[#812F28]">
                      <span className="h-1 w-1 rounded-full bg-[#812F28]" />
                      {t.returnRequested}
                    </span>
                  ) : delivered ? (
                    <button
                      onClick={() => onReturn(item)}
                      className="mt-1.5 text-[11px] text-[#004643] underline-offset-2 hover:underline"
                    >
                      {t.reportIssue}
                    </button>
                  ) : (
                    <span className="mt-1.5 block text-[10.5px] text-[#B3B9B9]">
                      {t.notDelivered}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {shipment.tracking_number && (
            <div className="mt-1 flex items-center justify-between gap-3 rounded-xl border border-[#E6EBEA] bg-[#FBFCFC] px-3 py-2">
              <span className="min-w-0">
                <span className="block text-[10.5px] text-[#8E9493]">{t.trackingNumber}</span>
                <span className="block truncate font-mono text-[12px] text-[#101212]">
                  {shipment.tracking_number}
                </span>
              </span>
              <button
                onClick={() => onCopy(shipment.id, shipment.tracking_number!)}
                className="flex shrink-0 items-center gap-1 rounded-full border border-[#D5DBDA] bg-white px-2.5 py-1 text-[11px] text-[#004643] hover:bg-[#F1F4F4]"
              >
                {copiedId === shipment.id ? (
                  <><CheckCheck className="h-3 w-3" />{t.copied}</>
                ) : (
                  <><Copy className="h-3 w-3" />{t.copy}</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Timeline */}
        <ol aria-label="Shipment progress" className="space-y-0">
          {SHIPMENT_PROGRESSION.map((s, i) => {
            const reached = i <= currentIndex;
            const isCurrent = i === currentIndex;
            const event = eventsByStage.get(s);
            const when = shortDate(event?.timestamp);
            const last = i === SHIPMENT_PROGRESSION.length - 1;

            return (
              <li key={s} className="flex gap-3">
                <span className="flex flex-col items-center">
                  <span
                    className={`mt-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${
                      reached
                        ? isCurrent
                          ? "border-[#004643] bg-[#004643]"
                          : "border-[#87DDD7] bg-[#87DDD7]"
                        : "border-[#D5DBDA] bg-white"
                    }`}
                  >
                    {reached && !isCurrent && (
                      <Check className="h-2 w-2 text-white" strokeWidth={4} />
                    )}
                  </span>
                  {!last && (
                    <span
                      className={`w-px flex-1 ${i < currentIndex ? "bg-[#87DDD7]" : "bg-[#E6EBEA]"}`}
                      style={{ minHeight: 26 }}
                    />
                  )}
                </span>

                <span className={`pb-4 ${last ? "pb-0" : ""}`}>
                  <span
                    className={`block text-[12px] ${
                      reached ? "font-medium text-[#101212]" : "text-[#B3B9B9]"
                    }`}
                  >
                    {t.stage[s]}
                  </span>
                  {when && <span className="block text-[10.5px] text-[#8E9493]">{when}</span>}
                  {event?.location && (
                    <span className="block text-[10.5px] text-[#8E9493]">{event.location}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <TrackingInner />
    </Suspense>
  );
}
