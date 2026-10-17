import { Suspense } from "react";
import VendorDashboardView from "@/components/vendor/VendorDashboardView";

export default function VendorPaymentsPage() {
  return (
    <Suspense fallback={null}>
      <VendorDashboardView initialSection="payments" />
    </Suspense>
  );
}
