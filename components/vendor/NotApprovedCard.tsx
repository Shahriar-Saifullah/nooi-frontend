"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function NotApprovedCard() {
  const router = useRouter();

  const handleFixAndResubmit = () => {
    // Navigate to legal documents (step 3) with reopened indicator
    router.push("/sell/onboarding?step=3&reopened=true");
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "580px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
      }}
    >
      {/* Not approved status badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "12px",
          fontWeight: 500,
          color: "#DC2626",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "9999px",
            backgroundColor: "#DC2626",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        Not approved
      </div>

      {/* Main Heading */}
      <h1
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: "#101212",
          letterSpacing: "-0.015em",
          lineHeight: "1.25",
          margin: "0 0 6px 0",
        }}
      >
        We couldn&apos;t approve this application yet
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: "13px",
          lineHeight: "1.45",
          color: "#646968",
          margin: "0 0 24px 0",
        }}
      >
        Here&apos;s the full reason. Fix the two fields below and resubmit — the rest stays as reviewed.
      </p>

      {/* Card with soft red/coral border */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #FECACA",
          borderRadius: "14px",
          padding: "26px 28px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
        }}
      >
        {/* Reason header */}
        <span
          style={{
            fontSize: "12px",
            color: "#8E9493",
            fontWeight: 400,
            marginBottom: "8px",
          }}
        >
          Reason from Nooi review · 27 Sep 2026
        </span>

        {/* Reason quote */}
        <p
          style={{
            fontSize: "13px",
            lineHeight: "1.55",
            color: "#101212",
            fontStyle: "italic",
            fontWeight: 500,
            margin: "0 0 20px 0",
          }}
        >
          “The commercial registration number entered (1010874421) doesn&apos;t match the number on the uploaded certificate (1010874412). The certificate scan is also cropped — the issue date isn&apos;t visible. Enter the number exactly as printed and upload a full-page scan.”
        </p>

        {/* Reopened for correction section */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#101212",
              marginBottom: "8px",
            }}
          >
            Reopened for correction
          </span>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              color: "#DC2626",
              fontWeight: 500,
              marginBottom: "4px",
            }}
          >
            <span style={{ fontSize: "11px", lineHeight: 1 }}>▸</span>
            Commercial registration number
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              color: "#DC2626",
              fontWeight: 500,
              marginBottom: "10px",
            }}
          >
            <span style={{ fontSize: "11px", lineHeight: 1 }}>▸</span>
            Commercial registration certificate
          </div>

          <span
            style={{
              fontSize: "11.5px",
              color: "#8E9493",
            }}
          >
            Locked: store profile, VAT, signatory ID, payout details
          </span>
        </div>

        {/* Fix and resubmit button */}
        <button
          type="button"
          onClick={handleFixAndResubmit}
          style={{
            alignSelf: "flex-start",
            marginTop: "22px",
            borderRadius: "6px",
            padding: "9px 18px",
            fontSize: "12.5px",
            fontWeight: 600,
            border: "none",
            color: "#FFFFFF",
            backgroundColor: "#004643",
            cursor: "pointer",
            transition: "background-color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#003836")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#004643")}
        >
          Fix and resubmit
        </button>
      </div>

      {/* Footer text */}
      <p
        style={{
          fontSize: "12px",
          color: "#646968",
          margin: "16px 0 0 0",
          lineHeight: "1.4",
        }}
      >
        Think this is wrong?{" "}
        <a
          href="mailto:support@nooi.com?subject=Application%20Rejection%20Reference%20VA-2281"
          style={{
            color: "#004643",
            textDecoration: "underline",
            fontWeight: 500,
          }}
        >
          Contact vendor support
        </a>{" "}
        with reference VA-2281.
      </p>
    </div>
  );
}
