"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  AlertOctagon,
  XCircle,
  ArrowRight,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import { getOrderByPaymentIntent } from "@/lib/api/checkout";
import { useCartStore } from "@/lib/store/cart.store";

type CheckoutState =
  | "CONFIRMING"
  | "SUCCESS"
  | "STOCK_FAILED"
  | "PAYMENT_FAILED"
  | "PROCESSING";

function SuccessContent() {
  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get("payment_intent");
  const redirectStatus = searchParams.get("redirect_status");

  const [state, setState] = useState<CheckoutState>("CONFIRMING");
  const [orderData, setOrderData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { clearCart } = useCartStore();

  useEffect(() => {
    if (!paymentIntentId) {
      setState("PAYMENT_FAILED");
      setErrorMessage("Missing payment intent identifier.");
      return;
    }

    if (redirectStatus === "failed") {
      setState("PAYMENT_FAILED");
      setErrorMessage("Payment failed or was declined by the issuer.");
      return;
    }

    let intervalId: NodeJS.Timeout;
    const startTime = Date.now();
    const TIMEOUT_MS = 30000; // 30 seconds polling timeout

    const poll = async () => {
      try {
        const res = await getOrderByPaymentIntent(paymentIntentId);

        if (res.success) {
          const data = res.data;
          if (data.status === "succeeded") {
            setState("SUCCESS");
            setOrderData(data.order);
            clearCart(); // Clean cart on confirmed purchase
            clearInterval(intervalId);
            return;
          }

          if (data.status === "stock_failed") {
            setState("STOCK_FAILED");
            setErrorMessage(
              data.message ||
                "One or more items in your order were out of stock. A full refund has been issued."
            );
            clearInterval(intervalId);
            return;
          }

          if (data.status === "payment_failed") {
            setState("PAYMENT_FAILED");
            setErrorMessage(data.message || "Payment authorization failed.");
            clearInterval(intervalId);
            return;
          }
        } else {
          const errorMsg =
            typeof res.error === "string"
              ? res.error
              : "Unable to retrieve order details";
          if (errorMsg.includes("stock")) {
            setState("STOCK_FAILED");
            setErrorMessage(errorMsg);
            clearInterval(intervalId);
            return;
          }
        }

        // If 30 seconds have elapsed without finalization, show processing state
        if (Date.now() - startTime > TIMEOUT_MS) {
          setState("PROCESSING");
          clearInterval(intervalId);
        }
      } catch {
        if (Date.now() - startTime > TIMEOUT_MS) {
          setState("PROCESSING");
          clearInterval(intervalId);
        }
      }
    };

    // Immediate initial poll
    poll();
    intervalId = setInterval(poll, 2000);

    return () => clearInterval(intervalId);
  }, [paymentIntentId, redirectStatus, clearCart]);

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
      {state === "CONFIRMING" && (
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-neutral-800">
            Confirming Transaction
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Your payment was submitted to Stripe. We are finalizing your order
            and reserving inventory...
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-neutral-400">
            <Clock className="h-3.5 w-3.5" />
            <span>Polling verification (up to 30s)</span>
          </div>
        </div>
      )}

      {state === "SUCCESS" && (
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-800">
            Order Confirmed!
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Thank you for your purchase. We have received your order and are
            preparing your delivery.
          </p>

          {orderData && (
            <div className="my-6 rounded-2xl bg-neutral-50 p-4 text-left text-xs text-neutral-600 space-y-1.5">
              <div className="flex justify-between">
                <span className="font-semibold text-neutral-700">Order Number:</span>
                <span className="font-mono text-neutral-900">{orderData.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-neutral-700">Total Amount:</span>
                <span className="font-semibold text-[#004643]">
                  ${Number(orderData.total_amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-neutral-700">Payment Status:</span>
                <span className="capitalize text-emerald-600 font-medium">{orderData.payment_status}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/orders"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#004643] py-3 text-sm font-medium text-white transition hover:bg-[#003230]"
            >
              <PackageCheck className="h-4 w-4" />
              <span>View My Orders</span>
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              <span>Continue Shopping</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {state === "STOCK_FAILED" && (
        <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertOctagon className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-800">
            Inventory Unavailable
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            {errorMessage ||
              "An item became unavailable before fulfillment could complete. A full refund has been automatically initiated to your original payment method."}
          </p>
          <div className="mt-6">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-xl bg-[#004643] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#003230]"
            >
              <span>Return to Marketplace</span>
            </Link>
          </div>
        </div>
      )}

      {state === "PAYMENT_FAILED" && (
        <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <XCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-800">
            Payment Failed
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            {errorMessage ||
              "Your payment could not be authorized. Please review your payment details and try again."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/checkout"
              className="inline-flex items-center gap-2 rounded-xl bg-[#004643] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#003230]"
            >
              <span>Try Again</span>
            </Link>
          </div>
        </div>
      )}

      {state === "PROCESSING" && (
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Clock className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-800">
            Payment Received & Processing
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Your payment was confirmed by Stripe. Our fulfillment systems are
            still synchronizing your order. You can safely check back shortly or
            review your Orders dashboard.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 rounded-xl bg-[#004643] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#003230]"
            >
              <PackageCheck className="h-4 w-4" />
              <span>Go to Orders</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-[#004643]" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
