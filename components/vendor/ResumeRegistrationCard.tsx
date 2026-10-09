"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useVendorStore } from "@/lib/store";

interface ResumeRegistrationCardProps {
  customStep?: number;
}

export default function ResumeRegistrationCard({
  customStep,
}: ResumeRegistrationCardProps) {
  const router = useRouter();
  const accountData = useVendorStore((state) => state.accountData);
  const storeProfile = useVendorStore((state) => state.storeProfile);
  const step = customStep ?? useVendorStore((state) => state.step);
  const lastSavedAt = useVendorStore((state) => state.lastSavedAt);

  const fullName = accountData.fullName || "Rawda Al-Harbi";
  const businessName =
    storeProfile.storeName || accountData.businessName || "Atelier Rawda";
  const email = accountData.workEmail || "rawda@atelierrawda.sa";

  // Step names: 2 = Store profile, 3 = Legal documents, 4 = Payout details, 5 = Review & submit
  const getStepName = (s: number) => {
    switch (s) {
      case 2:
        return "Store profile";
      case 3:
        return "Legal documents";
      case 4:
        return "Payout details";
      case 5:
        return "Review & submit";
      default:
        return "Legal documents";
    }
  };

  const getStepPercentage = (s: number) => {
    switch (s) {
      case 1:
        return 20;
      case 2:
        return 20;
      case 3:
        return 40;
      case 4:
        return 60;
      case 5:
        return 80;
      default:
        return 40;
    }
  };

  const stepName = getStepName(step);
  const percentage = getStepPercentage(step);

  const formattedDate = lastSavedAt
    ? new Date(lastSavedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "28 Sep 2026, 18:12";

  const handleContinue = () => {
    const targetStep = step >= 2 ? step : 2;
    router.push(`/sell/onboarding?step=${targetStep}`);
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "440px",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: "14px",
        padding: "32px 32px 28px 32px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
        fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: "22px" }}>
        <a href="/" style={{ display: "inline-block" }}>
          <img
            src="/Logo/Logo.svg"
            alt="nooi"
            style={{ height: "22px", width: "auto", display: "block" }}
          />
        </a>
      </div>

      {/* Heading */}
      <h1
        style={{
          fontSize: "21px",
          fontWeight: 700,
          color: "#101212",
          lineHeight: "1.25",
          letterSpacing: "-0.015em",
          margin: "0 0 10px 0",
        }}
      >
        Welcome back, {fullName}
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: "12.5px",
          lineHeight: "1.5",
          color: "#4B4F4F",
          margin: "0 0 16px 0",
        }}
      >
        Your application for{" "}
        <strong style={{ fontWeight: 600, color: "#101212" }}>
          {businessName}
        </strong>{" "}
        is saved. Pick up at{" "}
        <strong style={{ fontWeight: 600, color: "#101212" }}>
          {stepName}.
        </strong>
      </p>

      {/* Progress Bar */}
      <div
        style={{
          width: "100%",
          height: "4px",
          backgroundColor: "#EAEDEC",
          borderRadius: "9999px",
          overflow: "hidden",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percentage}%`,
            backgroundColor: "#004643",
            borderRadius: "9999px",
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {/* Percentage & Saved time */}
      <div
        style={{
          fontSize: "11.5px",
          color: "#646968",
          marginBottom: "18px",
          fontWeight: 400,
        }}
      >
        {percentage}% complete · Saved {formattedDate}
      </div>

      {/* Info notice box */}
      <div
        style={{
          backgroundColor: "#F2F4F4",
          borderRadius: "8px",
          padding: "14px 16px",
          marginBottom: "18px",
          fontSize: "12px",
          lineHeight: "1.45",
          color: "#4B4F4F",
          border: "none",
        }}
      >
        If you leave for 48 hours, we email a link to{" "}
        <span style={{ color: "#101212" }}>{email}</span> that opens this exact
        step.
      </div>

      {/* Continue application button */}
      <button
        type="button"
        onClick={handleContinue}
        style={{
          width: "100%",
          backgroundColor: "#004643",
          color: "#FFFFFF",
          fontSize: "13px",
          fontWeight: 600,
          border: "none",
          borderRadius: "6px",
          padding: "11px 16px",
          cursor: "pointer",
          transition: "background-color 0.15s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#003836")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#004643")}
      >
        Continue application
      </button>
    </div>
  );
}
