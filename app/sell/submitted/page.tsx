"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useVendorStore } from "@/lib/store";
import ActionNeededCard from "@/components/vendor/ActionNeededCard";
import NotApprovedCard from "@/components/vendor/NotApprovedCard";

function SubmittedPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const storeProfile = useVendorStore((state) => state.storeProfile);
  const accountData = useVendorStore((state) => state.accountData);
  const legalDocs = useVendorStore((state) => state.legalDocs);
  const submittedAt = useVendorStore((state) => state.submittedAt);
  const storeApplicationStatus = useVendorStore((state) => state.applicationStatus);
  const setApplicationStatus = useVendorStore((state) => state.setApplicationStatus);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    useVendorStore.persist.rehydrate();
    setMounted(true);
  }, []);

  // Determine current review view: in_review | action_needed | rejected
  const queryStatus = searchParams.get("status");
  const currentStatus =
    queryStatus ||
    (storeApplicationStatus === "action_needed"
      ? "action_needed"
      : storeApplicationStatus === "rejected"
      ? "rejected"
      : "in_review");

  if (!mounted) return null;

  const storeName = storeProfile.storeName || accountData.businessName || "Atelier Rawda";
  const initials = "RA";

  const submitDateObj = submittedAt ? new Date(submittedAt) : new Date();
  const submittedDateFormatted = submitDateObj.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Expected decision: within 2 business days
  const decisionDateObj = new Date(submitDateObj.getTime() + 2 * 24 * 60 * 60 * 1000);
  const decisionDateFormatted = decisionDateObj.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const email = accountData.workEmail || "rawda@atelierrauda.sa";
  const fulfillmentLabel = storeProfile.fulfillmentType || "Factory";
  const crNumber = legalDocs.commercialRegistrationNumber || "1010874421";
  const vatNumber = legalDocs.vatNumber || "310458812700003";

  const isActionOrRejected =
    currentStatus === "action_needed" ||
    currentStatus === "rejected" ||
    currentStatus === "not_approved";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: isActionOrRejected ? "#FFFFFF" : "#FBFCFC",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
      }}
    >
      {/* Top Navbar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          background: "#FFFFFF",
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
              background: "#004643",
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


      {/* Main Content Section */}
      <main style={{ flex: 1, padding: "40px 24px" }}>
        {currentStatus === "action_needed" ? (
          /* Design 4: One document needs replacing (Image 4) */
          <ActionNeededCard
            onStatusChange={(newStatus) => {
              router.push(`/sell/submitted?status=${newStatus}`);
            }}
          />
        ) : currentStatus === "rejected" || currentStatus === "not_approved" ? (
          /* Design 5: We couldn't approve this application yet (Image 5) */
          <NotApprovedCard />
        ) : (
          /* Default: In review */
          <div
            style={{
              maxWidth: "640px",
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {/* Header & Status */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span
                style={{
                  alignSelf: "flex-start",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#FFFBF2",
                  color: "#563D00",
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: "999px",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "999px",
                    background: "#9C7B31",
                  }}
                />
                In review
              </span>
              <h1
                style={{
                  fontSize: "28px",
                  fontWeight: 600,
                  margin: 0,
                  color: "#101212",
                  lineHeight: 1.25,
                }}
              >
                Your application is with the Nooi team
              </h1>
              <p style={{ margin: 0, color: "#4B4F4F", fontSize: "15px", lineHeight: 1.5 }}>
                Submitted {submittedDateFormatted}. Expect a decision by{" "}
                <strong style={{ color: "#101212", fontWeight: 600 }}>{decisionDateFormatted}</strong> — within 2 business days. We&apos;ll email {email}.
              </p>
            </div>

            {/* Card: What we received */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #EAEDEC",
                borderRadius: "12px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ fontWeight: 600, color: "#101212", fontSize: "15px" }}>What we received</div>
              <div style={{ display: "flex", gap: "10px", fontSize: "14px", color: "#101212" }}>
                <span style={{ color: "#437E54", fontWeight: "bold" }}>✓</span>
                <span style={{ flex: 1 }}>Store profile · {storeName}, {fulfillmentLabel}</span>
              </div>
              <div style={{ display: "flex", gap: "10px", fontSize: "14px", color: "#101212" }}>
                <span style={{ color: "#437E54", fontWeight: "bold" }}>✓</span>
                <span style={{ flex: 1 }}>Commercial registration {crNumber} + certificate</span>
              </div>
              <div style={{ display: "flex", gap: "10px", fontSize: "14px", color: "#101212" }}>
                <span style={{ color: "#437E54", fontWeight: "bold" }}>✓</span>
                <span style={{ flex: 1 }}>VAT certificate {vatNumber}</span>
              </div>
              <div style={{ display: "flex", gap: "10px", fontSize: "14px", color: "#101212" }}>
                <span style={{ color: "#437E54", fontWeight: "bold" }}>✓</span>
                <span style={{ flex: 1 }}>Authorised signatory ID</span>
              </div>
              <div style={{ display: "flex", gap: "10px", fontSize: "14px", color: "#101212" }}>
                <span style={{ color: "#437E54", fontWeight: "bold" }}>✓</span>
                <span style={{ flex: 1 }}>Payouts to your bank account (IBAN)</span>
              </div>
            </div>

            {/* Card: While you wait */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #EAEDEC",
                borderRadius: "12px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ fontWeight: 600, color: "#101212", fontSize: "15px" }}>While you wait</div>
              <div style={{ fontSize: "14px", color: "#4B4F4F", lineHeight: 1.5 }}>
                Explore your dashboard and set up your store. Listing and orders unlock when you&apos;re approved.
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => router.push("/sell/dashboard")}
                  style={{
                    background: "#004643",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Explore your dashboard
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/sell/dashboard")}
                  style={{
                    background: "#FFFFFF",
                    color: "#343837",
                    border: "1px solid #D5DBDA",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Check status
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SubmittedPage() {
  return (
    <Suspense fallback={null}>
      <SubmittedPageContent />
    </Suspense>
  );
}
