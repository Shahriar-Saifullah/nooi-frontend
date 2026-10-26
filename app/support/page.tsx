"use client";

/**
 * Customer support — /support, /support?order=<id>, /support?ticket=<id>
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ShopHeader from "@/components/marketplace/ShopHeader";
import SupportCenter from "@/components/support/SupportCenter";

function Inner() {
  const params = useSearchParams();
  return (
    <SupportCenter
      audience="customer"
      initialTicketId={params.get("ticket")}
      initialOrderId={params.get("order")}
    />
  );
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white">
      <ShopHeader />
      <main className="mx-auto max-w-[860px] px-5 pt-[120px] pb-20">
        <Suspense fallback={null}><Inner /></Suspense>
      </main>
    </div>
  );
}
