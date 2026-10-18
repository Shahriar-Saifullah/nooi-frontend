import { Suspense } from "react";
import VendorDashboardView from "@/components/vendor/VendorDashboardView";

export default function VendorOrdersPage() {
  return (
    <Suspense fallback={null}>
      <VendorDashboardView initialSection="orders" />
    </Suspense>
  );
}
