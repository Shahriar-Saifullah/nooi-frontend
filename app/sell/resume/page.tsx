"use client";

import { useEffect, useState } from "react";
import { useVendorStore } from "@/lib/store";
import ResumeRegistrationCard from "@/components/vendor/ResumeRegistrationCard";

export default function ResumePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    useVendorStore.persist.rehydrate();
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        boxSizing: "border-box",
      }}
    >
      <ResumeRegistrationCard />
    </div>
  );
}
