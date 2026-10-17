import { Suspense } from "react";
import VendorDashboardView from "@/components/vendor/VendorDashboardView";

export default function VendorSettingsPage() {
  return (
    <Suspense fallback={null}>
      <VendorDashboardView initialSection="settings" />
    </Suspense>
  );
}
