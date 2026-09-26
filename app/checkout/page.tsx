"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  ShieldCheck,
  Truck,
  Lock,
  ArrowLeft,
  ShoppingBag,
  CreditCard,
  ChevronRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { getStripe } from "@/lib/stripe";
import { useCartStore } from "@/lib/store/cart.store";
import {
  createPaymentIntent,
  ShippingAddress,
  CheckoutSummary,
} from "@/lib/api/checkout";

function CheckoutPaymentForm({
  summary,
  clientSecret,
}: {
  summary: CheckoutSummary;
  clientSecret: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || isProcessing) {
      return;
    }

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
        setErrorMessage(error.message || "Payment verification failed");
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
      setIsProcessing(false);
    }
    // Note: If payment succeeds, Stripe automatically redirects to return_url
  };

  return (
    <form onSubmit={handlePay} className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#004643]" />
            <h3 className="text-base font-semibold text-neutral-800">
              Payment Method
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Lock className="h-3.5 w-3.5 text-emerald-600" />
            <span>256-bit SSL Encrypted</span>
          </div>
        </div>

        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />

        {errorMessage && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/75 p-3.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-[#004643] py-4 text-base font-medium text-white shadow-md transition-all hover:bg-[#003230] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Authorizing Payment...</span>
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            <span>
              Pay ${summary.grand_total.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </>
        )}
      </button>

      <p className="text-center text-xs text-neutral-500">
        By clicking Pay, you agree to Nooi’s Terms of Service and Privacy Policy.
      </p>
    </form>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalItems, subtotal } = useCartStore();

  const [address, setAddress] = useState<ShippingAddress>({
    fullName: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "US",
  });

  const [isLoadingIntent, setIsLoadingIntent] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutSummary, setCheckoutSummary] = useState<CheckoutSummary | null>(
    null
  );
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [step, setStep] = useState<"shipping" | "payment">("shipping");

  const stripePromise = getStripe();

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (
      !address.fullName.trim() ||
      !address.street.trim() ||
      !address.city.trim() ||
      !address.state.trim() ||
      !address.zipCode.trim()
    ) {
      setGeneralError("Please fill in all required shipping fields.");
      return;
    }

    setIsLoadingIntent(true);

    try {
      const response = await createPaymentIntent(address);

      if (!response.success) {
        setGeneralError(
          typeof response.error === "string"
            ? response.error
            : "Failed to initialize checkout. Please check cart items or stock."
        );
        setIsLoadingIntent(false);
        return;
      }

      const { client_secret, summary } = response.data;
      setClientSecret(client_secret);
      setCheckoutSummary(summary);
      setStep("payment");
    } catch (err: any) {
      setGeneralError(err.message || "Network error. Please try again.");
    } finally {
      setIsLoadingIntent(false);
    }
  };

  if (items.length === 0 && !clientSecret) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
          <ShoppingBag className="h-10 w-10 stroke-[1.5]" />
        </div>
        <h2 className="font-serif text-2xl font-semibold text-neutral-800">
          Your Cart is Empty
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          You don’t have any items ready for checkout. Explore our curated
          catalog to discover bespoke furnishings.
        </p>
        <Link
          href="/marketplace"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#004643] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#003230]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Marketplace</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between border-b border-neutral-200 pb-5">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to shopping</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Guaranteed Safe & Secure Checkout</span>
          </div>
        </div>
      </div>

      {/* Progress Indicators */}
      <div className="mb-8 flex items-center justify-center gap-3 text-sm">
        <button
          onClick={() => clientSecret && setStep("shipping")}
          className={`flex items-center gap-2 font-medium ${
            step === "shipping"
              ? "text-[#004643]"
              : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
              step === "shipping"
                ? "bg-[#004643] text-white"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {step === "payment" ? "✓" : "1"}
          </span>
          <span>Shipping Details</span>
        </button>

        <ChevronRight className="h-4 w-4 text-neutral-300" />

        <div
          className={`flex items-center gap-2 font-medium ${
            step === "payment" ? "text-[#004643]" : "text-neutral-400"
          }`}
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
              step === "payment"
                ? "bg-[#004643] text-white"
                : "bg-neutral-200 text-neutral-600"
            }`}
          >
            2
          </span>
          <span>Payment</span>
        </div>
      </div>

      {generalError && (
        <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <span>{generalError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Left Column: Form (Shipping or Payment) */}
        <div className="lg:col-span-7">
          {step === "shipping" ? (
            <form onSubmit={handleAddressSubmit} className="space-y-6">
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2 border-b border-neutral-100 pb-3">
                  <Truck className="h-5 w-5 text-[#004643]" />
                  <h3 className="text-base font-semibold text-neutral-800">
                    Shipping Destination
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-neutral-600">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={address.fullName}
                      onChange={(e) =>
                        setAddress({ ...address, fullName: e.target.value })
                      }
                      placeholder="e.g. Jane Doe"
                      className="mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm transition focus:border-[#004643] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-neutral-600">
                      Street Address
                    </label>
                    <input
                      type="text"
                      required
                      value={address.street}
                      onChange={(e) =>
                        setAddress({ ...address, street: e.target.value })
                      }
                      placeholder="123 Luxury Avenue, Suite 400"
                      className="mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm transition focus:border-[#004643] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-600">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      value={address.city}
                      onChange={(e) =>
                        setAddress({ ...address, city: e.target.value })
                      }
                      placeholder="New York"
                      className="mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm transition focus:border-[#004643] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-600">
                      State / Province
                    </label>
                    <input
                      type="text"
                      required
                      value={address.state}
                      onChange={(e) =>
                        setAddress({ ...address, state: e.target.value })
                      }
                      placeholder="NY"
                      className="mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm transition focus:border-[#004643] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-600">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      required
                      value={address.zipCode}
                      onChange={(e) =>
                        setAddress({ ...address, zipCode: e.target.value })
                      }
                      placeholder="10001"
                      className="mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm transition focus:border-[#004643] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-600">
                      Country
                    </label>
                    <select
                      value={address.country}
                      onChange={(e) =>
                        setAddress({ ...address, country: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm transition focus:border-[#004643] focus:outline-none bg-white"
                    >
                      <option value="US">United States (USD)</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="AE">United Arab Emirates</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoadingIntent}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#004643] py-4 text-base font-medium text-white shadow-md transition hover:bg-[#003230] disabled:opacity-60"
              >
                {isLoadingIntent ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Verifying Stock & Calculating Taxes...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Payment</span>
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div>
              {clientSecret && checkoutSummary && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: {
                        colorPrimary: "#004643",
                        borderRadius: "12px",
                      },
                    },
                  }}
                >
                  <CheckoutPaymentForm
                    summary={checkoutSummary}
                    clientSecret={clientSecret}
                  />
                </Elements>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-neutral-800">
              Order Summary ({totalItems()} {totalItems() === 1 ? "item" : "items"})
            </h3>

            {/* If snapshot summary exists, display grouped by retailer */}
            {checkoutSummary ? (
              <div className="divide-y divide-neutral-100">
                {checkoutSummary.retailers.map((group) => (
                  <div key={group.retailer_id} className="py-3 first:pt-0 last:pb-0">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      <span>{group.retailer_name}</span>
                      <span className="text-neutral-400">
                        {group.shipping.policy_applied === "free_above"
                          ? "Free Shipping"
                          : `$${group.shipping.shipping_amount.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <div
                          key={item.cart_item_id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="pr-4">
                            <p className="font-medium text-neutral-800">
                              {item.title}
                            </p>
                            <p className="text-xs text-neutral-400">
                              Qty: {item.quantity} × ${item.unit_price.toFixed(2)}
                            </p>
                          </div>
                          <span className="font-medium text-neutral-800">
                            ${item.total_price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {items.map((item) => {
                  const price =
                    item.product_variants?.price ?? item.product_data?.price ?? 0;
                  const title =
                    item.product_variants?.products?.title ??
                    item.product_data?.title ??
                    "Product";
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-3 text-sm"
                    >
                      <div className="pr-4">
                        <p className="font-medium text-neutral-800">{title}</p>
                        <p className="text-xs text-neutral-400">
                          Qty: {item.quantity} × ${price.toFixed(2)}
                        </p>
                      </div>
                      <span className="font-medium text-neutral-800">
                        ${(price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 border-t border-neutral-100 pt-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span>
                  $
                  {(checkoutSummary
                    ? checkoutSummary.subtotal
                    : subtotal()
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Shipping</span>
                <span>
                  {checkoutSummary
                    ? checkoutSummary.shipping_total === 0
                      ? "Free"
                      : `$${checkoutSummary.shipping_total.toFixed(2)}`
                    : "Calculated at payment"}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Estimated Tax</span>
                <span>
                  {checkoutSummary
                    ? `$${checkoutSummary.tax_total.toFixed(2)}`
                    : "$0.00"}
                </span>
              </div>
              <div className="flex justify-between border-t border-neutral-100 pt-3 text-base font-semibold text-neutral-900">
                <span>Total</span>
                <span className="text-[#004643]">
                  $
                  {(checkoutSummary
                    ? checkoutSummary.grand_total
                    : subtotal()
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
