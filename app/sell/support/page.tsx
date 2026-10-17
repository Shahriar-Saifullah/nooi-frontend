import { Suspense } from "react";
import VendorDashboardView from "@/components/vendor/VendorDashboardView";

export default function VendorSupportPage() {
  return (
    <Suspense fallback={null}>
      <VendorDashboardView initialSection="support" />
    </Suspense>
  );
}
