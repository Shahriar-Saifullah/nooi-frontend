"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useVendorStore } from "@/lib/store";

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "orders", label: "Orders", icon: "package" },
  { id: "products", label: "Products", icon: "tag" },
  { id: "returns", label: "Returns", icon: "refresh" },
  { id: "payments", label: "Payments", icon: "credit-card" },
  { id: "support", label: "Support", icon: "message" },
  { id: "settings", label: "Settings", icon: "settings" },
];

function NavIcon({ name }: { name: string }) {
  switch (name) {
    case "grid":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "package":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16.5 9.4 7.55 4.24a1.8 1.8 0 0 0-1.8 0L2.5 6.1" />
          <path d="M3.29 7 12 12l8.71-5" />
          <path d="M12 22V12" />
          <path d="m21.5 8.9-8.7 5a1.8 1.8 0 0 1-1.6 0l-8.7-5" />
          <rect x="2" y="4" width="20" height="16" rx="2" />
        </svg>
      );
    case "tag":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
          <path d="M7 7h.01" />
        </svg>
      );
    case "refresh":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      );
    case "credit-card":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      );
    case "message":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
      );
    case "settings":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 8h4" />
          <path d="M12 21v-9" />
          <path d="M12 8V3" />
          <path d="M17 16h4" />
          <path d="M19 12V3" />
          <path d="M19 21v-5" />
          <path d="M3 14h4" />
          <path d="M5 10V3" />
          <path d="M5 21v-7" />
        </svg>
      );
    default:
      return null;
  }
}

export default function VendorDashboardPage() {
  const router = useRouter();
  const storeProfile = useVendorStore((state) => state.storeProfile);
  const setStoreProfile = useVendorStore((state) => state.setStoreProfile);
  const accountData = useVendorStore((state) => state.accountData);
  const legalDocs = useVendorStore((state) => state.legalDocs);
  const submittedAt = useVendorStore((state) => state.submittedAt);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [settingsTab, setSettingsTab] = useState<"profile" | "legal" | "payout">("profile");
  const [mounted, setMounted] = useState(false);
  const [storeNameInput, setStoreNameInput] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    useVendorStore.persist.rehydrate();
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      setStoreNameInput(storeProfile.storeName || accountData.businessName || "Atelier Rawda");
    }
  }, [mounted, storeProfile.storeName, accountData.businessName]);

  if (!mounted) return null;

  const storeName = storeProfile.storeName || accountData.businessName || "Atelier Rawda";
  const storeInitials =
    storeName
      .split(" ")
      .filter(Boolean)
      .map((w: string) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "AR";
  const fulfillmentType = storeProfile.fulfillmentType || "Factory";

  const ownerName = accountData.fullName || "Rawda Al-Harbi";
  const ownerFirstName = ownerName.split(" ")[0] || "Rawda";
  const ownerInitials =
    ownerName
      .split(" ")
      .filter(Boolean)
      .map((w: string) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "RA";

  const submitDateObj = submittedAt ? new Date(submittedAt) : new Date();
  const decisionDateObj = new Date(submitDateObj.getTime() + 2 * 24 * 60 * 60 * 1000);
  const decisionDateFormatted = decisionDateObj.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const handleSaveStoreName = () => {
    setStoreProfile({ storeName: storeNameInput });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleLogout = async () => {
    try {
      const { logout } = await import("@/lib/api/auth");
      await logout();
    } catch (err) {
      console.error("Sign out error", err);
    }
    useVendorStore.getState().resetVendorState();
    router.push("/authpage/signin?role=vendor");
  };

  const crNumber = legalDocs.commercialRegistrationNumber || "2645345354";
  const vatNumber = legalDocs.vatNumber || "426284128418821";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FBFCFC",
        display: "flex",
        fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
      }}
    >
      {/* ── Left Sidebar ── */}
      <aside
        style={{
          width: "248px",
          flexShrink: 0,
          background: "#FFFFFF",
          borderRight: "1px solid #EAEDEC",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        {/* Header section */}
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid #EAEDEC",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Logo + Vendor pill */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <a href="/" style={{ display: "flex", alignItems: "center" }}>
              <img src="/Logo/Logo.svg" alt="Nooi" style={{ height: "20px", width: "auto" }} />
            </a>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#646968",
                background: "#F1F4F4",
                borderRadius: "999px",
                padding: "2px 8px",
              }}
            >
              Vendor
            </span>
          </div>

          {/* Store card */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "#F1F4F4",
              borderRadius: "8px",
              padding: "8px 10px",
            }}
          >
            <span
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                background: "#004643",
                color: "#FFFFFF",
                fontSize: "11px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {storeInitials}
            </span>
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: "#101212",
                }}
              >
                {storeName}
              </span>
              <span style={{ fontSize: "11px", color: "#646968" }}>{fulfillmentType}</span>
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {NAV_ITEMS.map((item) => {
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNav(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 10px",
                  borderRadius: "8px",
                  border: "none",
                  background: active ? "#F3FEFD" : "transparent",
                  color: active ? "#004643" : "#4B4F4F",
                  fontSize: "14px",
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", color: active ? "#004643" : "#8E9493" }}>
                  <NavIcon name={item.icon} />
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Profile & Logout */}
        <div
          style={{
            marginTop: "auto",
            padding: "14px 16px",
            borderTop: "1px solid #EAEDEC",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
            <span
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "999px",
                background: "#004643",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {ownerInitials}
            </span>
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#101212",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {ownerName}
              </span>
              <span style={{ fontSize: "11px", color: "#646968" }}>Owner</span>
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              background: "#F8FAF9",
              border: "1px solid #E5E7EB",
              borderRadius: "6px",
              padding: "5px 8px",
              fontSize: "11px",
              fontWeight: 500,
              color: "#4B4F4F",
              cursor: "pointer",
              transition: "all 0.15s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#DC2626";
              e.currentTarget.style.borderColor = "#FCA5A5";
              e.currentTarget.style.background = "#FEF2F2";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#4B4F4F";
              e.currentTarget.style.borderColor = "#E5E7EB";
              e.currentTarget.style.background = "#F8FAF9";
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Top Header */}
        <header
          style={{
            height: "60px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "0 24px",
            background: "#FFFFFF",
            borderBottom: "1px solid #EAEDEC",
            position: "sticky",
            top: 0,
            zIndex: 5,
          }}
        >
          {/* Search bar */}
          <div
            style={{
              flex: 1,
              maxWidth: "360px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "1px solid #D5DBDA",
              borderRadius: "8px",
              padding: "7px 12px",
              color: "#8E9493",
              fontSize: "13px",
              background: "#FFFFFF",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span style={{ color: "#8E9493" }}>Search orders, products</span>
            <span style={{ marginLeft: "auto", fontSize: "11px", color: "#8E9493" }}>⌘K</span>
          </div>

          <div style={{ flex: 1 }}></div>

          {/* Notifications */}
          <button
            type="button"
            aria-label="Notifications"
            style={{
              background: "none",
              border: "1px solid #EAEDEC",
              borderRadius: "8px",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#343837",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </button>

          {/* New Listing Button */}
          <button
            type="button"
            style={{
              background: "#004643",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              padding: "9px 14px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + New listing
          </button>
        </header>

        {/* Main Content Body */}
        <main
          style={{
            flex: 1,
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            maxWidth: "1280px",
            width: "100%",
          }}
        >
          {/* Application in review banner */}
          <div
            style={{
              background: "#FFFBF2",
              border: "1px solid #F7DFAD",
              borderRadius: "12px",
              padding: "14px 16px",
              display: "flex",
              gap: "12px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "1 1 260px", fontSize: "13px", color: "#563D00" }}>
              <strong style={{ color: "#563D00" }}>Application in review.</strong> Decision expected by{" "}
              {decisionDateFormatted}. Listing, orders and payouts unlock after approval.
            </div>
            <button
              type="button"
              onClick={() => router.push("/sell/submitted")}
              style={{
                background: "#FFFFFF",
                border: "1px solid #D5DBDA",
                borderRadius: "8px",
                padding: "7px 12px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#343837",
                cursor: "pointer",
              }}
            >
              View application
            </button>
          </div>

          {/* ── SECTION 1: DASHBOARD ── */}
          {activeNav === "dashboard" && (
            <>
              <div>
                <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "#101212" }}>
                  Good afternoon, {ownerFirstName}
                </h1>
                <p style={{ margin: "2px 0 0", color: "#646968", fontSize: "14px" }}>
                  Here&apos;s what needs you today.
                </p>
              </div>

              {/* "Get your store ready" card */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #EAEDEC",
                  borderRadius: "12px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  maxWidth: "640px",
                }}
              >
                <div style={{ fontSize: "16px", fontWeight: 600, color: "#101212" }}>
                  Get your store ready
                </div>
                <div style={{ fontSize: "14px", color: "#4B4F4F", lineHeight: 1.5 }}>
                  Add your delivery regions and store details now, so you can list the moment you&apos;re
                  approved.
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => router.push("/sell/onboarding?step=2")}
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
                    Set up store profile
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── SECTION 2: ORDERS ── */}
          {activeNav === "orders" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "#101212" }}>Orders</h1>
                <p style={{ margin: "2px 0 0", color: "#646968", fontSize: "14px" }}>
                  Overdue orders are pinned to the top.
                </p>
              </div>
            </div>
          )}

          {/* ── SECTION 3: PRODUCTS ── */}
          {activeNav === "products" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "#101212" }}>Products</h1>
                  <p style={{ margin: "2px 0 0", color: "#646968", fontSize: "14px" }}>
                    Title and image edits go to review; price and lead time publish immediately.
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", color: "#646968" }}>Available after your application is approved</span>
                  <button
                    type="button"
                    style={{
                      background: "#FFFFFF",
                      color: "#343837",
                      border: "1px solid #D5DBDA",
                      borderRadius: "8px",
                      padding: "9px 14px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "not-allowed",
                      opacity: 0.6,
                    }}
                  >
                    Upload spreadsheet
                  </button>
                  <button
                    type="button"
                    style={{
                      background: "#004643",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "8px",
                      padding: "9px 14px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "not-allowed",
                      opacity: 0.6,
                    }}
                  >
                    + New listing
                  </button>
                </div>
              </div>

              {/* No listings yet dashed card */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px dashed #D5DBDA",
                  borderRadius: "12px",
                  padding: "48px 24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#101212" }}>No listings yet</div>
                <div style={{ fontSize: "13px", color: "#646968", maxWidth: "360px" }}>
                  Create your first listing. It goes live after a quick review.
                </div>
              </div>

              {/* Filter & tabs */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    background: "#F1F4F4",
                    borderRadius: "10px",
                    padding: "4px",
                    alignSelf: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    { id: "all", label: "All 0" },
                    { id: "live", label: "Live 0" },
                    { id: "pending", label: "Pending review 0" },
                    { id: "changes", label: "Changes requested 0" },
                    { id: "draft", label: "Draft 0" },
                    { id: "deactivated", label: "Deactivated 0" },
                  ].map((tab, idx) => (
                    <button
                      key={tab.id}
                      type="button"
                      style={{
                        border: "none",
                        background: idx === 0 ? "#FFFFFF" : "transparent",
                        boxShadow: idx === 0 ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                        color: idx === 0 ? "#101212" : "#646968",
                        borderRadius: "7px",
                        padding: "6px 12px",
                        fontSize: "13px",
                        fontWeight: idx === 0 ? 600 : 500,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    placeholder="Search title or SKU"
                    style={{
                      flex: "1 1 200px",
                      maxWidth: "280px",
                      padding: "8px 12px",
                      border: "1px solid #D5DBDA",
                      borderRadius: "8px",
                      fontSize: "13px",
                      background: "#FFFFFF",
                      outline: "none",
                    }}
                  />
                  <select
                    aria-label="Category"
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #D5DBDA",
                      borderRadius: "8px",
                      fontSize: "13px",
                      background: "#FFFFFF",
                      color: "#343837",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option>All categories</option>
                  </select>
                  <select
                    aria-label="Type"
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #D5DBDA",
                      borderRadius: "8px",
                      fontSize: "13px",
                      background: "#FFFFFF",
                      color: "#343837",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option>All types</option>
                  </select>
                  <select
                    aria-label="Sort"
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #D5DBDA",
                      borderRadius: "8px",
                      fontSize: "13px",
                      background: "#FFFFFF",
                      color: "#343837",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option>Recently updated</option>
                  </select>
                </div>
              </div>

              {/* Table Header */}
              <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: "12px", overflow: "hidden" }}>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "12px 20px",
                    background: "#FBFCFC",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#646968",
                  }}
                >
                  <span style={{ flex: "1 1 260px" }}>Listing</span>
                  <span style={{ flex: "0 0 150px" }}>Category · type</span>
                  <span style={{ flex: "0 0 120px" }}>Status</span>
                  <span style={{ flex: "0 0 100px" }}>Price</span>
                  <span style={{ flex: "0 0 100px" }}>Lead time</span>
                  <span style={{ flex: "0 0 100px" }}>Updated</span>
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 4: RETURNS ── */}
          {activeNav === "returns" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "#101212" }}>Returns</h1>
                <p style={{ margin: "2px 0 0", color: "#646968", fontSize: "14px" }}>
                  Shopper claims on your orders. Returns are per item, not per order.
                </p>
              </div>
            </div>
          )}

          {/* ── SECTION 5: PAYMENTS ── */}
          {activeNav === "payments" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "#101212" }}>Payments</h1>
                  <span style={{ fontSize: "13px", color: "#646968" }}>
                    Bank account, payouts and withdrawals are managed in Stripe.
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      background: "#EAF7F5",
                      color: "#004643",
                      fontSize: "13px",
                      fontWeight: 500,
                      padding: "6px 14px",
                      borderRadius: "999px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Connected
                  </span>
                  <a
                    href="https://connect.stripe.com/express_login"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      height: "40px",
                      padding: "0 16px",
                      border: "1px solid #D5DBDA",
                      borderRadius: "8px",
                      background: "#FFFFFF",
                      color: "#101212",
                      fontSize: "14px",
                      fontWeight: 500,
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Stripe Dashboard
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h6v6" />
                      <path d="M10 14 21 3" />
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Earnings card */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #EAEDEC",
                  borderRadius: "16px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "14px", color: "#4B4F4F" }}>Earnings over time</span>
                    <span style={{ fontSize: "24px", fontWeight: 700, color: "#101212" }}>SAR 0</span>
                    <span style={{ fontSize: "12px", color: "#8E9493" }}>Net of commission and refunds · All time</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    {/* Per period / Cumulative toggle */}
                    <div
                      role="group"
                      aria-label="Chart mode"
                      style={{ display: "flex", border: "1px solid #D5DBDA", borderRadius: "8px", overflow: "hidden", background: "#F1F4F4" }}
                    >
                      <button
                        type="button"
                        style={{
                          height: "34px",
                          padding: "0 14px",
                          border: "none",
                          background: "#FFFFFF",
                          color: "#101212",
                          fontSize: "13px",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Per period
                      </button>
                      <button
                        type="button"
                        style={{
                          height: "34px",
                          padding: "0 14px",
                          border: "none",
                          background: "transparent",
                          color: "#646968",
                          fontSize: "13px",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Cumulative
                      </button>
                    </div>

                    {/* Dropdowns */}
                    <select
                      style={{
                        height: "34px",
                        padding: "0 12px",
                        border: "1px solid #D5DBDA",
                        borderRadius: "8px",
                        background: "#FFFFFF",
                        fontSize: "13px",
                        color: "#343837",
                        cursor: "pointer",
                        outline: "none",
                      }}
                    >
                      <option>Weekly</option>
                      <option>Monthly</option>
                    </select>
                    <select
                      style={{
                        height: "34px",
                        padding: "0 12px",
                        border: "1px solid #D5DBDA",
                        borderRadius: "8px",
                        background: "#FFFFFF",
                        fontSize: "13px",
                        color: "#343837",
                        cursor: "pointer",
                        outline: "none",
                      }}
                    >
                      <option>All time</option>
                      <option>Last 30 days</option>
                    </select>
                  </div>
                </div>

                {/* Dashed empty state box */}
                <div
                  style={{
                    border: "1px dashed #D5DBDA",
                    borderRadius: "12px",
                    padding: "48px 24px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "15px", fontWeight: 600, color: "#101212" }}>No earnings yet</span>
                  <span style={{ fontSize: "13px", color: "#646968", maxWidth: "380px" }}>
                    Earnings show here once orders are delivered. Payouts land in the bank account you added in Stripe.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 6: SUPPORT ── */}
          {activeNav === "support" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "#101212" }}>Support</h1>
                  <p style={{ margin: "2px 0 0", color: "#646968", fontSize: "14px" }}>
                    Conversations with the Nooi team. Replies within 1 business day.
                  </p>
                </div>
                <button
                  type="button"
                  style={{
                    background: "#004643",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "8px",
                    padding: "9px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  New message
                </button>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: "12px", overflow: "hidden" }}>
                {/* Thread 1 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "16px 20px",
                    borderBottom: "1px solid #F1F4F4",
                  }}
                >
                  <div style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#101212" }}>
                      Cancellation request - NO-10477
                    </span>
                    <span style={{ fontSize: "12px", color: "#646968", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      Thanks. We have asked the shopper whether they will wait until 28 Oct. Keep the order on hold until we reply.
                    </span>
                  </div>
                  <span style={{ flex: "0 1 110px", fontSize: "12px", color: "#4B4F4F" }}>Cancellation</span>
                  <span style={{ flex: "0 1 160px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        background: "#EAF7F5",
                        color: "#00635E",
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "999px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: "#00635E" }} />
                      With Nooi admin
                    </span>
                  </span>
                  <span style={{ flex: "0 1 90px", fontSize: "12px", color: "#646968", textAlign: "right" }}>Yesterday</span>
                </div>

                {/* Thread 2 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "16px 20px",
                  }}
                >
                  <div style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#101212" }}>
                      Second outlet registration
                    </span>
                    <span style={{ fontSize: "12px", color: "#646968", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      Done — Jeddah is now linked as an outlet of Atelier Rawda. Listings stay under one store.
                    </span>
                  </div>
                  <span style={{ flex: "0 1 110px", fontSize: "12px", color: "#4B4F4F" }}>Account</span>
                  <span style={{ flex: "0 1 160px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        background: "#F4FFF6",
                        color: "#28603A",
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "999px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: "#28603A" }} />
                      Resolved
                    </span>
                  </span>
                  <span style={{ flex: "0 1 90px", fontSize: "12px", color: "#646968", textAlign: "right" }}>12 Sep</span>
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 7: SETTINGS ── */}
          {activeNav === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "760px" }}>
              <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "#101212" }}>Settings</h1>

              {/* Settings Tabs */}
              <div style={{ display: "flex", gap: "20px", borderBottom: "1px solid #EAEDEC", overflowX: "auto" }}>
                <button
                  type="button"
                  onClick={() => setSettingsTab("profile")}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom: settingsTab === "profile" ? "2px solid #004643" : "2px solid transparent",
                    color: settingsTab === "profile" ? "#004643" : "#646968",
                    padding: "10px 0",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Store profile
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab("legal")}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom: settingsTab === "legal" ? "2px solid #004643" : "2px solid transparent",
                    color: settingsTab === "legal" ? "#004643" : "#646968",
                    padding: "10px 0",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Legal documents
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab("payout")}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom: settingsTab === "payout" ? "2px solid #004643" : "2px solid transparent",
                    color: settingsTab === "payout" ? "#004643" : "#646968",
                    padding: "10px 0",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Payout account
                </button>
              </div>

              {/* Subtab 1: Store profile */}
              {settingsTab === "profile" && (
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #EAEDEC",
                    borderRadius: "12px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 500, color: "#343837" }}>
                    Store name
                    <input
                      type="text"
                      value={storeNameInput}
                      onChange={(e) => setStoreNameInput(e.target.value)}
                      style={{
                        padding: "10px 14px",
                        border: "1px solid #D5DBDA",
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: "#FFFFFF",
                        color: "#101212",
                        outline: "none",
                      }}
                    />
                  </label>

                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 500, color: "#343837" }}>
                    Fulfilment type
                    <div
                      style={{
                        padding: "10px 14px",
                        border: "1px solid #EAEDEC",
                        background: "#FBFCFC",
                        borderRadius: "8px",
                        fontSize: "14px",
                        color: "#4B4F4F",
                      }}
                    >
                      {fulfillmentType} · change via vendor support (affects open orders)
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", fontWeight: 500, color: "#343837" }}>
                    Delivery regions
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ border: "1px solid #004643", background: "#F3FEFD", color: "#004643", borderRadius: "999px", padding: "4px 12px", fontSize: "13px" }}>
                        Riyadh
                      </span>
                      <span style={{ border: "1px solid #004643", background: "#F3FEFD", color: "#004643", borderRadius: "999px", padding: "4px 12px", fontSize: "13px" }}>
                        Jeddah
                      </span>
                      <span style={{ border: "1px solid #004643", background: "#F3FEFD", color: "#004643", borderRadius: "999px", padding: "4px 12px", fontSize: "13px" }}>
                        Eastern Province
                      </span>
                      <span style={{ border: "1px solid #D5DBDA", color: "#4B4F4F", borderRadius: "999px", padding: "4px 12px", fontSize: "13px", cursor: "pointer" }}>
                        + Add region
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                    <button
                      type="button"
                      onClick={handleSaveStoreName}
                      style={{
                        alignSelf: "flex-start",
                        background: "#004643",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: "8px",
                        padding: "9px 16px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Save changes
                    </button>
                    {savedSuccess && <span style={{ fontSize: "13px", color: "#28603A" }}>✓ Changes saved</span>}
                  </div>
                </div>
              )}

              {/* Subtab 2: Legal documents */}
              {settingsTab === "legal" && (
                <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: "12px", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: "16px 20px" }}>
                    <span style={{ flex: "1 1 220px", display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#101212" }}>Commercial registration</span>
                      <span style={{ fontSize: "12px", color: "#646968", marginTop: "2px" }}>{crNumber} · Expires 14 Mar 2028</span>
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        background: "#F4FFF6",
                        color: "#28603A",
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "999px",
                      }}
                    >
                      <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: "#28603A" }} />
                      Valid
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: "16px 20px", borderTop: "1px solid #F1F4F4" }}>
                    <span style={{ flex: "1 1 220px", display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#101212" }}>VAT registration</span>
                      <span style={{ fontSize: "12px", color: "#646968", marginTop: "2px" }}>{vatNumber} · No expiry</span>
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        background: "#F4FFF6",
                        color: "#28603A",
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "999px",
                      }}
                    >
                      <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: "#28603A" }} />
                      Valid
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: "16px 20px", borderTop: "1px solid #F1F4F4" }}>
                    <span style={{ flex: "1 1 220px", display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#101212" }}>Authorised signatory ID</span>
                      <span style={{ fontSize: "12px", color: "#646968", marginTop: "2px" }}>{ownerName} · Expires 2 Feb 2030</span>
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        background: "#F4FFF6",
                        color: "#28603A",
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "999px",
                      }}
                    >
                      <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: "#28603A" }} />
                      Valid
                    </span>
                  </div>
                </div>
              )}

              {/* Subtab 3: Payout account */}
              {settingsTab === "payout" && (
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #EAEDEC",
                    borderRadius: "12px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "15px", fontWeight: 600, color: "#101212" }}>Payout account</span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        background: "#EAF7F5",
                        color: "#004643",
                        fontSize: "13px",
                        fontWeight: 500,
                        padding: "6px 14px",
                        borderRadius: "999px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Connected
                    </span>
                  </div>

                  <span style={{ fontSize: "13px", color: "#4B4F4F", lineHeight: 1.5 }}>
                    Your bank account, payout schedule and withdrawals are managed in Stripe.
                  </span>

                  <div style={{ display: "flex", marginTop: "4px" }}>
                    <a
                      href="https://connect.stripe.com/express_login"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "10px",
                        height: "40px",
                        padding: "0 18px",
                        border: "1px solid #D5DBDA",
                        borderRadius: "8px",
                        background: "#FFFFFF",
                        color: "#101212",
                        fontSize: "14px",
                        fontWeight: 500,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Stripe Dashboard
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6" />
                        <path d="M10 14 21 3" />
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}

              {/* Vendor Account & Session Section */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #EAEDEC",
                  borderRadius: "12px",
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  flexWrap: "wrap",
                  marginTop: "16px",
                }}
              >
                <div>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#101212", display: "block" }}>Vendor Account Session</span>
                  <span style={{ fontSize: "12px", color: "#646968", marginTop: "2px", display: "block" }}>
                    Signed in as {ownerName} ({accountData.workEmail || "Vendor"})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#FFF1F2",
                    color: "#E11D48",
                    border: "1px solid #FECDD3",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#FEE2E2";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#FFF1F2";
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Log out of Vendor Dashboard</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
