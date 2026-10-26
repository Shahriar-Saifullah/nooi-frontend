"use client";

/**
 * Customer support — /support, /support?order=<id>, /support?ticket=<id>
 *
 * Everything sits inside <Suspense>: both ShopHeader and the support center
 * read the URL with useSearchParams(), which Next.js refuses to prerender
 * outside a Suspense boundary (the build fails on /support otherwise).
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ShopHeader from "@/components/marketplace/ShopHeader";
import SupportCenter from "@/components/support/SupportCenter";

function SupportContent() {
  const params = useSearchParams();
  return (
    <div className="min-h-screen bg-white">
      <ShopHeader />
      <main className="mx-auto max-w-[860px] px-5 pt-[120px] pb-20">
        <SupportCenter
          audience="customer"
          initialTicketId={params.get("ticket")}
          initialOrderId={params.get("order")}
        />
      </main>
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SupportContent />
    </Suspense>
  );
}
