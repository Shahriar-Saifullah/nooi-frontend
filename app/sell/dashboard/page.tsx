import { Suspense } from "react";
import VendorDashboardView, { type VendorJourneyStage, type VendorSection } from "@/components/vendor/VendorDashboardView";

export type { VendorJourneyStage, VendorSection };

export default function VendorDashboardPage() {
  return (
    <Suspense fallback={null}>
      <VendorDashboardView initialSection="dashboard" />
    </Suspense>
  );
}
