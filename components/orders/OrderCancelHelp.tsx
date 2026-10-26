"use client";

/**
 * Under a customer's order: "Get help" (opens a support ticket about this
 * order) and, while nothing has shipped yet, "Cancel order" — a request that
 * Nooi approves, refunding the payment in full.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { LifeBuoy, XCircle, Loader2, Clock, Check } from "lucide-react";
import { getOrderCancellation, requestOrderCancellation, type CancellationRequest } from "@/lib/api/orders";
import { useLanguage } from "@/lib/i18n/useTranslations";

const COPY = {
  en: {
    help: "Get help with this order",
    cancel: "Cancel order",
    cancelTitle: "Cancel this order?",
    cancelBody: "Tell us why. Nooi reviews cancellations quickly and refunds the full amount to your card.",
    reasonPh: "e.g. Ordered the wrong size",
    send: "Request cancellation",
    keep: "Keep order",
    pending: "Cancellation requested — we'll confirm shortly.",
    approved: (amt: string) => `Cancelled. ${amt} refunded.`,
    declined: (note: string) => `Cancellation declined: ${note}`,
    failed: "Could not send that request.",
  },
  ar: {
    help: "احصل على مساعدة بخصوص هذا الطلب",
    cancel: "إلغاء الطلب",
    cancelTitle: "إلغاء هذا الطلب؟",
    cancelBody: "أخبرنا بالسبب. تراجع نوي طلبات الإلغاء بسرعة وتعيد المبلغ كاملاً إلى بطاقتك.",
    reasonPh: "مثال: طلبت مقاسًا خاطئًا",
    send: "طلب الإلغاء",
    keep: "الاحتفاظ بالطلب",
    pending: "تم طلب الإلغاء — سنؤكد قريبًا.",
    approved: (amt: string) => `تم الإلغاء. تم استرداد ${amt}.`,
    declined: (note: string) => `تم رفض الإلغاء: ${note}`,
    failed: "تعذّر إرسال الطلب.",
  },
};

const NOT_DISPATCHED = ["label_pending", "label_created"];

export default function OrderCancelHelp({
  order,
  money,
}: {
  order: { id: string; status: string; order_shipments?: { shipment_status: string }[] | null };
  money: (v: number) => string;
}) {
  const { language } = useLanguage();
  const t = COPY[language === "ar" ? "ar" : "en"];
  const [req, setReq] = useState<CancellationRequest | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getOrderCancellation(order.id).then(r => { if (alive && r.success) setReq(r.data.request); });
    return () => { alive = false; };
  }, [order.id]);

  const ships = order.order_shipments || [];
  const eligible = ["paid", "processing"].includes(order.status)
    && ships.every(s => NOT_DISPATCHED.includes(s.shipment_status))
    && (!req || req.status === "declined");

  const send = async () => {
    setBusy(true); setError(null);
    const r = await requestOrderCancellation(order.id, reason.trim());
    setBusy(false);
    if (r.success) { setReq(r.data.request); setOpen(false); setReason(""); }
    else setError(typeof r.error === "string" ? r.error : t.failed);
  };

  return (
    <section className="mt-6 rounded-2xl border border-[#E6EBEA] p-5">
      {req && (req.status === "requested" || req.status === "processing") && (
        <p className="mb-3 flex items-center gap-2 text-[13px] text-[#8A5A00]"><Clock className="h-4 w-4" /> {t.pending}</p>
      )}
      {req?.status === "approved" && (
        <p className="mb-3 flex items-center gap-2 text-[13px] text-[#28603A]"><Check className="h-4 w-4" /> {t.approved(money(Number(req.refund_amount || 0)))}</p>
      )}
      {req?.status === "declined" && req.decision_note && (
        <p className="mb-3 text-[13px] text-[#812F28]">{t.declined(req.decision_note)}</p>
      )}

      {!open ? (
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/support?order=${order.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D5DBDA] px-4 py-2 text-[12.5px] font-medium text-[#004643] hover:bg-[#F1F4F4]">
            <LifeBuoy className="h-3.5 w-3.5" /> {t.help}
          </Link>
          {eligible && (
            <button onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#812F28]/30 px-4 py-2 text-[12.5px] font-medium text-[#812F28] hover:bg-[#FFFAF9]">
              <XCircle className="h-3.5 w-3.5" /> {t.cancel}
            </button>
          )}
        </div>
      ) : (
        <div>
          <h3 className="text-[15px] font-medium text-[#101212]">{t.cancelTitle}</h3>
          <p className="mt-1 text-[12.5px] text-[#646968]">{t.cancelBody}</p>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder={t.reasonPh}
            className="mt-3 w-full rounded-xl border border-[#D5DBDA] p-3 text-[13px] focus:outline-none" />
          {error && <p className="mt-2 text-[12.5px] text-[#812F28]">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button disabled={busy || reason.trim().length < 3} onClick={send}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#812F28] px-4 py-2 text-[12.5px] font-medium text-white disabled:opacity-50">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {t.send}
            </button>
            <button onClick={() => setOpen(false)} className="px-3 text-[12.5px] text-[#646968]">{t.keep}</button>
          </div>
        </div>
      )}
    </section>
  );
}
