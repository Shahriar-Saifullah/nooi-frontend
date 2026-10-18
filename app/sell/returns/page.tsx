import { Suspense } from "react";
import VendorDashboardView from "@/components/vendor/VendorDashboardView";

export default function VendorReturnsPage() {
  return (
    <Suspense fallback={null}>
      <VendorDashboardView initialSection="returns" />
    </Suspense>
  );
}
