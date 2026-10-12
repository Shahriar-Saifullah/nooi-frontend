"use client";

import { useEffect, useState } from "react";
import { useVendorStore } from "@/lib/store";
import ActionNeededCard from "@/components/vendor/ActionNeededCard";

export default function ActionNeededPage() {
  const storeProfile = useVendorStore((state) => state.storeProfile);
  const accountData = useVendorStore((state) => state.accountData);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    useVendorStore.persist.rehydrate();
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const storeName = storeProfile.storeName || accountData.businessName || "Atelier Rawda";
  const initials = "RA";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
      }}
    >
      {/* Top Navbar matching Original Image 2 */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #EAEDEC",
        }}
      >
        <a href="/" style={{ display: "flex", alignItems: "center" }}>
          <img src="/Logo/Logo.svg" alt="nooi" style={{ height: "22px", width: "auto" }} />
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "13px", color: "#4B4F4F", fontWeight: 400 }}>{storeName}</span>
          <span
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "9999px",
              backgroundColor: "#004643",
              color: "#FFFFFF",
              fontSize: "11px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: "0.02em",
            }}
          >
            {initials}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main
        style={{
          flex: 1,
          padding: "48px 24px",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          backgroundColor: "#FFFFFF",
        }}
      >
        <ActionNeededCard />
      </main>
    </div>
  );
}
