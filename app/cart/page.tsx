"use client";

/**
 * Cart — screen 03
 * ----------------------------------------------------------------------------
 * Items grouped by vendor, each group presented as a separate shipment, with an
 * order summary and the route into checkout.
 *
 * Three things the design shows that are not here, each because the data does
 * not exist:
 *
 *   Promo codes. There is no discounts table, no endpoint, and no rules. A
 *   promo box that rejects every code is worse than no promo box.
 *
 *   Shipping and tax figures. shipping.service.ts computes a real quote at
 *   checkout from each retailer's policy, and the tax provider is still an open
 *   decision. Inventing numbers here that the payment step then contradicts is
 *   the one thing a cart must never do, so both read "Calculated at checkout".
 *
 *   "Ships from {city}". `retailers` has no city column.
 *
 * The important behaviour is the checkout handoff. The cart lives in
 * localStorage, but checkout.service.ts reads `cart_items` from the database —
 * so the local cart is pushed to the server first. Without that a shopper with
 * a full cart reaches payment and is told their cart is empty.
 */

import React, { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Box, Loader2, Truck, Bookmark, Trash2, Plus, Minus, AlertCircle,
} from "lucide-react";

import ShopHeader from "@/components/marketplace/ShopHeader";
import { useLanguage } from "@/lib/i18n/useTranslations";
import { useCartStore, type CartItem } from "@/lib/store/cart.store";
import { useSavedStore } from "@/lib/store/saved.store";
import { pushLocalCart } from "@/lib/api/cart";

const COPY = {
  en: {
    title: "Cart",
    headline: (n: number, v: number) =>
      `${n} item${n === 1 ? "" : "s"} from ${v} vendor${v === 1 ? "" : "s"}`,
    continueShopping: "Continue shopping",
    emptyTitle: "Your cart is empty",
    emptyBody: "Add pieces from the marketplace, or shop everything placed in your design at once.",
    browse: "Browse marketplace",
    shipment: (n: number, total: number) => `Shipment ${n} of ${total}`,
    each: "each",
    saveForLater: "Save for later",
    remove: "Remove",
    subtotalLabel: "Subtotal",
    savedTitle: "Saved for later",
    moveToCart: "Move to cart",
    summary: "Order summary",
    items: (n: number) => `Items (${n})`,
    shipping: "Shipping",
    tax: "Estimated tax",
    atCheckout: "Calculated at checkout",
    total: "Subtotal",
    checkout: "Checkout",
    checkoutNote:
      "One payment covers every vendor. Each vendor ships separately and you track each shipment in Orders.",
    signInFirst: "Sign in to check out",
    syncing: "Preparing checkout",
    syncFailed: "We couldn't prepare your cart for checkout. Please try again.",
  },
  ar: {
    title: "السلة",
    headline: (n: number, v: number) => `${n} منتج من ${v} مورد`,
    continueShopping: "متابعة التسوق",
    emptyTitle: "سلتك فارغة",
    emptyBody: "أضف قطعًا من المتجر، أو تسوّق كل ما وضعته في تصميمك دفعة واحدة.",
    browse: "تصفح المتجر",
    shipment: (n: number, total: number) => `شحنة ${n} من ${total}`,
    each: "للقطعة",
    saveForLater: "حفظ لاحقًا",
    remove: "إزالة",
    subtotalLabel: "المجموع الفرعي",
    savedTitle: "محفوظ لاحقًا",
    moveToCart: "نقل إلى السلة",
    summary: "ملخص الطلب",
    items: (n: number) => `المنتجات (${n})`,
    shipping: "الشحن",
    tax: "الضريبة التقديرية",
    atCheckout: "يُحسب عند الدفع",
    total: "المجموع الفرعي",
    checkout: "إتمام الشراء",
    checkoutNote: "دفعة واحدة تغطي كل الموردين. يشحن كل مورد على حدة ويمكنك تتبع كل شحنة في الطلبات.",
    signInFirst: "سجّل الدخول لإتمام الشراء",
    syncing: "جارٍ التحضير",
    syncFailed: "تعذّر تجهيز سلتك للدفع. حاول مرة أخرى.",
  },
} as const;

function unitPrice(item: CartItem): number {
  return Number(
    item.product_data?.price ??
    (item as any).product_variants?.price ??
    0,
  );
}

function CartInner() {
  const router = useRouter();
  const { language, isRtl } = useLanguage();
  const t = COPY[language === "ar" ? "ar" : "en"];

  const items = useCartStore(s => s.items);
  const totalItems = useCartStore(s => s.totalItems());
  const subtotal = useCartStore(s => s.subtotal());
  const groupedByRetailer = useCartStore(s => s.groupedByRetailer);
  const removeItemOptimistic = useCartStore(s => s.removeItemOptimistic);
  const updateQuantityOptimistic = useCartStore(s => s.updateQuantityOptimistic);
  const addItemOptimistic = useCartStore(s => s.addItemOptimistic);

  const saved = useSavedStore(s => s.items);
  const saveItem = useSavedStore(s => s.save);
  const unsaveItem = useSavedStore(s => s.remove);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toArabicDigits = useCallback(
    (s: string) => (isRtl ? s.replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[+d]) : s),
    [isRtl],
  );
  const money = useCallback(
    (v: number) => toArabicDigits(`$${Math.round(v).toLocaleString("en-US")}`),
    [toArabicDigits],
  );
  const num = useCallback((v: number) => toArabicDigits(String(v)), [toArabicDigits]);

  const groups = useMemo(() => Object.entries(groupedByRetailer()), [groupedByRetailer, items]);

  const goCheckout = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      // checkout.service.ts prices from cart_items in the database, so the
      // server has to match before we navigate.
      await pushLocalCart(items);
      router.push("/checkout");
    } catch (err: any) {
      if (String(err?.message).includes("NOT_AUTHENTICATED")) {
        router.push("/authpage/signin?next=/cart");
        return;
      }
      console.error("[cart] checkout prep failed:", err);
      setError(t.syncFailed);
      setBusy(false);
    }
  }, [items, router, t.syncFailed]);

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
        <ShopHeader />
        <main className="max-w-[1180px] mx-auto px-5 pt-[120px] pb-20">
          <h1 className="text-[27px] text-[#101212]">{t.title}</h1>
          <div className="mt-10 py-16 text-center border border-[#E6EBEA] rounded-2xl bg-[#FBFCFC]">
            <div className="text-[16px] font-medium text-[#101212]">{t.emptyTitle}</div>
            <p className="mt-2 max-w-[420px] mx-auto text-[13px] text-[#646968]">{t.emptyBody}</p>
            <button
              onClick={() => router.push("/marketplace")}
              className="mt-5 px-4 py-2 rounded-full bg-[#004643] text-white text-[12.5px] font-medium hover:bg-[#003836]"
            >
              {t.browse}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <ShopHeader />

      <main className="max-w-[1180px] mx-auto px-5 pt-[120px] pb-20">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[27px] text-[#101212]">{t.title}</h1>
            <span className="text-[12.5px] text-[#646968]">
              {t.headline(totalItems, groups.length)}
            </span>
          </div>
          <button
            onClick={() => router.push("/marketplace")}
            className="flex items-center gap-1.5 text-[12.5px] text-[#004643] hover:underline"
          >
            <ArrowLeft size={13} className={isRtl ? "rotate-180" : ""} />
            {t.continueShopping}
          </button>
        </div>

        <div className="mt-7 grid lg:grid-cols-[1fr_340px] gap-7 items-start">
          {/* ── Groups ──────────────────────────────────────────────────── */}
          <div className="space-y-4">
            {groups.map(([vendor, groupItems], gi) => {
              const groupSubtotal = groupItems.reduce(
                (sum, i) => sum + unitPrice(i) * i.quantity, 0,
              );

              return (
                <section key={vendor} className="rounded-2xl border border-[#E6EBEA] overflow-hidden">
                  <header className="flex items-center justify-between gap-3 px-4 py-3 bg-[#FBFCFC] border-b border-[#E6EBEA]">
                    <span className="text-[13px] font-medium text-[#101212]">{vendor}</span>
                    <span className="flex items-center gap-1.5 text-[11.5px] text-[#646968]">
                      <Truck size={12} />
                      {t.shipment(gi + 1, groups.length)}
                    </span>
                  </header>

                  <div className="divide-y divide-[#F1F4F4]">
                    {groupItems.map(item => {
                      const unit = unitPrice(item);
                      const image = item.product_data?.image;

                      return (
                        <div key={item.id} className="flex gap-3.5 p-4">
                          <span className="shrink-0 w-[76px] h-[76px] rounded-xl overflow-hidden bg-[#F1F4F4] border border-[#E6EBEA] flex items-center justify-center">
                            {image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Box size={20} className="text-[#B3B9B9]" strokeWidth={1.25} />
                            )}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-[13px] font-medium text-[#101212] truncate">
                                {item.product_data?.title ?? "Item"}
                              </span>
                              <span className="shrink-0 text-[13px] font-semibold text-[#004643]">
                                {money(unit * item.quantity)}
                              </span>
                            </div>

                            <span className="block mt-0.5 text-[11.5px] text-[#8E9493]">
                              {item.product_data?.color ? `${item.product_data.color} · ` : ""}
                              {money(unit)} {t.each}
                            </span>

                            <div className="mt-2.5 flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-1 px-1 py-0.5 rounded-full border border-[#D5DBDA] bg-[#F1F4F4]">
                                <button
                                  onClick={() =>
                                    item.quantity <= 1
                                      ? removeItemOptimistic(item.id)
                                      : updateQuantityOptimistic(item.id, item.quantity - 1)
                                  }
                                  aria-label="Decrease quantity"
                                  className="w-6 h-6 flex items-center justify-center rounded-full text-[#004643] hover:bg-white"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-7 text-center text-[12px] font-medium text-[#101212]">
                                  {num(item.quantity)}
                                </span>
                                <button
                                  onClick={() => updateQuantityOptimistic(item.id, item.quantity + 1)}
                                  aria-label="Increase quantity"
                                  className="w-6 h-6 flex items-center justify-center rounded-full text-[#004643] hover:bg-white"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>

                              <button
                                onClick={() => { saveItem(item); removeItemOptimistic(item.id); }}
                                className="flex items-center gap-1 text-[11.5px] text-[#646968] hover:text-[#004643]"
                              >
                                <Bookmark size={12} />
                                {t.saveForLater}
                              </button>

                              <button
                                onClick={() => removeItemOptimistic(item.id)}
                                className="flex items-center gap-1 text-[11.5px] text-[#812F28] hover:underline"
                              >
                                <Trash2 size={12} />
                                {t.remove}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <footer className="flex items-center justify-end gap-2 px-4 py-2.5 bg-[#FBFCFC] border-t border-[#E6EBEA]">
                    <span className="text-[12px] text-[#646968]">{t.subtotalLabel}</span>
                    <strong className="text-[13px] text-[#101212]">{money(groupSubtotal)}</strong>
                  </footer>
                </section>
              );
            })}

            {/* Saved for later */}
            {saved.length > 0 && (
              <section className="rounded-2xl border border-[#E6EBEA] p-4">
                <span className="text-[13px] font-medium text-[#101212]">{t.savedTitle}</span>
                <div className="mt-3 divide-y divide-[#F1F4F4]">
                  {saved.map(s => (
                    <div key={s.variant_id} className="flex items-center gap-3 py-2.5">
                      <span className="shrink-0 w-11 h-11 rounded-lg overflow-hidden bg-[#F1F4F4] border border-[#E6EBEA] flex items-center justify-center">
                        {s.product_data?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.product_data.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Box size={16} className="text-[#B3B9B9]" strokeWidth={1.25} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] text-[#101212] truncate">
                          {s.product_data?.title}
                        </span>
                        <span className="block text-[11px] text-[#8E9493]">
                          {s.product_data?.color ? `${s.product_data.color} · ` : ""}
                          {money(unitPrice(s))}
                        </span>
                      </span>
                      <button
                        onClick={() => { addItemOptimistic(s); unsaveItem(s.variant_id); }}
                        className="shrink-0 px-3 py-1.5 rounded-full border border-[#D5DBDA] text-[11.5px] text-[#004643] hover:bg-[#F1F4F4]"
                      >
                        {t.moveToCart}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Summary ─────────────────────────────────────────────────── */}
          <aside className="lg:sticky lg:top-[120px] rounded-2xl border border-[#E6EBEA] bg-[#FBFCFC] p-5">
            <span className="text-[13px] font-medium text-[#101212]">{t.summary}</span>

            <div className="mt-4 space-y-2 text-[12.5px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[#646968]">{t.items(totalItems)}</span>
                <span className="text-[#101212]">{money(subtotal)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[#646968]">{t.shipping}</span>
                <span className="text-[#8E9493] text-[11.5px]">{t.atCheckout}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[#646968]">{t.tax}</span>
                <span className="text-[#8E9493] text-[11.5px]">{t.atCheckout}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E6EBEA] flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium text-[#101212]">{t.total}</span>
              <span className="text-[18px] font-semibold text-[#004643]">{money(subtotal)}</span>
            </div>

            {error && (
              <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-[#FFFAF9] border border-[#812F28]/25 text-[11.5px] text-[#812F28]">
                <AlertCircle size={13} className="mt-px shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={goCheckout}
              disabled={busy}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#004643] text-white text-[13px] font-medium hover:bg-[#003836] disabled:opacity-50"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              {busy ? t.syncing : t.checkout}
            </button>

            <p className="mt-3 text-[11px] leading-snug text-[#8E9493]">{t.checkoutNote}</p>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <CartInner />
    </Suspense>
  );
}