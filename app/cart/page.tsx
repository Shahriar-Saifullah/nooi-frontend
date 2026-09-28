"use client";

/**
 * Cart — screen 03
 * ----------------------------------------------------------------------------
 * Items grouped by vendor as separate shipments, with real shipping, tax and
 * promo figures from POST /cart/quote.
 *
 * The flow is worth understanding before changing it:
 *
 *   The local zustand cart is what the shopper edits — it's instant and works
 *   signed out. But checkout.service.ts prices from `cart_items` in the
 *   database, and every figure on this page must match what the card gets
 *   charged. So on load (and after any edit) the local cart is pushed to the
 *   server, then quoted. One source of truth for money, one for responsiveness.
 *
 *   That means every quantity tap costs a round trip. It's debounced, and the
 *   local numbers stay on screen while the quote refreshes, so the UI never
 *   blocks on the network — it just reconciles a moment later.
 *
 *   Signed out, there is no server cart and no quote. The page falls back to
 *   local subtotals and says shipping and tax are calculated at checkout,
 *   because without a session they genuinely cannot be known.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Box, Loader2, Truck, Bookmark, Trash2, Plus, Minus,
  AlertCircle, Tag, X, MapPin,
} from "lucide-react";

import ShopHeader from "@/components/marketplace/ShopHeader";
import { useLanguage } from "@/lib/i18n/useTranslations";
import { useCartStore, type CartItem } from "@/lib/store/cart.store";
import { useSavedStore } from "@/lib/store/saved.store";
import { pushLocalCart, quoteCart, type CartQuote } from "@/lib/api/cart";

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
    shipsFrom: (city: string) => `ships from ${city}`,
    each: "each",
    saveForLater: "Save for later",
    remove: "Remove",
    subtotalLabel: "Subtotal",
    freeShipping: "Free shipping",
    savedTitle: "Saved for later",
    moveToCart: "Move to cart",
    summary: "Order summary",
    items: (n: number) => `Items (${n})`,
    shipping: (n: number) => `Shipping · ${n} shipment${n === 1 ? "" : "s"}`,
    tax: "Estimated tax",
    atCheckout: "Calculated at checkout",
    taxUnconfigured: "Applied at checkout",
    total: "Total",
    addPromo: "Add a promo code",
    promoPlaceholder: "Promo code",
    apply: "Apply",
    removePromo: "Remove code",
    checkout: "Checkout",
    checkoutNote:
      "One payment covers every vendor. Each vendor ships separately and you track each shipment in Orders.",
    syncing: "Preparing checkout",
    quoteFailed: "We couldn't price your cart. Your items are safe — please try again.",
    signInToPrice: "Sign in to see shipping and tax.",
    outOfStock: "Out of stock",
    only: (n: number) => `Only ${n} left`,
  },
  ar: {
    title: "السلة",
    headline: (n: number, v: number) => `${n} منتج من ${v} مورد`,
    continueShopping: "متابعة التسوق",
    emptyTitle: "سلتك فارغة",
    emptyBody: "أضف قطعًا من المتجر، أو تسوّق كل ما وضعته في تصميمك دفعة واحدة.",
    browse: "تصفح المتجر",
    shipment: (n: number, total: number) => `شحنة ${n} من ${total}`,
    shipsFrom: (city: string) => `تُشحن من ${city}`,
    each: "للقطعة",
    saveForLater: "حفظ لاحقًا",
    remove: "إزالة",
    subtotalLabel: "المجموع الفرعي",
    freeShipping: "شحن مجاني",
    savedTitle: "محفوظ لاحقًا",
    moveToCart: "نقل إلى السلة",
    summary: "ملخص الطلب",
    items: (n: number) => `المنتجات (${n})`,
    shipping: (n: number) => `الشحن · ${n} شحنة`,
    tax: "الضريبة التقديرية",
    atCheckout: "يُحسب عند الدفع",
    taxUnconfigured: "تُطبّق عند الدفع",
    total: "الإجمالي",
    addPromo: "إضافة رمز خصم",
    promoPlaceholder: "رمز الخصم",
    apply: "تطبيق",
    removePromo: "إزالة الرمز",
    checkout: "إتمام الشراء",
    checkoutNote: "دفعة واحدة تغطي كل الموردين. يشحن كل مورد على حدة ويمكنك تتبع كل شحنة في الطلبات.",
    syncing: "جارٍ التحضير",
    quoteFailed: "تعذّر تسعير سلتك. منتجاتك محفوظة — حاول مرة أخرى.",
    signInToPrice: "سجّل الدخول لعرض الشحن والضريبة.",
    outOfStock: "نفدت الكمية",
    only: (n: number) => `بقي ${n} فقط`,
  },
} as const;

function localUnitPrice(item: CartItem): number {
  return Number(item.product_data?.price ?? (item as any).product_variants?.price ?? 0);
}

function CartInner() {
  const router = useRouter();
  const { language, isRtl } = useLanguage();
  const t = COPY[language === "ar" ? "ar" : "en"];

  const items = useCartStore(s => s.items);
  const totalItems = useCartStore(s => s.totalItems());
  const localSubtotal = useCartStore(s => s.subtotal());
  const groupedByRetailer = useCartStore(s => s.groupedByRetailer);
  const removeItemOptimistic = useCartStore(s => s.removeItemOptimistic);
  const updateQuantityOptimistic = useCartStore(s => s.updateQuantityOptimistic);
  const addItemOptimistic = useCartStore(s => s.addItemOptimistic);

  const saved = useSavedStore(s => s.items);
  const saveItem = useSavedStore(s => s.save);
  const unsaveItem = useSavedStore(s => s.remove);

  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [pricing, setPricing] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const [promoOpen, setPromoOpen] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toArabicDigits = useCallback(
    (s: string) => (isRtl ? s.replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[+d]) : s),
    [isRtl],
  );
  const money = useCallback(
    (v: number) => toArabicDigits(`$${v.toLocaleString("en-US", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`),
    [toArabicDigits],
  );
  const num = useCallback((v: number) => toArabicDigits(String(v)), [toArabicDigits]);

  /** Push local → server, then price it. Both or neither: a quote of a stale
   *  server cart is worse than no quote, because it looks authoritative. */
  const refreshQuote = useCallback(async (code: string | null) => {
    if (items.length === 0) { setQuote(null); return; }
    setPricing(true);
    setQuoteError(null);
    try {
      await pushLocalCart(items);
      const q = await quoteCart(code);
      setQuote(q);
      setSignedOut(false);
      if (q.promo_error) setAppliedCode(null);
    } catch (err: any) {
      if (String(err?.message).includes("NOT_AUTHENTICATED")) {
        setSignedOut(true);
        setQuote(null);
      } else {
        console.error("[cart] quote failed:", err);
        setQuoteError(t.quoteFailed);
      }
    } finally {
      setPricing(false);
    }
  }, [items, t.quoteFailed]);

  // Re-price on any cart change, debounced so a run of quantity taps is one
  // round trip rather than five.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { void refreshQuote(appliedCode); }, 400);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, appliedCode]);

  const applyPromo = useCallback(() => {
    const code = promoInput.trim();
    if (!code) return;
    setAppliedCode(code);
  }, [promoInput]);

  const clearPromo = useCallback(() => {
    setAppliedCode(null);
    setPromoInput("");
    setPromoOpen(false);
  }, []);

  const goCheckout = useCallback(async () => {
    setCheckingOut(true);
    try {
      await pushLocalCart(items);
      router.push(appliedCode ? `/checkout?promo=${encodeURIComponent(appliedCode)}` : "/checkout");
    } catch (err: any) {
      if (String(err?.message).includes("NOT_AUTHENTICATED")) {
        router.push("/authpage/signin?next=/cart");
        return;
      }
      console.error("[cart] checkout prep failed:", err);
      setQuoteError(t.quoteFailed);
      setCheckingOut(false);
    }
  }, [items, appliedCode, router, t.quoteFailed]);

  /** Server groups when priced, local groups otherwise — so a signed-out cart
   *  still renders rather than showing nothing. */
  const displayGroups = useMemo(() => {
    if (quote?.groups.length) {
      return quote.groups.map(g => ({
        key: g.retailer_id,
        vendor: g.retailer_name,
        city: g.city,
        lead: g.lead_time_days,
        subtotal: g.subtotal,
        shipping: g.shipping_amount,
        items: g.items.map(i => ({
          id: i.cart_item_id,
          variantId: i.variant_id,
          title: i.title,
          color: i.color,
          image: i.image,
          unit: i.unit_price,
          quantity: i.quantity,
          lineTotal: i.line_total,
          inStock: i.in_stock,
          stock: i.stock_quantity,
        })),
      }));
    }
    const local = groupedByRetailer() as Record<string, CartItem[]>;
    return Object.entries(local).map(([vendor, list]) => ({
      key: vendor,
      vendor,
      city: null as string | null,
      lead: 0,
      subtotal: list.reduce((s, i) => s + localUnitPrice(i) * i.quantity, 0),
      shipping: null as number | null,
      items: list.map(i => ({
        id: i.id,
        variantId: i.variant_id,
        title: i.product_data?.title ?? "Item",
        color: i.product_data?.color ?? null,
        image: i.product_data?.image ?? null,
        unit: localUnitPrice(i),
        quantity: i.quantity,
        lineTotal: localUnitPrice(i) * i.quantity,
        inStock: true,
        stock: 99,
      })),
    }));
  }, [quote, groupedByRetailer, items]);

  const localItemById = useCallback(
    (variantId: string) => items.find(i => i.variant_id === variantId),
    [items],
  );

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

  const shownSubtotal = quote?.subtotal ?? localSubtotal;
  const shownTotal = quote?.grand_total ?? localSubtotal;

  return (
    <div className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <ShopHeader />

      <main className="max-w-[1180px] mx-auto px-5 pt-[120px] pb-20">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[27px] text-[#101212]">{t.title}</h1>
            <span className="text-[12.5px] text-[#646968]">
              {t.headline(quote?.item_count ?? totalItems, displayGroups.length)}
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
          {/* ── Shipments ───────────────────────────────────────────────── */}
          <div className="space-y-4">
            {displayGroups.map((group, gi) => (
              <section key={group.key} className="rounded-2xl border border-[#E6EBEA] overflow-hidden">
                <header className="flex items-center justify-between gap-3 px-4 py-3 bg-[#FBFCFC] border-b border-[#E6EBEA] flex-wrap">
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-[#101212] truncate">
                      {group.vendor}
                    </span>
                    {group.city && (
                      <span className="flex items-center gap-1 text-[11px] text-[#8E9493]">
                        <MapPin size={10} />
                        {t.shipsFrom(group.city)}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11.5px] text-[#646968] shrink-0">
                    <Truck size={12} />
                    {t.shipment(gi + 1, displayGroups.length)}
                    {group.lead > 0 && ` · ${num(group.lead)} days`}
                  </span>
                </header>

                <div className="divide-y divide-[#F1F4F4]">
                  {group.items.map(item => {
                    const local = localItemById(item.variantId);
                    const localId = local?.id ?? item.id;

                    return (
                      <div key={item.variantId} className="flex gap-3.5 p-4">
                        <button
                          onClick={() => router.push(`/marketplace/${(item as any).productId ?? ""}`)}
                          disabled
                          className="shrink-0 w-[76px] h-[76px] rounded-xl overflow-hidden bg-[#F1F4F4] border border-[#E6EBEA] flex items-center justify-center"
                        >
                          {item.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Box size={20} className="text-[#B3B9B9]" strokeWidth={1.25} />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-[13px] font-medium text-[#101212] truncate">
                              {item.title}
                            </span>
                            <span className="shrink-0 text-[13px] font-semibold text-[#004643]">
                              {money(item.lineTotal)}
                            </span>
                          </div>

                          <span className="block mt-0.5 text-[11.5px] text-[#8E9493]">
                            {item.color ? `${item.color} · ` : ""}
                            {money(item.unit)} {t.each}
                          </span>

                          {!item.inStock ? (
                            <span className="mt-1 inline-block text-[11px] text-[#812F28]">
                              {t.outOfStock}
                            </span>
                          ) : item.stock <= 5 ? (
                            <span className="mt-1 inline-block text-[11px] text-[#812F28]">
                              {t.only(item.stock)}
                            </span>
                          ) : null}

                          <div className="mt-2.5 flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1 px-1 py-0.5 rounded-full border border-[#D5DBDA] bg-[#F1F4F4]">
                              <button
                                onClick={() =>
                                  item.quantity <= 1
                                    ? removeItemOptimistic(localId)
                                    : updateQuantityOptimistic(localId, item.quantity - 1)
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
                                onClick={() => updateQuantityOptimistic(localId, item.quantity + 1)}
                                disabled={item.quantity >= item.stock}
                                aria-label="Increase quantity"
                                className="w-6 h-6 flex items-center justify-center rounded-full text-[#004643] hover:bg-white disabled:opacity-30"
                              >
                                <Plus size={12} />
                              </button>
                            </div>

                            <button
                              onClick={() => { if (local) { saveItem(local); removeItemOptimistic(local.id); } }}
                              className="flex items-center gap-1 text-[11.5px] text-[#646968] hover:text-[#004643]"
                            >
                              <Bookmark size={12} />
                              {t.saveForLater}
                            </button>

                            <button
                              onClick={() => removeItemOptimistic(localId)}
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

                <footer className="flex items-center justify-between gap-2 px-4 py-2.5 bg-[#FBFCFC] border-t border-[#E6EBEA]">
                  <span className="text-[11.5px] text-[#8E9493]">
                    {group.shipping === 0 ? t.freeShipping : group.shipping != null ? `+ ${money(group.shipping)} shipping` : ""}
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="text-[12px] text-[#646968]">{t.subtotalLabel}</span>
                    <strong className="text-[13px] text-[#101212]">{money(group.subtotal)}</strong>
                  </span>
                </footer>
              </section>
            ))}

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
                          {money(localUnitPrice(s))}
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
            <span className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-[#101212]">{t.summary}</span>
              {pricing && <Loader2 size={13} className="animate-spin text-[#8E9493]" />}
            </span>

            <div className="mt-4 space-y-2 text-[12.5px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[#646968]">{t.items(quote?.item_count ?? totalItems)}</span>
                <span className="text-[#101212]">{money(shownSubtotal)}</span>
              </div>

              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[#646968]">{t.shipping(displayGroups.length)}</span>
                {quote ? (
                  <span className="text-[#101212]">
                    {quote.shipping_total === 0 ? t.freeShipping : money(quote.shipping_total)}
                  </span>
                ) : (
                  <span className="text-[#8E9493] text-[11.5px]">{t.atCheckout}</span>
                )}
              </div>

              {quote?.promotion && (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-[#28603A]">
                    <Tag size={11} />
                    {quote.promotion.code}
                    <button onClick={clearPromo} aria-label={t.removePromo} className="text-[#8E9493] hover:text-[#812F28]">
                      <X size={10} />
                    </button>
                  </span>
                  <span className="text-[#28603A]">−{money(quote.promotion.discount_amount)}</span>
                </div>
              )}

              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[#646968]">{t.tax}</span>
                {quote ? (
                  <span className={quote.tax_provider === "unconfigured" ? "text-[#8E9493] text-[11.5px]" : "text-[#101212]"}>
                    {quote.tax_provider === "unconfigured" ? t.taxUnconfigured : money(quote.tax_total)}
                  </span>
                ) : (
                  <span className="text-[#8E9493] text-[11.5px]">{t.atCheckout}</span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E6EBEA] flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium text-[#101212]">{t.total}</span>
              <span className="text-[18px] font-semibold text-[#004643]">{money(shownTotal)}</span>
            </div>

            {/* Promo */}
            {!quote?.promotion && (
              <div className="mt-3">
                {!promoOpen ? (
                  <button
                    onClick={() => setPromoOpen(true)}
                    className="flex items-center gap-1.5 text-[12px] text-[#004643] hover:underline"
                  >
                    <Tag size={12} />
                    {t.addPromo}
                  </button>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        value={promoInput}
                        onChange={e => setPromoInput(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === "Enter" && applyPromo()}
                        placeholder={t.promoPlaceholder}
                        aria-label={t.promoPlaceholder}
                        className="flex-1 min-w-0 px-3 py-1.5 rounded-full border border-[#D5DBDA] bg-white text-[12px] text-[#101212] placeholder:text-[#B3B9B9] focus:outline-none focus:border-[#87DDD7]"
                      />
                      <button
                        onClick={applyPromo}
                        disabled={!promoInput.trim() || pricing}
                        className="shrink-0 px-3.5 py-1.5 rounded-full border border-[#D5DBDA] bg-white text-[12px] font-medium text-[#004643] hover:bg-[#F1F4F4] disabled:opacity-40"
                      >
                        {t.apply}
                      </button>
                    </div>
                    {quote?.promo_error && (
                      <p className="mt-1.5 text-[11px] text-[#812F28]">{quote.promo_error}</p>
                    )}
                  </>
                )}
              </div>
            )}

            {signedOut && (
              <p className="mt-3 text-[11.5px] text-[#8E9493]">{t.signInToPrice}</p>
            )}

            {quoteError && (
              <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-[#FFFAF9] border border-[#812F28]/25 text-[11.5px] text-[#812F28]">
                <AlertCircle size={13} className="mt-px shrink-0" />
                {quoteError}
              </div>
            )}

            <button
              onClick={goCheckout}
              disabled={checkingOut}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#004643] text-white text-[13px] font-medium hover:bg-[#003836] disabled:opacity-50"
            >
              {checkingOut && <Loader2 size={14} className="animate-spin" />}
              {checkingOut ? t.syncing : t.checkout}
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