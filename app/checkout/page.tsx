"use client";

/**
 * Checkout — screen 04
 * ----------------------------------------------------------------------------
 * Two steps: shipping address, then Stripe Elements. All of the payment logic
 * below is unchanged from the original — confirmPayment, the return_url, the
 * error branches. What changed is the money.
 *
 * The promo code arrives as ?promo= from the cart and is passed to
 * createPaymentIntent as a CODE, never an amount. The server re-derives the
 * discount from a subtotal it calculates itself, so the figure on this page and
 * the figure charged to the card come from the same place.
 *
 * The case worth caring about: a code can expire between the cart and here. The
 * server then returns discount_amount 0 and the shopper must be told, loudly,
 * before they pay — silently showing the cart's discount while charging full
 * price is the exact failure this whole path exists to prevent.
 *
 * Deliberately no cart, search or nav in the header. Once someone is paying,
 * every link out is a chance to lose the order; the design has a separate
 * checkout header for the same reason.
 */

import React, { Suspense, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  ShieldCheck, Truck, Lock, ArrowLeft, ShoppingBag, CreditCard,
  ChevronRight, AlertCircle, Loader2, Tag, Info,
} from "lucide-react";

import { getStripe } from "@/lib/stripe";
import { useCartStore } from "@/lib/store/cart.store";
import { useLanguage } from "@/lib/i18n/useTranslations";
import {
  createPaymentIntent,
  ShippingAddress,
  CheckoutSummary,
} from "@/lib/api/checkout";

const COPY = {
  en: {
    back: "Back to shopping",
    secure: "Guaranteed safe and secure checkout",
    stepShipping: "Shipping details",
    stepPayment: "Payment",
    destination: "Shipping destination",
    fullName: "Full name",
    street: "Street address",
    city: "City",
    state: "State / Province",
    postal: "Postal code",
    country: "Country",
    proceed: "Proceed to payment",
    verifying: "Verifying stock and calculating totals",
    requiredFields: "Please fill in all required shipping fields.",
    initFailed: "Failed to initialize checkout. Please check your cart items or stock.",
    networkError: "Network error. Please try again.",
    paymentMethod: "Payment method",
    encrypted: "256-bit SSL encrypted",
    payFailed: "Payment verification failed",
    unexpected: "An unexpected error occurred. Please try again.",
    authorizing: "Authorizing payment",
    pay: (amount: string) => `Pay ${amount}`,
    terms: "By clicking Pay, you agree to Nooi's Terms of Service and Privacy Policy.",
    emptyTitle: "Your cart is empty",
    emptyBody: "You don't have any items ready for checkout. Explore the marketplace to find something.",
    returnToShop: "Return to marketplace",
    summary: (n: number) => `Order summary (${n} item${n === 1 ? "" : "s"})`,
    freeShipping: "Free",
    subtotal: "Subtotal",
    shipping: "Shipping",
    tax: "Estimated tax",
    total: "Total",
    atPayment: "Calculated at payment",
    qty: "Qty",
    promoDropped: (code: string) =>
      `The code ${code} could not be applied to this order — it may have expired or reached its limit. The total below is what you'll be charged.`,
  },
  ar: {
    back: "العودة إلى التسوق",
    secure: "دفع آمن ومضمون",
    stepShipping: "تفاصيل الشحن",
    stepPayment: "الدفع",
    destination: "عنوان الشحن",
    fullName: "الاسم الكامل",
    street: "عنوان الشارع",
    city: "المدينة",
    state: "المنطقة",
    postal: "الرمز البريدي",
    country: "الدولة",
    proceed: "المتابعة إلى الدفع",
    verifying: "جارٍ التحقق من المخزون وحساب الإجمالي",
    requiredFields: "يرجى تعبئة جميع حقول الشحن المطلوبة.",
    initFailed: "تعذّر بدء عملية الدفع. تحقق من منتجات سلتك أو توفّرها.",
    networkError: "خطأ في الشبكة. حاول مرة أخرى.",
    paymentMethod: "طريقة الدفع",
    encrypted: "تشفير 256-bit SSL",
    payFailed: "فشل التحقق من الدفع",
    unexpected: "حدث خطأ غير متوقع. حاول مرة أخرى.",
    authorizing: "جارٍ تفويض الدفع",
    pay: (amount: string) => `ادفع ${amount}`,
    terms: "بالنقر على ادفع، فإنك توافق على شروط الخدمة وسياسة الخصوصية.",
    emptyTitle: "سلتك فارغة",
    emptyBody: "لا توجد منتجات جاهزة للدفع. تصفح المتجر للعثور على ما يناسبك.",
    returnToShop: "العودة إلى المتجر",
    summary: (n: number) => `ملخص الطلب (${n} منتج)`,
    freeShipping: "مجاني",
    subtotal: "المجموع الفرعي",
    shipping: "الشحن",
    tax: "الضريبة التقديرية",
    total: "الإجمالي",
    atPayment: "يُحسب عند الدفع",
    qty: "الكمية",
    promoDropped: (code: string) =>
      `تعذّر تطبيق الرمز ${code} على هذا الطلب — ربما انتهت صلاحيته أو بلغ حدّه. الإجمالي أدناه هو المبلغ الذي سيُخصم.`,
  },
};

/** Shared by the page and its child components. Not `as const` — literal types
 *  would make the Arabic block unassignable wherever the English one is typed. */
type Copy = typeof COPY["en"];

// ─── Payment step ────────────────────────────────────────────────────────────

function CheckoutPaymentForm({
  summary,
  money,
  t,
}: {
  summary: CheckoutSummary;
  money: (v: number) => string;
  t: Copy;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || isProcessing) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
    });

    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setErrorMessage(error.message || t.payFailed);
      } else {
        setErrorMessage(t.unexpected);
      }
      setIsProcessing(false);
    }
    // On success Stripe redirects to return_url.
  };

  return (
    <form onSubmit={handlePay} className="space-y-6">
      <div className="rounded-2xl border border-[#E6EBEA] bg-white p-6">
        <div className="mb-4 flex items-center justify-between border-b border-[#F1F4F4] pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[#004643]" />
            <h3 className="text-[14px] font-medium text-[#101212]">{t.paymentMethod}</h3>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#8E9493]">
            <Lock className="h-3 w-3 text-[#28603A]" />
            <span>{t.encrypted}</span>
          </div>
        </div>

        <PaymentElement options={{ layout: "tabs" }} />

        {errorMessage && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#812F28]/25 bg-[#FFFAF9] p-3.5 text-[12.5px] text-[#812F28]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#004643] py-3.5 text-[14px] font-medium text-white transition-colors hover:bg-[#003836] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t.authorizing}</span>
          </>
        ) : (
          <>
            <Lock className="h-3.5 w-3.5" />
            <span>{t.pay(money(summary.grand_total))}</span>
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-[#8E9493]">{t.terms}</p>
    </form>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const promoCode = params.get("promo");

  const { language, isRtl } = useLanguage();
  const t = COPY[language === "ar" ? "ar" : "en"];

  const { items, totalItems, subtotal } = useCartStore();

  const [address, setAddress] = useState<ShippingAddress>({
    fullName: "", street: "", city: "", state: "", zipCode: "", country: "US",
  });

  const [isLoadingIntent, setIsLoadingIntent] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutSummary, setCheckoutSummary] = useState<CheckoutSummary | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [step, setStep] = useState<"shipping" | "payment">("shipping");

  const stripePromise = getStripe();

  const toArabicDigits = useCallback(
    (s: string) => (isRtl ? s.replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[+d]) : s),
    [isRtl],
  );
  const money = useCallback(
    (v: number) =>
      toArabicDigits(
        `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ),
    [toArabicDigits],
  );
  const num = useCallback((v: number) => toArabicDigits(String(v)), [toArabicDigits]);

  /** A code was carried from the cart but the server declined it. The shopper
   *  must see this before paying, not after. */
  const promoDropped = useMemo(
    () => Boolean(promoCode && checkoutSummary && !checkoutSummary.promotion_code),
    [promoCode, checkoutSummary],
  );

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (
      !address.fullName.trim() || !address.street.trim() || !address.city.trim() ||
      !address.state.trim() || !address.zipCode.trim()
    ) {
      setGeneralError(t.requiredFields);
      return;
    }

    setIsLoadingIntent(true);

    try {
      // The code only. The server derives the amount.
      const response = await createPaymentIntent(address, promoCode);

      if (!response.success) {
        setGeneralError(
          typeof response.error === "string" ? response.error : t.initFailed,
        );
        setIsLoadingIntent(false);
        return;
      }

      const { client_secret, summary } = response.data;
      setClientSecret(client_secret);
      setCheckoutSummary(summary);
      setStep("payment");
    } catch (err: any) {
      setGeneralError(err.message || t.networkError);
    } finally {
      setIsLoadingIntent(false);
    }
  };

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (items.length === 0 && !clientSecret) {
    return (
      <div className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
        <CheckoutHeader t={t} isRtl={isRtl} />
        <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#F1F4F4] text-[#B3B9B9]">
            <ShoppingBag className="h-9 w-9 stroke-[1.25]" />
          </div>
          <h2 className="text-[20px] font-medium text-[#101212]">{t.emptyTitle}</h2>
          <p className="mt-2 text-[13px] text-[#646968]">{t.emptyBody}</p>
          <Link
            href="/marketplace"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#004643] px-5 py-2.5 text-[12.5px] font-medium text-white transition hover:bg-[#003836]"
          >
            <ArrowLeft className={`h-3.5 w-3.5 ${isRtl ? "rotate-180" : ""}`} />
            <span>{t.returnToShop}</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <CheckoutHeader t={t} isRtl={isRtl} />

      <div className="mx-auto max-w-[1180px] px-5 pt-[120px] pb-20">
        {/* Steps */}
        <div className="mb-8 flex items-center justify-center gap-3 text-[12.5px]">
          <button
            onClick={() => clientSecret && setStep("shipping")}
            className={`flex items-center gap-2 font-medium ${
              step === "shipping" ? "text-[#004643]" : "text-[#8E9493] hover:text-[#4B4F4F]"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                step === "shipping" ? "bg-[#004643] text-white" : "bg-[#E7FBEB] text-[#28603A]"
              }`}
            >
              {step === "payment" ? "✓" : num(1)}
            </span>
            <span>{t.stepShipping}</span>
          </button>

          <ChevronRight className={`h-3.5 w-3.5 text-[#D5DBDA] ${isRtl ? "rotate-180" : ""}`} />

          <div
            className={`flex items-center gap-2 font-medium ${
              step === "payment" ? "text-[#004643]" : "text-[#B3B9B9]"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                step === "payment" ? "bg-[#004643] text-white" : "bg-[#F1F4F4] text-[#646968]"
              }`}
            >
              {num(2)}
            </span>
            <span>{t.stepPayment}</span>
          </div>
        </div>

        {generalError && (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-[#812F28]/25 bg-[#FFFAF9] p-4 text-[12.5px] text-[#812F28]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        {promoDropped && promoCode && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-[#E6EBEA] bg-[#FFFBF2] p-4 text-[12.5px] text-[#4B4F4F]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#812F28]" />
            <span>{t.promoDropped(promoCode)}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Left: form */}
          <div className="lg:col-span-7">
            {step === "shipping" ? (
              <form onSubmit={handleAddressSubmit} className="space-y-6">
                <div className="rounded-2xl border border-[#E6EBEA] bg-white p-6">
                  <div className="mb-5 flex items-center gap-2 border-b border-[#F1F4F4] pb-3">
                    <Truck className="h-4 w-4 text-[#004643]" />
                    <h3 className="text-[14px] font-medium text-[#101212]">{t.destination}</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                      className="sm:col-span-2"
                      label={t.fullName}
                      value={address.fullName}
                      onChange={v => setAddress({ ...address, fullName: v })}
                      placeholder="Jane Doe"
                    />
                    <Field
                      className="sm:col-span-2"
                      label={t.street}
                      value={address.street}
                      onChange={v => setAddress({ ...address, street: v })}
                      placeholder="123 Example Street"
                    />
                    <Field
                      label={t.city}
                      value={address.city}
                      onChange={v => setAddress({ ...address, city: v })}
                      placeholder="Dubai"
                    />
                    <Field
                      label={t.state}
                      value={address.state}
                      onChange={v => setAddress({ ...address, state: v })}
                      placeholder="Dubai"
                    />
                    <Field
                      label={t.postal}
                      value={address.zipCode}
                      onChange={v => setAddress({ ...address, zipCode: v })}
                      placeholder="00000"
                    />
                    <div>
                      <label className="block text-[11px] font-medium text-[#646968]">
                        {t.country}
                      </label>
                      <select
                        value={address.country}
                        onChange={e => setAddress({ ...address, country: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-[#D5DBDA] bg-white px-3.5 py-2.5 text-[13px] transition focus:border-[#87DDD7] focus:outline-none"
                      >
                        <option value="US">United States (USD)</option>
                        <option value="CA">Canada</option>
                        <option value="GB">United Kingdom</option>
                        <option value="AE">United Arab Emirates</option>
                        <option value="SA">Saudi Arabia</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoadingIntent}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#004643] py-3.5 text-[14px] font-medium text-white transition hover:bg-[#003836] disabled:opacity-60"
                >
                  {isLoadingIntent ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t.verifying}</span>
                    </>
                  ) : (
                    <>
                      <span>{t.proceed}</span>
                      <ChevronRight className={`h-3.5 w-3.5 ${isRtl ? "rotate-180" : ""}`} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              clientSecret && checkoutSummary && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: { colorPrimary: "#004643", borderRadius: "12px" },
                    },
                  }}
                >
                  <CheckoutPaymentForm summary={checkoutSummary} money={money} t={t} />
                </Elements>
              )
            )}
          </div>

          {/* Right: summary */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-[#E6EBEA] bg-[#FBFCFC] p-6 lg:sticky lg:top-[120px]">
              <h3 className="mb-4 text-[14px] font-medium text-[#101212]">
                {t.summary(checkoutSummary
                  ? checkoutSummary.items.reduce((n, i) => n + i.quantity, 0)
                  : totalItems())}
              </h3>

              {checkoutSummary ? (
                <div className="divide-y divide-[#F1F4F4]">
                  {checkoutSummary.retailers.map(group => (
                    <div key={group.retailer_id} className="py-3 first:pt-0 last:pb-0">
                      <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-[#8E9493]">
                        <span>{group.retailer_name}</span>
                        <span>
                          {group.shipping.shipping_amount === 0
                            ? t.freeShipping
                            : money(group.shipping.shipping_amount)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {group.items.map(item => (
                          <div key={item.cart_item_id} className="flex items-center justify-between text-[12.5px]">
                            <div className="pe-4 min-w-0">
                              <p className="font-medium text-[#101212] truncate">{item.title}</p>
                              <p className="text-[11px] text-[#8E9493]">
                                {t.qty}: {num(item.quantity)} × {money(item.unit_price)}
                              </p>
                            </div>
                            <span className="shrink-0 font-medium text-[#101212]">
                              {money(item.total_price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-[#F1F4F4]">
                  {items.map(item => {
                    const price =
                      (item as any).product_variants?.price ?? item.product_data?.price ?? 0;
                    const title =
                      (item as any).product_variants?.products?.title ??
                      item.product_data?.title ?? "Product";
                    return (
                      <div key={item.id} className="flex items-center justify-between py-3 text-[12.5px]">
                        <div className="pe-4 min-w-0">
                          <p className="font-medium text-[#101212] truncate">{title}</p>
                          <p className="text-[11px] text-[#8E9493]">
                            {t.qty}: {num(item.quantity)} × {money(price)}
                          </p>
                        </div>
                        <span className="shrink-0 font-medium text-[#101212]">
                          {money(price * item.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 space-y-2.5 border-t border-[#E6EBEA] pt-4 text-[12.5px]">
                <div className="flex justify-between text-[#646968]">
                  <span>{t.subtotal}</span>
                  <span className="text-[#101212]">
                    {money(checkoutSummary ? checkoutSummary.subtotal : subtotal())}
                  </span>
                </div>

                {/* Only ever rendered from the server's figure. If the code was
                    declined this row disappears and the banner above explains. */}
                {checkoutSummary && checkoutSummary.discount_amount > 0 && (
                  <div className="flex justify-between text-[#28603A]">
                    <span className="flex items-center gap-1.5">
                      <Tag className="h-3 w-3" />
                      {checkoutSummary.promotion_code}
                    </span>
                    <span>−{money(checkoutSummary.discount_amount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-[#646968]">
                  <span>{t.shipping}</span>
                  <span className="text-[#101212]">
                    {checkoutSummary
                      ? checkoutSummary.shipping_total === 0
                        ? t.freeShipping
                        : money(checkoutSummary.shipping_total)
                      : t.atPayment}
                  </span>
                </div>

                <div className="flex justify-between text-[#646968]">
                  <span>{t.tax}</span>
                  <span className="text-[#101212]">
                    {checkoutSummary ? money(checkoutSummary.tax_total) : t.atPayment}
                  </span>
                </div>

                <div className="flex justify-between border-t border-[#E6EBEA] pt-3 text-[15px] font-semibold text-[#101212]">
                  <span>{t.total}</span>
                  <span className="text-[#004643]">
                    {money(checkoutSummary ? checkoutSummary.grand_total : subtotal())}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small pieces ────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-medium text-[#646968]">{label}</label>
      <input
        type="text"
        required
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-[#D5DBDA] px-3.5 py-2.5 text-[13px] transition placeholder:text-[#B3B9B9] focus:border-[#87DDD7] focus:outline-none"
      />
    </div>
  );
}

/** No cart, no search, no nav. Once someone is paying, every link out is a
 *  chance to lose the order. */
function CheckoutHeader({ t, isRtl }: { t: Copy; isRtl: boolean }) {
  return (
    <>
      <div
        aria-hidden
        className="fixed top-0 left-0 right-0 h-[118px] z-40 pointer-events-none bg-gradient-to-b from-white via-white/90 to-transparent"
      />
      <header className="fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[1240px] h-[72px] z-50">
        <div className="w-full h-full backdrop-blur-[100px] bg-[#f7fbfc]/90 border border-[#e2eaf0] rounded-[22px] flex items-center justify-between ps-[16px] md:ps-[24px] pe-[16px] py-[12px]">
          <Link href="/" className="flex items-center gap-[9px] shrink-0">
            <Image
              width={100}
              height={100}
              src="/assets/logo.png"
              alt="NOOI"
              className="w-[32px] md:w-[40px] h-auto object-contain"
            />
            <span className="font-inter font-bold text-[18px] md:text-[20px] text-[#111d27] tracking-tight">
              NOOI
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 rounded-full border border-[#28603A]/25 bg-[#E7FBEB] px-3 py-1 text-[11px] font-medium text-[#28603A]">
              <ShieldCheck className="h-3 w-3" />
              {t.secure}
            </span>
            <Link
              href="/cart"
              className="inline-flex items-center gap-1.5 text-[12.5px] text-[#646968] transition hover:text-[#004643]"
            >
              <ArrowLeft className={`h-3.5 w-3.5 ${isRtl ? "rotate-180" : ""}`} />
              <span className="hidden sm:inline">{t.back}</span>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <CheckoutInner />
    </Suspense>
  );
}