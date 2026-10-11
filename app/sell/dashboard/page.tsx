"use client";

import { useEffect, useState, useCallback } from "react";
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

export type VendorJourneyStage = "pending" | "new_vendor" | "established";

export default function VendorDashboardPage() {
  const router = useRouter();
  const storeProfile = useVendorStore((state) => state.storeProfile);
  const setStoreProfile = useVendorStore((state) => state.setStoreProfile);
  const accountData = useVendorStore((state) => state.accountData);
  const legalDocs = useVendorStore((state) => state.legalDocs);
  const submittedAt = useVendorStore((state) => state.submittedAt);
  const applicationStatus = useVendorStore((state) => state.applicationStatus);
  const stripeConnected = useVendorStore((state) => state.stripeConnected);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [settingsTab, setSettingsTab] = useState<"profile" | "legal" | "payout">("profile");
  const [mounted, setMounted] = useState(false);
  const [storeNameInput, setStoreNameInput] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Vendor journey lifecycle state (Pending review, New vendor approved, Established vendor)
  const [vendorStage, setVendorStage] = useState<VendorJourneyStage>("established");
  const [journeyPanelOpen, setJourneyPanelOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  // Products list state
  const [products, setProducts] = useState<Array<{
    id: string;
    title: string;
    cat: string;
    kind: string;
    price: string;
    stock: string;
    vars: Array<{ id: string; name: string; sku: string; stock: string }>;
    imgCount: number;
    status: "pending_review" | "live" | "changes_requested" | "draft" | "deactivated";
    updatedAt: Date;
  }>>([]);
  const [prodTab, setProdTab] = useState<"all" | "live" | "pending" | "changes" | "draft" | "deactivated">("all");
  const [prodSearch, setProdSearch] = useState("");
  const [prodCatFilter, setProdCatFilter] = useState("All categories");
  const [prodTypeFilter, setProdTypeFilter] = useState("All types");

  // New Listing Drawer State
  const [isNewListingOpen, setIsNewListingOpen] = useState(false);
  const [nlStep, setNlStep] = useState(0);
  const [nlTitle, setNlTitle] = useState("");
  const [nlCat, setNlCat] = useState("Choose");
  const [nlKind, setNlKind] = useState("Made to order");
  const [nlPrice, setNlPrice] = useState("");
  const [nlStock, setNlStock] = useState("");
  const [nlVars, setNlVars] = useState<Array<{ id: string; name: string; sku: string; stock: string }>>([
    { id: "1", name: "Standard", sku: "", stock: "" },
  ]);
  const [nlImgs, setNlImgs] = useState<Array<"ok" | "u" | "f" | "e">>(["e", "e", "e", "e", "e", "e"]);
  const [nlErr, setNlErr] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── ORDER TYPES ──────────────────────────────────────────────────────────
  type OrderStatus = "paid" | "materials" | "production" | "qc" | "ready" | "processing" | "shipped" | "delivered" | "rts";
  interface OrderLine {
    n: string; // name
    q: number; // qty
    p: number; // unit price
    d: string; // ship date label
    m?: string; // material
    c?: string; // colour
    dims?: string; // custom dimensions
    now?: number; // updated price
  }
  interface VendorOrder {
    id: string;
    placed: string;
    cust: string;
    city: string;
    value: number;
    due: string;
    overdue: boolean;
    status: OrderStatus;
    tracking?: string;
    addr?: { from: string; to: string; auto: boolean };
    lines: OrderLine[];
  }

  // ── SAMPLE ORDERS (from template) ────────────────────────────────────────
  const mkSampleOrders = (factory: boolean): VendorOrder[] => [
    { id: "NO-10482", placed: "18 Sep", cust: "Faisal M.", city: "Jeddah", value: 8450, due: "24 Sep", overdue: true,  status: factory ? "production" : "processing", addr: { from: "Al Rawdah, Jeddah 23434", to: "Al Shati, Jeddah 23513", auto: false }, lines: [{ n: "Linen 3-seat sofa, sand", q: 1, p: 6200, d: factory ? "Ships 2 Oct" : "Ships 24 Sep", m: "Linen", c: "Sand" }, { n: "Oak side table", q: 2, p: 1125, d: factory ? "Ships 2 Oct" : "Ships 24 Sep", m: "Oak", c: "Natural" }] },
    { id: "NO-10477", placed: "17 Sep", cust: "Noura A.", city: "Riyadh", value: 3900, due: "25 Sep", overdue: true,  status: "paid", addr: { from: "Al Olaya, Riyadh 12211", to: "Al Malqa, Riyadh 13521", auto: true }, lines: [{ n: "Walnut dining bench", q: 1, p: 3900, d: factory ? "Ships 16 Oct" : "Ships 25 Sep", m: "Walnut", c: "Oiled" }] },
    { id: "NO-10491", placed: "21 Sep", cust: "Omar K.", city: "Dammam",  value: 12600, due: "29 Sep", overdue: false, status: factory ? "materials" : "paid", lines: [{ n: "Oak dining table, 8 seats", q: 1, p: 9800, d: factory ? "Ships 20 Oct" : "Ships 29 Sep", m: "Oak", c: "Natural", dims: "Custom 240 × 100 × 75 cm", now: 10400 }, { n: "Wool rug 200×300", q: 1, p: 2800, d: "Ships 29 Sep" }] },
    { id: "NO-10495", placed: "23 Sep", cust: "Lama S.", city: "Riyadh",  value: 2150, due: "30 Sep", overdue: false, status: factory ? "qc" : "processing", lines: [{ n: "Rattan lounge chair", q: 1, p: 2150, d: "Ships 30 Sep", m: "Rattan", c: "Natural" }] },
    { id: "NO-10459", placed: "10 Sep", cust: "Sara B.", city: "Madinah", value: 2400, due: "17 Sep", overdue: false, status: "rts", tracking: "SMSA 2903 4410 02", lines: [{ n: "Pine console", q: 1, p: 2400, d: "Returned to warehouse 24 Sep", m: "Pine", c: "Natural" }] },
    { id: "NO-10466", placed: "12 Sep", cust: "Hessa T.", city: "Khobar",  value: 5400, due: "19 Sep", overdue: false, status: "shipped", tracking: "SMSA 2903 5512 88", lines: [{ n: "Linen armchair, olive", q: 2, p: 2700, d: "Shipped 19 Sep", m: "Linen", c: "Olive" }] },
    { id: "NO-10451", placed: "4 Sep",  cust: "Yousef R.", city: "Riyadh", value: 7200, due: "11 Sep", overdue: false, status: "delivered", lines: [{ n: "Ash bookshelf", q: 1, p: 7200, d: "Delivered 13 Sep" }] },
  ];

  // ── ORDER STATE ───────────────────────────────────────────────────────────
  const isFactory = (storeProfile.fulfillmentType || "Factory").toLowerCase() !== "retailer";
  const [orders, setOrders] = useState<VendorOrder[]>(() => mkSampleOrders(isFactory));
  const [orderTab, setOrderTab] = useState<"To fulfil" | "Shipped" | "Delivered" | "All">("To fulfil");
  const [selectedOrderIds, setSelectedOrderIds] = useState<Record<string, boolean>>({});
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [trackingErr, setTrackingErr] = useState("");
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelErr, setCancelErr] = useState("");
  const [showPackingModal, setShowPackingModal] = useState(false);
  const [packingExported, setPackingExported] = useState(false);

  // ── ORDER HELPERS ─────────────────────────────────────────────────────────
  const FLOW_FACTORY: OrderStatus[] = ["paid", "materials", "production", "qc", "ready", "shipped", "delivered"];
  const FLOW_RETAILER: OrderStatus[] = ["paid", "processing", "shipped", "delivered"];
  const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
    paid: "Start processing",
    materials: "Mark in production",
    production: "Send to quality check",
    qc: "Mark ready to ship",
    processing: "Add tracking and ship",
    ready: "Add tracking and ship",
  };
  const ST_BADGE: Record<OrderStatus | "rts", { bg: string; fg: string; dot: string; label: string }> = {
    paid:       { bg: "#F3FEFD", fg: "#004643", dot: "#36817C", label: "Paid" },
    materials:  { bg: "#F0FFFE", fg: "#004743", dot: "#00817B", label: "Materials" },
    production: { bg: "#F0FFFE", fg: "#004743", dot: "#00817B", label: "In production" },
    qc:         { bg: "#F0FFFE", fg: "#004743", dot: "#00817B", label: "Quality check" },
    ready:      { bg: "#F0FFFE", fg: "#004743", dot: "#00817B", label: "Ready to ship" },
    processing: { bg: "#F0FFFE", fg: "#004743", dot: "#00817B", label: "Processing" },
    shipped:    { bg: "#F1F4F4", fg: "#343837", dot: "#8E9493", label: "Shipped" },
    delivered:  { bg: "#F4FFF6", fg: "#124525", dot: "#437E54", label: "Delivered" },
    rts:        { bg: "#FFFAF9", fg: "#812F28", dot: "#A0483E", label: "Returned to sender" },
  };
  const sar = (n: number) => "SAR " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const oFilter: Record<string, (o: VendorOrder) => boolean> = {
    "To fulfil": (o) => !["shipped", "delivered", "rts"].includes(o.status),
    "Shipped": (o) => o.status === "shipped",
    "Delivered": (o) => o.status === "delivered",
    "All": () => true,
  };

  const pinned = (arr: VendorOrder[]) => [...arr].sort((a, b) => (b.overdue ? 1 : 0) - (a.overdue ? 1 : 0));

  const advanceOrder = (o: VendorOrder) => {
    const flow = isFactory ? FLOW_FACTORY : FLOW_RETAILER;
    const idx = flow.indexOf(o.status);
    const next = flow[idx + 1];
    if (!next) return;
    if (next === "shipped") {
      const t = trackingInput.replace(/\s/g, "");
      if (t.length < 10) { setTrackingErr("The carrier doesn't recognise this tracking number. Status not advanced — check the number and try again."); return; }
    }
    setOrders(prev => prev.map(x => x.id === o.id ? { ...x, status: next, overdue: false, tracking: next === "shipped" ? trackingInput : x.tracking } : x));
    setTrackingInput("");
    setTrackingErr("");
    showToast(`${o.id} moved to ${ST_BADGE[next as OrderStatus].label}. Shopper notified.`);
  };

  const selN = Object.keys(selectedOrderIds).length;
  const selOrders = orders.filter(x => selectedOrderIds[x.id]);
  const openOrder = orders.find(x => x.id === openOrderId) ?? null;

  // Build packing groups from selected orders
  const buildPackingGroups = () => {
    const agg: Record<string, { n: string; m: string; c: string; q: number; ords: string[] }> = {};
    const flagged: { ord: string; n: string; q: number }[] = [];
    const custom: { ord: string; n: string; q: number; m: string; c: string; dims: string }[] = [];
    selOrders.forEach(o => o.lines.forEach(l => {
      if (!l.m) { flagged.push({ ord: o.id, n: l.n, q: l.q }); return; }
      if (l.dims) { custom.push({ ord: o.id, n: l.n, q: l.q, m: l.m!, c: l.c!, dims: l.dims }); return; }
      const k = `${l.n}|${l.m}|${l.c}`;
      if (!agg[k]) agg[k] = { n: l.n, m: l.m!, c: l.c!, q: 0, ords: [] };
      agg[k].q += l.q;
      agg[k].ords.push(o.id);
    }));
    const groups: Record<string, { n: string; q: number; ordsL: string }[]> = {};
    Object.values(agg).forEach(a => {
      const g = `${a.m} · ${a.c}`;
      if (!groups[g]) groups[g] = [];
      groups[g].push({ n: a.n, q: a.q, ordsL: a.ords.join(", ") });
    });
    return { groups: Object.entries(groups).map(([g, items]) => ({ g, items })), flagged, custom };
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);

  // Authoritative sync with database vendor_profiles row
  const syncVendorStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/vendor/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workEmail: accountData.workEmail,
          businessName: accountData.businessName,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.vendor) {
        const v = data.data.vendor;
        if (v.verified_at) setVerifiedAt(v.verified_at);
        if (v.decided_at && !v.verified_at) setVerifiedAt(v.decided_at);
        if (v.store_name && !storeProfile.storeName) {
          setStoreProfile({ storeName: v.store_name });
        }
        if (v.payout_connected) {
          useVendorStore.getState().setStripeConnected(true);
        }

        if (v.status === "approved") {
          useVendorStore.getState().setApplicationStatus("approved");
          // If approved: new_vendor checklist if no live products yet, established if products exist
          setVendorStage((prev) => {
            const nextStage = products.length > 0 ? "established" : "new_vendor";
            localStorage.setItem("nooi-vendor-stage", nextStage);
            return nextStage;
          });
        } else if (v.status === "pending") {
          useVendorStore.getState().setApplicationStatus("submitted");
          setVendorStage("pending");
          localStorage.setItem("nooi-vendor-stage", "pending");
        } else if (v.status === "rejected") {
          useVendorStore.getState().setApplicationStatus("rejected");
        }
      }
    } catch (err) {
      console.warn("[Dashboard] Failed to sync vendor status:", err);
    }
  }, [accountData.workEmail, accountData.businessName, storeProfile.storeName, products.length, setStoreProfile]);

  const syncVendorListingsAndOrders = useCallback(async () => {
    try {
      const email = accountData.workEmail;
      const businessName = accountData.businessName || storeProfile.storeName;
      const params = new URLSearchParams();
      if (email) params.set("email", email);
      if (businessName) params.set("businessName", businessName);

      // 1. Sync live listings
      const resListings = await fetch(`/api/vendor/listings?${params.toString()}`);
      if (resListings.ok) {
        const data = await resListings.json();
        if (data.success && Array.isArray(data.products) && data.products.length > 0) {
          const apiProducts = data.products.map((p: any) => ({
            id: p.id,
            title: p.title,
            cat: p.category || "General",
            kind: p.specs_json?.kind || "Made to order",
            price: String(p.base_price),
            stock: String(p.specs_json?.stock || "10"),
            vars: (p.product_variants || []).map((v: any) => ({
              id: v.id,
              name: v.color || "Standard",
              sku: v.sku || "",
              stock: String(v.stock_quantity || "10"),
            })),
            imgCount: (p.product_variants?.[0]?.images || []).length || 1,
            status: "live" as const,
            updatedAt: new Date(p.created_at || Date.now()),
          }));
          setProducts((prev) => {
            const apiIds = new Set(apiProducts.map((p: any) => p.id));
            const uniquePrev = prev.filter((p) => !apiIds.has(p.id));
            return [...apiProducts, ...uniquePrev];
          });
        }
      }

      // 2. Sync vendor orders
      const resOrders = await fetch(`/api/vendor/orders?${params.toString()}`);
      if (resOrders.ok) {
        const ordData = await resOrders.json();
        if (ordData.success && Array.isArray(ordData.orders) && ordData.orders.length > 0) {
          setOrders((prev) => {
            const existingIds = new Set(ordData.orders.map((o: any) => o.id));
            const samples = prev.filter((o) => !existingIds.has(o.id));
            return [...ordData.orders, ...samples];
          });
        }
      }
    } catch (err) {
      console.warn("[Dashboard] Sync listings/orders error:", err);
    }
  }, [accountData.workEmail, accountData.businessName, storeProfile.storeName]);

  useEffect(() => {
    useVendorStore.persist.rehydrate();
    setMounted(true);
    if (typeof window !== "undefined") {
      const savedStage = localStorage.getItem("nooi-vendor-stage") as VendorJourneyStage;
      if (savedStage && ["pending", "new_vendor", "established"].includes(savedStage)) {
        setVendorStage(savedStage);
      } else if (applicationStatus === "approved") {
        setVendorStage("new_vendor");
      } else if (applicationStatus === "submitted" || applicationStatus === "draft") {
        setVendorStage("pending");
      }
    }
    // Perform live sync with database immediately
    syncVendorStatus();
    syncVendorListingsAndOrders();

    // While pending or active, poll database for status, listings and orders
    const pollInterval = setInterval(() => {
      syncVendorStatus();
      syncVendorListingsAndOrders();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [applicationStatus, syncVendorStatus, syncVendorListingsAndOrders]);

  const handleSelectStage = (stage: VendorJourneyStage) => {
    setVendorStage(stage);
    if (typeof window !== "undefined") {
      localStorage.setItem("nooi-vendor-stage", stage);
    }
  };

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

  const handleOpenNewListing = () => {
    setNlStep(0);
    setNlTitle("");
    setNlCat("Choose");
    setNlKind(fulfillmentType === "Factory" ? "Made to order" : "In stock");
    setNlPrice("");
    setNlStock("");
    setNlVars([{ id: "1", name: "Standard", sku: "", stock: "" }]);
    setNlImgs(["e", "e", "e", "e", "e", "e"]);
    setNlErr("");
    setIsNewListingOpen(true);
  };

  const handleSaveDraft = () => {
    if (nlTitle.trim()) {
      setProducts((prev) => [
        {
          id: String(Date.now()),
          title: nlTitle.trim(),
          cat: nlCat === "Choose" ? "Uncategorised" : nlCat,
          kind: nlKind,
          price: nlPrice,
          stock: nlStock,
          vars: nlVars,
          imgCount: nlImgs.filter((x) => x === "ok").length,
          status: "draft" as const,
          updatedAt: new Date(),
        },
        ...prev,
      ]);
    }
    setIsNewListingOpen(false);
    setToastMessage("Saved as draft. It stays private until you submit it.");
    setTimeout(() => setToastMessage(null), 3800);
  };

  const handlePublishListing = async () => {
    setIsPublishing(true);
    const newId = String(Date.now());
    const newProduct = {
      id: newId,
      title: nlTitle.trim(),
      cat: nlCat === "Choose" ? "Uncategorised" : nlCat,
      kind: nlKind,
      price: nlPrice,
      stock: nlStock,
      vars: nlVars,
      imgCount: nlImgs.filter((x) => x === "ok").length || 1,
      status: "live" as const,
      updatedAt: new Date(),
    };

    setProducts((prev) => [newProduct, ...prev]);

    try {
      const res = await fetch("/api/vendor/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: nlTitle.trim(),
          category: nlCat === "Choose" ? "Sofas" : nlCat,
          type: nlKind,
          price: nlPrice,
          stock: nlStock,
          variants: nlVars,
          images: [
            `https://picsum.photos/seed/${encodeURIComponent(nlTitle.trim())}/800/600`,
          ],
          storeName,
          businessName: accountData.businessName || storeName,
          workEmail: accountData.workEmail,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.product?.id) {
          setProducts((prev) =>
            prev.map((p) => (p.id === newId ? { ...p, id: data.product.id } : p))
          );
        }
      }
    } catch (err) {
      console.warn("[Dashboard] Error publishing listing to API:", err);
    } finally {
      setIsPublishing(false);
      setIsNewListingOpen(false);
      setActiveNav("products");
      setToastMessage("Listing published! Your furniture is now live on the marketplace.");
      setTimeout(() => setToastMessage(null), 4000);
    }
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
            const badgeCount =
              item.id === "orders"
                ? orders.length
                : vendorStage === "established" && item.id === "returns"
                ? 2
                : undefined;

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
                {badgeCount !== undefined && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      background: "#F1F4F4",
                      color: "#343837",
                      borderRadius: "999px",
                      padding: "1px 7px",
                    }}
                  >
                    {badgeCount}
                  </span>
                )}
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
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setBellOpen(!bellOpen)}
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
                position: "relative",
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
              {vendorStage === "established" && (
                <span
                  style={{
                    position: "absolute",
                    top: "6px",
                    right: "7px",
                    width: "7px",
                    height: "7px",
                    borderRadius: "999px",
                    background: "#A0483E",
                  }}
                />
              )}
            </button>

            {bellOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "44px",
                  width: "300px",
                  background: "#FFFFFF",
                  border: "1px solid #EAEDEC",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)",
                  padding: "8px",
                  zIndex: 20,
                }}
              >
                <div style={{ padding: "8px 10px", fontSize: "13px", fontWeight: 600, color: "#101212" }}>
                  Notifications
                </div>
                {vendorStage === "pending" && (
                  <div style={{ padding: "10px", fontSize: "13px", color: "#646968" }}>
                    We&apos;ll notify you here and by email when review is done.
                  </div>
                )}
                {vendorStage === "new_vendor" && (
                  <div style={{ padding: "10px", fontSize: "13px", color: "#646968" }}>
                    No notifications yet. Order and review updates will show here.
                  </div>
                )}
                {vendorStage === "established" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    {[
                      {
                        t: "NO-10495 passed quality check",
                        d: "2 hours ago",
                        go: () => {
                          setActiveNav("orders");
                          setBellOpen(false);
                        },
                      },
                      {
                        t: "Changes requested on Walnut dining bench",
                        d: "Yesterday",
                        go: () => {
                          setActiveNav("products");
                          setBellOpen(false);
                        },
                      },
                      {
                        t: "Payout for 16–31 Aug sent",
                        d: "16 Sep",
                        go: () => {
                          setActiveNav("payments");
                          setBellOpen(false);
                        },
                      },
                    ].map((nt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={nt.go}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          borderRadius: "8px",
                          padding: "10px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#F1F4F4";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "none";
                        }}
                      >
                        <span style={{ fontSize: "13px", color: "#101212", fontWeight: 500 }}>
                          {nt.t}
                        </span>
                        <span style={{ fontSize: "12px", color: "#8E9493" }}>{nt.d}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* New Listing Button */}
          <button
            type="button"
            onClick={() => {
              if (vendorStage === "pending") {
                showToast("Available after your application is approved.");
                return;
              }
              handleOpenNewListing();
            }}
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
          {/* Application in review banner (only in pending review stage) */}
          {vendorStage === "pending" && (
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
          )}

          {/* ── SECTION 1: DASHBOARD ── */}
          {activeNav === "dashboard" && (() => {
            // ── Real-time clock ──
            const now = new Date();
            const hour = now.getHours();
            const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

            // ════════════════════════════════════════════════════════════════════
            // STATE 1: PENDING REVIEW (Image 1)
            // Completed onboarding, awaiting admin's approval
            // ════════════════════════════════════════════════════════════════════
            if (vendorStage === "pending") {
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div>
                    <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "#101212" }}>
                      {greeting}, {ownerFirstName}
                    </h1>
                    <p style={{ margin: "2px 0 0", color: "#646968", fontSize: "14px" }}>
                      Here&apos;s what needs you today.
                    </p>
                  </div>

                  {/* Get your store ready card */}
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
                      Add your delivery regions and store details now, so you can list the moment you&apos;re approved.
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingTop: "4px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveNav("settings");
                          setSettingsTab("profile");
                        }}
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
                </div>
              );
            }

            // ════════════════════════════════════════════════════════════════════
            // STATE 2: APPROVED — FIRST LOGIN (Image 2)
            // Admin approved vendor, 4-step checklist to start selling
            // ════════════════════════════════════════════════════════════════════
            if (vendorStage === "new_vendor") {
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div>
                    <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "#101212" }}>
                      {greeting}, {ownerFirstName}
                    </h1>
                    <p style={{ margin: "2px 0 0", color: "#646968", fontSize: "14px" }}>
                      Here&apos;s what needs you today.
                    </p>
                  </div>

                  {/* 2-Card Grid matching approved vendor design */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                      gap: "20px",
                    }}
                  >
                    {/* Left Card: Start selling */}
                    <div
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #EAEDEC",
                        borderRadius: "12px",
                        padding: "24px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "16px", fontWeight: 600, color: "#101212" }}>
                          Start selling
                        </div>
                        <div style={{ fontSize: "13px", color: "#646968", marginTop: "2px" }}>
                          Four steps to your first order.
                        </div>
                      </div>

                      {/* Step 1: Application approved */}
                      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                        <span
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "999px",
                            border: "1.5px solid #004643",
                            background: "#004643",
                            color: "#FFFFFF",
                            fontSize: "11px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: "1px",
                          }}
                        >
                          ✓
                        </span>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "14px", fontWeight: 600, color: "#343837" }}>
                            Application approved
                          </span>
                          <span style={{ fontSize: "12px", color: "#646968" }}>
                            Approved{" "}
                            {verifiedAt
                              ? new Date(verifiedAt).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "28 Sep 2026"}
                          </span>
                        </div>
                      </div>

                      {/* Step 2: Connect Stripe */}
                      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                        <span
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "999px",
                            border: stripeConnected ? "1.5px solid #004643" : "1.5px solid #B3B9B9",
                            background: stripeConnected ? "#004643" : "#FFFFFF",
                            color: "#FFFFFF",
                            fontSize: "11px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: "1px",
                          }}
                        >
                          {stripeConnected ? "✓" : ""}
                        </span>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "14px", fontWeight: 600, color: "#101212" }}>
                            Connect Stripe
                          </span>
                          <span style={{ fontSize: "12px", color: "#646968" }}>
                            Payouts go to the bank account you add in Stripe
                          </span>
                        </div>
                        {!stripeConnected && (
                          <button
                            type="button"
                            onClick={() => setActiveNav("payments")}
                            style={{
                              background: "#FFFFFF",
                              border: "1px solid #D5DBDA",
                              borderRadius: "8px",
                              padding: "6px 12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              color: "#004643",
                              cursor: "pointer",
                            }}
                          >
                            Start
                          </button>
                        )}
                      </div>

                      {/* Step 3: Create your first listing */}
                      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                        <span
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "999px",
                            border: "1.5px solid #B3B9B9",
                            background: "#FFFFFF",
                            color: "#FFFFFF",
                            fontSize: "11px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: "1px",
                          }}
                        />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "14px", fontWeight: 600, color: "#101212" }}>
                            Create your first listing
                          </span>
                          <span style={{ fontSize: "12px", color: "#646968" }}>
                            Listings are reviewed within 1 business day
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenNewListing}
                          style={{
                            background: "#FFFFFF",
                            border: "1px solid #D5DBDA",
                            borderRadius: "8px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#004643",
                            cursor: "pointer",
                          }}
                        >
                          Start
                        </button>
                      </div>

                      {/* Step 4: Set delivery regions */}
                      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                        <span
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "999px",
                            border: "1.5px solid #B3B9B9",
                            background: "#FFFFFF",
                            color: "#FFFFFF",
                            fontSize: "11px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: "1px",
                          }}
                        />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "14px", fontWeight: 600, color: "#101212" }}>
                            Set delivery regions
                          </span>
                          <span style={{ fontSize: "12px", color: "#646968" }}>
                            Choose where you deliver and your lead times
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveNav("settings");
                            setSettingsTab("profile");
                          }}
                          style={{
                            background: "#FFFFFF",
                            border: "1px solid #D5DBDA",
                            borderRadius: "8px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#004643",
                            cursor: "pointer",
                          }}
                        >
                          Start
                        </button>
                      </div>
                    </div>

                    {/* Right Card: Your first listing */}
                    <div
                      style={{
                        background: "#004643",
                        borderRadius: "12px",
                        padding: "24px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        color: "#FFFFFF",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font-instrument), 'Instrument Serif', serif",
                          fontStyle: "italic",
                          fontSize: "32px",
                          lineHeight: 1.1,
                          letterSpacing: "-0.025em",
                        }}
                      >
                        Your first listing
                      </div>
                      <div style={{ fontSize: "14px", color: "#C3F4F0", lineHeight: 1.5 }}>
                        Listings with a 3D model get placed in shoppers&apos; rooms. Add one with photos, price
                        and lead time; Nooi reviews it within 1 business day.
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenNewListing}
                        style={{
                          marginTop: "auto",
                          alignSelf: "flex-start",
                          background: "#FFFFFF",
                          color: "#004643",
                          border: "none",
                          borderRadius: "8px",
                          padding: "10px 16px",
                          fontSize: "14px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Create listing
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // ════════════════════════════════════════════════════════════════════
            // STATE 3: ESTABLISHED VENDOR (Image 3)
            // Real-time KPIs, charts, orders to fulfil, attention items & breakdown
            // ════════════════════════════════════════════════════════════════════
            const kpiEarnings = 31640.20;
            const kpiListingsLive = products.filter((p) => p.status === "live").length || 4;
            const kpiListingsPending = products.filter((p) => p.status === "pending_review").length || 2;
            const kpiNextPayout = 18902.40;

            const ORDERS = [
              { id: "NO-10482", items: "2 items · Faisal M., Jeddah", dueLabel: "Overdue · due 24 Sep", overdue: true, status: "In production", statusColor: "#F0FFFE", statusText: "#004743", dotColor: "#00817B" },
              { id: "NO-10477", items: "1 item · Noura A., Riyadh",   dueLabel: "Overdue · due 25 Sep", overdue: true, status: "Paid",          statusColor: "#F3FEFD", statusText: "#004643", dotColor: "#36817C" },
              { id: "NO-10491", items: "2 items · Omar K., Dammam",   dueLabel: "Due 29 Sep",           overdue: false, status: "Materials",     statusColor: "#F0FFFE", statusText: "#004743", dotColor: "#00817B" },
              { id: "NO-10495", items: "1 item · Lama S., Riyadh",    dueLabel: "Due 30 Sep",           overdue: false, status: "Quality check",  statusColor: "#F0FFFE", statusText: "#004743", dotColor: "#00817B" },
            ];

            const ALERTS = [
              { id: "a1", title: "Walnut dining bench",       body: "Changes requested: replace image 1", action: "Review",           go: () => { setActiveNav("products"); } },
              { id: "a2", title: "NO-10482 is overdue",      body: "In production · promised 24 Sep",    action: "Open",             go: () => { setActiveNav("orders"); } },
              { id: "a3", title: "Oak dining table capacity", body: "October run 80% booked",             action: "Adjust lead time", go: () => { setActiveNav("products"); } },
            ];

            // Bar chart — last 6 months earnings height percentages from prototype
            const chartMonths = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
            const chartValues = [42, 58, 51, 66, 79, 92];

            // Listings stacked bar data
            const lstLive       = kpiListingsLive;
            const lstPending    = kpiListingsPending;
            const lstChanges    = products.filter((p) => p.status === "changes_requested").length || 1;
            const lstDraft      = products.filter((p) => p.status === "draft").length || 1;
            const lstTotal      = lstLive + lstPending + lstChanges + lstDraft || 8;
            const lstPct        = (n: number) => `${(n / lstTotal * 100).toFixed(1)}%`;

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* ─ Header row ─ */}
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "#101212" }}>
                      {greeting}, {ownerFirstName}
                    </h1>
                    <p style={{ margin: "2px 0 0", color: "#646968", fontSize: "14px" }}>Here&apos;s what needs you today.</p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px", border: "1px solid #D5DBDA", background: "#FFFFFF", borderRadius: "8px", padding: "7px 12px", fontSize: "13px", color: "#343837" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 5h18v16H3zM16 3v4M8 3v4M3 10h18" />
                      </svg>
                      1–30 Sep 2026
                    </span>
                  </div>
                </div>

                {/* ─ KPI cards (4-up) ─ */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                  {/* Net earnings */}
                  <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: "12px", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4B4F4F" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                      <span style={{ fontSize: "13px" }}>Net earnings · September</span>
                    </div>
                    <div style={{ fontSize: "26px", fontWeight: 600, color: "#101212", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
                      SAR 31,640.20
                    </div>
                    <div style={{ fontSize: "12px", color: "#28603A" }}>
                      +12.4% vs August
                    </div>
                  </div>

                  {/* Orders to fulfil */}
                  <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: "12px", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "10px", cursor: "pointer" }}
                    onClick={() => setActiveNav("orders")}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4B4F4F" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>
                      <span style={{ fontSize: "13px" }}>Orders to fulfil</span>
                    </div>
                    <div style={{ fontSize: "26px", fontWeight: 600, color: "#101212", letterSpacing: "-0.01em", lineHeight: 1.1 }}>5</div>
                    <div style={{ fontSize: "12px", color: "#812F28" }}>
                      2 overdue
                    </div>
                  </div>

                  {/* Live listings */}
                  <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: "12px", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "10px", cursor: "pointer" }}
                    onClick={() => setActiveNav("products")}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4B4F4F" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/></svg>
                      <span style={{ fontSize: "13px" }}>Live listings</span>
                    </div>
                    <div style={{ fontSize: "26px", fontWeight: 600, color: "#101212", letterSpacing: "-0.01em", lineHeight: 1.1 }}>{kpiListingsLive}</div>
                    <div style={{ fontSize: "12px", color: "#646968" }}>{kpiListingsPending} awaiting review</div>
                  </div>

                  {/* Next payout */}
                  <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: "12px", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "10px", cursor: "pointer" }}
                    onClick={() => setActiveNav("payments")}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4B4F4F" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>
                      <span style={{ fontSize: "13px" }}>Next payout</span>
                    </div>
                    <div style={{ fontSize: "26px", fontWeight: 600, color: "#101212", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
                      SAR 18,902.40
                    </div>
                    <div style={{ fontSize: "12px", color: "#646968" }}>Scheduled 1 Oct</div>
                  </div>
                </div>

                {/* ─ Row 2: Orders to fulfil + Needs attention ─ */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: "16px", alignItems: "start" }}>
                  {/* Orders to fulfil panel */}
                  <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: "12px", display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
                      <span style={{ fontSize: "15px", fontWeight: 600, color: "#101212" }}>Orders to fulfil</span>
                      <button type="button" onClick={() => setActiveNav("orders")}
                        style={{ background: "none", border: "none", color: "#004643", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                        View all
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {ORDERS.map((o) => (
                        <div key={o.id} style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: "12px 20px", borderTop: "1px solid #F1F4F4", background: "none", cursor: "pointer" }}
                          onClick={() => setActiveNav("orders")}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#FBFCFC"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}>
                          <span style={{ flex: "1 1 160px", display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <span style={{ fontSize: "14px", fontWeight: 600, color: "#101212" }}>{o.id}</span>
                            <span style={{ fontSize: "12px", color: "#646968" }}>{o.items}</span>
                          </span>
                          <span style={{ fontSize: "12px", color: o.overdue ? "#812F28" : "#4B4F4F", flex: "0 0 auto" }}>{o.dueLabel}</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: o.statusColor, color: o.statusText, fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px" }}>
                            <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: o.dotColor }} />
                            {o.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Needs attention panel */}
                  <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: "12px", display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <div style={{ padding: "16px 20px", fontSize: "15px", fontWeight: 600, color: "#101212" }}>
                      Needs attention
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {ALERTS.map((a) => (
                        <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", borderTop: "1px solid #F1F4F4" }}>
                          <span style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <span style={{ fontSize: "14px", fontWeight: 500, color: "#101212" }}>{a.title}</span>
                            <span style={{ fontSize: "12px", color: "#646968" }}>{a.body}</span>
                          </span>
                          <button type="button"
                            onClick={a.go}
                            style={{ background: "#FFFFFF", border: "1px solid #D5DBDA", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", fontWeight: 600, color: "#343837", cursor: "pointer", whiteSpace: "nowrap" }}>
                            {a.action}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ─ Row 3: Net earnings chart + Listings summary ─ */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: "16px", alignItems: "start" }}>
                  {/* Net earnings bar chart */}
                  <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: "12px", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "15px", fontWeight: 600, color: "#101212" }}>Net earnings</span>
                      <span style={{ fontSize: "12px", color: "#646968" }}>Last 6 months · after 12% commission</span>
                    </div>
                    {/* Bars */}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", height: "160px", paddingTop: "8px" }}>
                      {chartValues.map((hPct, idx) => {
                        const isCurrent = idx === chartValues.length - 1;
                        return (
                          <div key={chartMonths[idx]} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", height: "100%", justifyContent: "flex-end" }}>
                            <div
                              style={{
                                width: "100%",
                                maxWidth: "40px",
                                height: `${hPct}%`,
                                background: isCurrent ? "#004643" : "#C3F4F0",
                                borderRadius: "6px",
                                transition: "height 0.3s ease",
                              }}
                            />
                            <span style={{ fontSize: "12px", color: "#646968" }}>{chartMonths[idx]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Listings summary */}
                  <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: "12px", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: "15px", fontWeight: 600, color: "#101212" }}>Listings</span>
                      <button type="button" onClick={() => setActiveNav("products")}
                        style={{ background: "none", border: "none", color: "#004643", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                        Manage
                      </button>
                    </div>

                    {/* Stacked bar */}
                    <div style={{ display: "flex", height: "10px", borderRadius: "999px", overflow: "hidden", background: "#F1F4F4" }}>
                      <div style={{ width: lstPct(lstLive), background: "#004643" }} />
                      <div style={{ width: lstPct(lstPending), background: "#C19E52" }} />
                      <div style={{ width: lstPct(lstChanges), background: "#D47165" }} />
                      <div style={{ width: lstPct(lstDraft), background: "#B3B9B9" }} />
                    </div>

                    {/* Legend grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
                      {[
                        { c: "#004643", l: "Live", n: lstLive },
                        { c: "#C19E52", l: "Pending review", n: lstPending },
                        { c: "#D47165", l: "Changes requested", n: lstChanges },
                        { c: "#B3B9B9", l: "Draft", n: lstDraft },
                      ].map((row) => (
                        <div key={row.l} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#4B4F4F" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: row.c, flexShrink: 0 }} />
                          <span style={{ flex: 1 }}>{row.l}</span>
                          <strong style={{ color: "#101212" }}>{row.n}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── SECTION 2: ORDERS ── */}
          {activeNav === "orders" && (() => {
            const ORDER_TABS: ("To fulfil" | "Shipped" | "Delivered" | "All")[] = ["To fulfil", "Shipped", "Delivered", "All"];
            const filteredOrders = pinned(orders.filter(oFilter[orderTab]));
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Header */}
                <div>
                  <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "#101212" }}>Orders</h1>
                  <p style={{ margin: "2px 0 0", color: "#646968", fontSize: "14px" }}>Overdue orders are pinned to the top.</p>
                </div>

                {vendorStage === "established" || orders.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* Selection banner */}
                    {selN > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", background: "#101212", color: "#FFFFFF", borderRadius: "12px", padding: "10px 16px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, flex: 1 }}>{selN} selected</span>
                        <button type="button" onClick={() => { setShowPackingModal(true); setPackingExported(false); }} style={{ background: "#FFFFFF", color: "#101212", border: "none", borderRadius: "8px", padding: "7px 12px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Export packing list</button>
                        <button type="button" onClick={() => setSelectedOrderIds({})} style={{ background: "none", border: "none", color: "#D5DBDA", fontSize: "13px", cursor: "pointer" }}>Clear</button>
                      </div>
                    )}

                    {/* Filter tabs */}
                    <div style={{ display: "flex", gap: "4px", background: "#F1F4F4", borderRadius: "10px", padding: "4px", alignSelf: "flex-start", flexWrap: "wrap" }}>
                      {ORDER_TABS.map(t => {
                        const cnt = orders.filter(oFilter[t]).length;
                        const active = orderTab === t;
                        return (
                          <button key={t} type="button" onClick={() => setOrderTab(t)}
                            style={{ border: "none", background: active ? "#FFFFFF" : "transparent", boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)" : "none", color: active ? "#101212" : "#646968", borderRadius: "7px", padding: "6px 12px", fontSize: "13px", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                            {t} <span style={{ color: "#8E9493" }}>{cnt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Orders table */}
                    <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: "12px", overflow: "hidden" }}>
                      {/* Table header */}
                      <div style={{ display: "flex", gap: "12px", padding: "10px 20px", background: "#FBFCFC", fontSize: "12px", fontWeight: 600, color: "#646968" }}>
                        <span style={{ width: "18px", flexShrink: 0 }} />
                        <span style={{ flex: "1 1 200px" }}>Order</span>
                        <span style={{ flex: "0 0 110px" }}>Placed</span>
                        <span style={{ flex: "0 0 130px" }}>Value</span>
                        <span style={{ flex: "0 0 170px" }}>Due</span>
                        <span style={{ flex: "0 0 130px" }}>Status</span>
                      </div>

                      {/* Empty state */}
                      {filteredOrders.length === 0 && (
                        <div style={{ padding: "40px 20px", textAlign: "center", color: "#646968", fontSize: "14px" }}>Nothing in this view. Switch to All to see every order.</div>
                      )}

                      {/* Order rows */}
                      {filteredOrders.map((o) => {
                        const badge = ST_BADGE[o.status] ?? ST_BADGE.paid;
                        const checked = !!selectedOrderIds[o.id];
                        const itemCount = o.lines.length + (o.lines.length > 1 ? " items" : " item");
                        return (
                          <div key={o.id} style={{ display: "flex", alignItems: "center", borderTop: "1px solid #F1F4F4", paddingLeft: "16px" }}>
                            {/* Checkbox */}
                            <button type="button" aria-label="Select order"
                              onClick={() => setSelectedOrderIds(prev => { const n = { ...prev }; n[o.id] ? delete n[o.id] : (n[o.id] = true); return n; })}
                              style={{ width: "18px", height: "18px", flexShrink: 0, borderRadius: "4px", border: "1.5px solid #B3B9B9", background: checked ? "#004643" : "#FFFFFF", color: "#FFFFFF", fontSize: "11px", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {checked ? "✓" : ""}
                            </button>
                            {/* Row button */}
                            <button type="button"
                              onClick={() => { setOpenOrderId(o.id); setTrackingInput(""); setTrackingErr(""); setCancelMode(false); setCancelReason(""); setCancelErr(""); }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#FBFCFC"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                              style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "6px 12px", flexWrap: "wrap", padding: "14px 20px 14px 12px", border: "none", background: "none", textAlign: "left", cursor: "pointer" }}>
                              {/* Order id + customer */}
                              <span style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", minWidth: 0 }}>
                                <span style={{ fontSize: "14px", fontWeight: 600, color: "#101212" }}>{o.id}</span>
                                <span style={{ fontSize: "12px", color: "#646968" }}>{itemCount} · {o.cust}, {o.city}</span>
                              </span>
                              <span style={{ flex: "0 0 110px", fontSize: "13px", color: "#4B4F4F" }}>{o.placed}</span>
                              <span style={{ flex: "0 0 130px", fontSize: "13px", fontWeight: 500, color: "#101212" }}>{sar(o.value)}</span>
                              <span style={{ flex: "0 0 170px", fontSize: "13px", color: o.overdue ? "#812F28" : "#4B4F4F" }}>
                                {o.overdue ? `Overdue · due ${o.due}` : `Due ${o.due}`}
                              </span>
                              <span style={{ flex: "0 0 130px" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: badge.bg, color: badge.fg, fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", whiteSpace: "nowrap" }}>
                                  <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: badge.dot }} />
                                  {badge.label}
                                </span>
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* New/pending vendor empty state */
                  <div style={{ background: "#FFFFFF", border: "1px dashed #D5DBDA", borderRadius: "12px", padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: "15px", fontWeight: 600 }}>No orders yet</div>
                    <div style={{ fontSize: "13px", color: "#646968", maxWidth: "360px" }}>Orders appear here once a shopper buys one of your live listings.</div>
                    <button type="button" onClick={() => { setActiveNav("products"); handleOpenNewListing(); }} style={{ marginTop: "6px", background: "#004643", color: "#FFFFFF", border: "none", borderRadius: "8px", padding: "9px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Create a listing</button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── SECTION 3: PRODUCTS ── */}
          {activeNav === "products" && (() => {
            const cntLive        = products.filter((p) => p.status === "live").length;
            const cntPending     = products.filter((p) => p.status === "pending_review").length;
            const cntChanges     = products.filter((p) => p.status === "changes_requested").length;
            const cntDraft       = products.filter((p) => p.status === "draft").length;
            const cntDeactivated = products.filter((p) => p.status === "deactivated").length;

            const TABS = [
              { id: "all"         as const, label: `All ${products.length}` },
              { id: "live"        as const, label: `Live ${cntLive}` },
              { id: "pending"     as const, label: `Pending review ${cntPending}` },
              { id: "changes"     as const, label: `Changes requested ${cntChanges}` },
              { id: "draft"       as const, label: `Draft ${cntDraft}` },
              { id: "deactivated" as const, label: `Deactivated ${cntDeactivated}` },
            ];

            const filtered = products.filter((p) => {
              if (prodTab === "live"        && p.status !== "live")               return false;
              if (prodTab === "pending"     && p.status !== "pending_review")     return false;
              if (prodTab === "changes"     && p.status !== "changes_requested")  return false;
              if (prodTab === "draft"       && p.status !== "draft")              return false;
              if (prodTab === "deactivated" && p.status !== "deactivated")        return false;
              if (prodSearch.trim() && !p.title.toLowerCase().includes(prodSearch.toLowerCase())) return false;
              if (prodCatFilter  !== "All categories" && p.cat  !== prodCatFilter)  return false;
              if (prodTypeFilter !== "All types"      && p.kind !== prodTypeFilter) return false;
              return true;
            });

            const relativeTime = (d: Date) => {
              const s = Math.floor((Date.now() - d.getTime()) / 1000);
              if (s < 10)    return "Just now";
              if (s < 60)    return `${s}s ago`;
              if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
              if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
              return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
            };

            const StatusBadge = ({ status }: { status: string }) => {
              const map: Record<string, { bg: string; color: string; dot: string; label: string }> = {
                pending_review:    { bg: "#FFF8E6", color: "#7A4F00", dot: "#D97706", label: "Pending review" },
                live:              { bg: "#F4FFF6", color: "#28603A", dot: "#16A34A", label: "Live" },
                draft:             { bg: "#F1F4F4", color: "#4B4F4F", dot: "#8E9493", label: "Draft" },
                changes_requested: { bg: "#FFF1F2", color: "#9F1239", dot: "#E11D48", label: "Changes requested" },
                deactivated:       { bg: "#F8FAFC", color: "#64748B", dot: "#94A3B8", label: "Deactivated" },
              };
              const s = map[status] || map.draft;
              return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: s.bg, color: s.color, fontSize: "11px", fontWeight: 600, padding: "3px 9px", borderRadius: "999px", whiteSpace: "nowrap" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: s.dot, flexShrink: 0 }} />
                  {s.label}
                </span>
              );
            };

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "#101212" }}>Products</h1>
                    <p style={{ margin: "2px 0 0", color: "#646968", fontSize: "14px" }}>
                      Title and image edits go to review; price and lead time publish immediately.
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <button type="button" style={{ background: "#FFFFFF", color: "#343837", border: "1px solid #D5DBDA", borderRadius: "8px", padding: "9px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                      Upload spreadsheet
                    </button>
                    <button type="button" onClick={handleOpenNewListing} style={{ background: "#004643", color: "#FFFFFF", border: "none", borderRadius: "8px", padding: "9px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                      + New listing
                    </button>
                  </div>
                </div>

                {/* Status Tabs */}
                <div style={{ display: "flex", gap: "4px", background: "#F1F4F4", borderRadius: "10px", padding: "4px", alignSelf: "flex-start", flexWrap: "wrap" }}>
                  {TABS.map((tab) => {
                    const active = prodTab === tab.id;
                    return (
                      <button key={tab.id} type="button" onClick={() => setProdTab(tab.id)}
                        style={{ border: "none", background: active ? "#FFFFFF" : "transparent", boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none", color: active ? "#101212" : "#646968", borderRadius: "7px", padding: "6px 12px", fontSize: "13px", fontWeight: active ? 600 : 500, cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Filters row */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    placeholder="Search title or SKU"
                    style={{ flex: "1 1 200px", maxWidth: "280px", padding: "8px 12px", border: "1px solid #D5DBDA", borderRadius: "8px", fontSize: "13px", background: "#FFFFFF", outline: "none" }}
                  />
                  <select aria-label="Category" value={prodCatFilter} onChange={(e) => setProdCatFilter(e.target.value)}
                    style={{ padding: "8px 12px", border: "1px solid #D5DBDA", borderRadius: "8px", fontSize: "13px", background: "#FFFFFF", color: "#343837", outline: "none", cursor: "pointer" }}>
                    <option>All categories</option>
                    <option>Sofas</option><option>Tables</option><option>Chairs</option>
                    <option>Storage</option><option>Rugs</option><option>Décor accents</option>
                  </select>
                  <select aria-label="Type" value={prodTypeFilter} onChange={(e) => setProdTypeFilter(e.target.value)}
                    style={{ padding: "8px 12px", border: "1px solid #D5DBDA", borderRadius: "8px", fontSize: "13px", background: "#FFFFFF", color: "#343837", outline: "none", cursor: "pointer" }}>
                    <option>All types</option>
                    <option>Made to order</option><option>In stock</option><option>Custom size</option>
                  </select>
                  <select aria-label="Sort"
                    style={{ padding: "8px 12px", border: "1px solid #D5DBDA", borderRadius: "8px", fontSize: "13px", background: "#FFFFFF", color: "#343837", outline: "none", cursor: "pointer" }}>
                    <option>Recently updated</option>
                  </select>
                </div>

                {/* Table */}
                <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: "12px", overflow: "hidden" }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 20px", background: "#FBFCFC", borderBottom: products.length > 0 ? "1px solid #EAEDEC" : "none", fontSize: "12px", fontWeight: 600, color: "#646968" }}>
                    <span style={{ width: "16px", flexShrink: 0 }} />
                    <span style={{ width: "36px", flexShrink: 0 }} />
                    <span style={{ flex: "1 1 180px" }}>Listing</span>
                    <span style={{ flex: "0 0 160px" }}>Category · type</span>
                    <span style={{ flex: "0 0 140px" }}>Status</span>
                    <span style={{ flex: "0 0 90px" }}>Price</span>
                    <span style={{ flex: "0 0 90px" }}>Lead time</span>
                    <span style={{ flex: "0 0 80px", textAlign: "right" }}>Updated</span>
                  </div>

                  {/* Empty state */}
                  {filtered.length === 0 && (
                    <div style={{ padding: "48px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: "#101212" }}>
                        {products.length === 0 ? "No listings yet" : "No results"}
                      </div>
                      <div style={{ fontSize: "13px", color: "#646968", maxWidth: "360px" }}>
                        {products.length === 0
                          ? "Create your first listing. It goes live after a quick review."
                          : "Try adjusting your search or filter."}
                      </div>
                      {products.length === 0 && (
                        <button type="button" onClick={handleOpenNewListing}
                          style={{ marginTop: "8px", background: "#004643", color: "#FFFFFF", border: "none", borderRadius: "8px", padding: "10px 18px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                          + New listing
                        </button>
                      )}
                    </div>
                  )}

                  {/* Product rows */}
                  {filtered.map((p, i) => (
                    <div
                      key={p.id}
                      style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", borderTop: i === 0 ? "none" : "1px solid #F1F4F4", cursor: "pointer", transition: "background 0.1s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#FBFCFC"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
                    >
                      <input type="checkbox" style={{ width: "14px", height: "14px", accentColor: "#004643", flexShrink: 0 }} onClick={(e) => e.stopPropagation()} />

                      {/* Thumbnail */}
                      <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: p.imgCount > 0 ? "#C3F4F0" : "#F1F4F4", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {p.imgCount > 0 ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#004643" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B3B9B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <line x1="3" y1="3" x2="21" y2="21" />
                          </svg>
                        )}
                      </div>

                      {/* Title + SKU */}
                      <div style={{ flex: "1 1 180px", minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#101212", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</span>
                        <span style={{ fontSize: "11px", color: "#8E9493" }}>
                          {p.vars.find((v) => v.sku)?.sku || `AR-${p.id.slice(-4).toUpperCase()}`}
                        </span>
                      </div>

                      {/* Category · type */}
                      <div style={{ flex: "0 0 160px", fontSize: "13px", color: "#4B4F4F", display: "flex", flexDirection: "column" }}>
                        <span>{p.cat}</span>
                        <span style={{ fontSize: "11px", color: "#8E9493" }}>{p.kind}</span>
                      </div>

                      {/* Status */}
                      <div style={{ flex: "0 0 140px" }}><StatusBadge status={p.status} /></div>

                      {/* Price */}
                      <span style={{ flex: "0 0 90px", fontSize: "13px", fontWeight: 600, color: "#101212" }}>
                        {p.price ? `SAR ${p.price}` : "—"}
                      </span>

                      {/* Lead time */}
                      <span style={{ flex: "0 0 90px", fontSize: "13px", color: "#4B4F4F" }}>
                        {p.kind === "In stock"
                          ? (p.stock ? `${p.stock} units` : "—")
                          : (p.stock ? `${p.stock} weeks` : "—")}
                      </span>

                      {/* Updated */}
                      <span style={{ flex: "0 0 80px", fontSize: "12px", color: "#8E9493", textAlign: "right" }}>
                        {relativeTime(p.updatedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

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

      {/* ── NEW LISTING DRAWER ── */}
      {isNewListingOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(16, 18, 18, 0.32)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            onClick={() => setIsNewListingOpen(false)}
            style={{ flex: 1, cursor: "pointer" }}
          />
          <div
            style={{
              width: "460px",
              maxWidth: "100%",
              height: "100%",
              background: "#FFFFFF",
              boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              zIndex: 51,
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: "20px 24px 16px",
                borderBottom: "1px solid #EAEDEC",
                position: "relative",
              }}
            >
              <button
                type="button"
                onClick={() => setIsNewListingOpen(false)}
                aria-label="Close"
                style={{
                  position: "absolute",
                  right: "20px",
                  top: "20px",
                  background: "none",
                  border: "none",
                  fontSize: "22px",
                  lineHeight: 1,
                  color: "#646968",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
              <div style={{ fontSize: "12px", color: "#646968" }}>
                Step {nlStep + 1} of 4
              </div>
              <h2
                style={{
                  fontSize: "22px",
                  fontWeight: 600,
                  margin: "2px 0 0",
                  color: "#101212",
                }}
              >
                New listing
              </h2>

              {/* Stepper Progress Bar */}
              <div style={{ display: "flex", gap: "6px", marginTop: "16px" }}>
                {[
                  "Create listing",
                  "Add variants",
                  "Upload images",
                  "Review & publish",
                  "Live",
                ].map((label, idx) => {
                  const isDone = idx < nlStep;
                  const isCurrent = idx === nlStep;
                  return (
                    <div
                      key={label}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          height: "4px",
                          borderRadius: "999px",
                          background: isCurrent || isDone ? "#004643" : "#EAEDEC",
                          transition: "background 0.2s ease",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: isCurrent ? 600 : 500,
                          color: isCurrent ? "#101212" : isDone ? "#4B4F4F" : "#8E9493",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Drawer Content Area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              {/* STEP 0: Create listing */}
              {nlStep === 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#343837",
                    }}
                  >
                    Title
                    <input
                      type="text"
                      value={nlTitle}
                      onChange={(e) => {
                        setNlTitle(e.target.value);
                        setNlErr("");
                      }}
                      placeholder="e.g. Oak coffee table, round"
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

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
                    <label
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#343837",
                      }}
                    >
                      Category
                      <select
                        value={nlCat}
                        onChange={(e) => {
                          setNlCat(e.target.value);
                          setNlErr("");
                        }}
                        style={{
                          padding: "10px 14px",
                          border: "1px solid #D5DBDA",
                          borderRadius: "8px",
                          fontSize: "14px",
                          background: "#FFFFFF",
                          color: "#101212",
                          outline: "none",
                          cursor: "pointer",
                        }}
                      >
                        <option value="Choose">Choose</option>
                        <option value="Sofas">Sofas</option>
                        <option value="Tables">Tables</option>
                        <option value="Chairs">Chairs</option>
                        <option value="Storage">Storage</option>
                        <option value="Rugs">Rugs</option>
                        <option value="Décor accents">Décor accents</option>
                      </select>
                    </label>

                    <label
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#343837",
                      }}
                    >
                      Type
                      <select
                        value={nlKind}
                        onChange={(e) => {
                          setNlKind(e.target.value);
                          setNlErr("");
                        }}
                        style={{
                          padding: "10px 14px",
                          border: "1px solid #D5DBDA",
                          borderRadius: "8px",
                          fontSize: "14px",
                          background: "#FFFFFF",
                          color: "#101212",
                          outline: "none",
                          cursor: "pointer",
                        }}
                      >
                        <option value="Made to order">Made to order</option>
                        <option value="In stock">In stock</option>
                        <option value="Custom size">Custom size</option>
                      </select>
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
                    <label
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#343837",
                      }}
                    >
                      Price (SAR)
                      <input
                        type="text"
                        inputMode="decimal"
                        value={nlPrice}
                        onChange={(e) => {
                          setNlPrice(e.target.value);
                          setNlErr("");
                        }}
                        placeholder="e.g. 2400"
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

                    <label
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#343837",
                      }}
                    >
                      {nlKind === "In stock" ? "Units in stock" : "Lead time (weeks)"}
                      <input
                        type="text"
                        inputMode="numeric"
                        value={nlStock}
                        onChange={(e) => {
                          setNlStock(e.target.value);
                          setNlErr("");
                        }}
                        placeholder={nlKind === "In stock" ? "e.g. 10" : "e.g. 4"}
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
                  </div>

                  <div style={{ fontSize: "12px", color: "#646968" }}>
                    {nlKind === "In stock"
                      ? "Shoppers see how many are left. Stock edits publish immediately."
                      : nlKind === "Made to order"
                      ? "Shoppers see the lead time, never a stock count."
                      : "Shoppers request a quote with their dimensions before ordering."}
                  </div>

                  {nlErr && <div style={{ fontSize: "12px", color: "#812F28" }}>{nlErr}</div>}

                  <button
                    type="button"
                    onClick={() => {
                      if (!nlTitle.trim()) {
                        setNlErr("Please enter a title.");
                        return;
                      }
                      if (nlCat === "Choose") {
                        setNlErr("Please choose a category.");
                        return;
                      }
                      if (!nlPrice.trim() || isNaN(Number(nlPrice))) {
                        setNlErr("Please enter a valid price.");
                        return;
                      }
                      if (!nlStock.trim()) {
                        setNlErr(
                          `Please enter ${nlKind === "In stock" ? "units in stock" : "lead time"}.`
                        );
                        return;
                      }
                      setNlStep(1);
                      setNlErr("");
                    }}
                    style={{
                      marginTop: "8px",
                      background: "#004643",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "8px",
                      padding: "12px",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    Continue to variants
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    style={{
                      alignSelf: "center",
                      background: "none",
                      border: "none",
                      color: "#646968",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Save as draft
                  </button>
                </div>
              )}

              {/* STEP 1: Add variants */}
              {nlStep === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ fontSize: "13px", color: "#4B4F4F", lineHeight: 1.5 }}>
                    Add a variant for each size, finish or colour a shopper can choose. Keep one if the product has no options.
                  </div>

                  {nlVars.map((v, i) => (
                    <div
                      key={v.id}
                      style={{
                        border: "1px solid #EAEDEC",
                        borderRadius: "8px",
                        padding: "14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#101212" }}>
                          Variant {i + 1}
                        </span>
                        {nlVars.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setNlVars(nlVars.filter((x) => x.id !== v.id))}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#812F28",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px" }}>
                        <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 500, color: "#343837" }}>
                          Name
                          <input
                            type="text"
                            value={v.name}
                            onChange={(e) => {
                              const updated = nlVars.map((x) => (x.id === v.id ? { ...x, name: e.target.value } : x));
                              setNlVars(updated);
                            }}
                            placeholder="e.g. Natural oak"
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #D5DBDA",
                              borderRadius: "8px",
                              fontSize: "13px",
                              outline: "none",
                            }}
                          />
                        </label>
                        <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 500, color: "#343837" }}>
                          SKU
                          <input
                            type="text"
                            value={v.sku}
                            onChange={(e) => {
                              const updated = nlVars.map((x) => (x.id === v.id ? { ...x, sku: e.target.value } : x));
                              setNlVars(updated);
                            }}
                            placeholder={`AR-NEW-${String.fromCharCode(65 + i)}`}
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #D5DBDA",
                              borderRadius: "8px",
                              fontSize: "13px",
                              outline: "none",
                            }}
                          />
                        </label>
                        <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 500, color: "#343837" }}>
                          {nlKind === "In stock" ? "Stock" : "Lead time"}
                          <input
                            type="text"
                            value={v.stock}
                            onChange={(e) => {
                              const updated = nlVars.map((x) => (x.id === v.id ? { ...x, stock: e.target.value } : x));
                              setNlVars(updated);
                            }}
                            placeholder={nlStock || "4"}
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #D5DBDA",
                              borderRadius: "8px",
                              fontSize: "13px",
                              outline: "none",
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setNlVars([...nlVars, { id: String(Date.now()), name: "", sku: "", stock: "" }])
                    }
                    style={{
                      alignSelf: "flex-start",
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "#004643",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    + Add variant
                  </button>

                  <div style={{ fontSize: "12px", color: "#646968" }}>
                    SKUs only need to be unique within your store.
                  </div>

                  {nlErr && <div style={{ fontSize: "12px", color: "#812F28" }}>{nlErr}</div>}

                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setNlStep(0)}
                      style={{
                        background: "#FFFFFF",
                        color: "#343837",
                        border: "1px solid #D5DBDA",
                        borderRadius: "8px",
                        padding: "11px 16px",
                        fontSize: "14px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNlStep(2);
                        setNlErr("");
                      }}
                      style={{
                        flex: 1,
                        background: "#004643",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: "8px",
                        padding: "11px 16px",
                        fontSize: "14px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Continue to images
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    style={{
                      alignSelf: "center",
                      background: "none",
                      border: "none",
                      color: "#646968",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Save as draft
                  </button>
                </div>
              )}

              {/* STEP 2: Upload images */}
              {nlStep === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ fontSize: "13px", color: "#4B4F4F" }}>
                    Up to 6 images. The first is the main image shoppers see.
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px" }}>
                    {nlImgs.map((status, idx) => (
                      <div key={idx}>
                        {status === "ok" && (
                          <div
                            style={{
                              aspectRatio: "1",
                              borderRadius: "8px",
                              background: "#C3F4F0",
                              display: "flex",
                              alignItems: "flex-end",
                              padding: "6px",
                              fontSize: "11px",
                              color: "#004743",
                              fontWeight: 600,
                              position: "relative",
                            }}
                          >
                            {idx === 0 ? "Main image" : `Image ${idx + 1}`}
                            <button
                              type="button"
                              onClick={() => {
                                const copy = [...nlImgs];
                                copy[idx] = "e";
                                setNlImgs(copy);
                              }}
                              style={{
                                position: "absolute",
                                top: "4px",
                                right: "4px",
                                background: "rgba(0,0,0,0.5)",
                                color: "#FFFFFF",
                                border: "none",
                                borderRadius: "999px",
                                width: "16px",
                                height: "16px",
                                fontSize: "10px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                              }}
                            >
                              ×
                            </button>
                          </div>
                        )}

                        {status === "u" && (
                          <div
                            style={{
                              aspectRatio: "1",
                              borderRadius: "8px",
                              background: "#F1F4F4",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "12px",
                              color: "#646968",
                            }}
                          >
                            Uploading…
                          </div>
                        )}

                        {status === "e" && (
                          <button
                            type="button"
                            aria-label="Add image"
                            onClick={() => {
                              const copy = [...nlImgs];
                              copy[idx] = "u";
                              setNlImgs(copy);
                              setTimeout(() => {
                                const done = [...copy];
                                done[idx] = "ok";
                                setNlImgs(done);
                              }, 700);
                            }}
                            style={{
                              width: "100%",
                              aspectRatio: "1",
                              borderRadius: "8px",
                              border: "1px dashed #B3B9B9",
                              background: "#FBFCFC",
                              color: "#8E9493",
                              fontSize: "20px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            +
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {nlErr && <div style={{ fontSize: "12px", color: "#812F28" }}>{nlErr}</div>}

                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setNlStep(1)}
                      style={{
                        background: "#FFFFFF",
                        color: "#343837",
                        border: "1px solid #D5DBDA",
                        borderRadius: "8px",
                        padding: "11px 16px",
                        fontSize: "14px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!nlImgs.some((x) => x === "ok")) {
                          setNlErr("Please add at least 1 image before continuing.");
                          return;
                        }
                        setNlStep(3);
                        setNlErr("");
                      }}
                      style={{
                        flex: 1,
                        background: "#004643",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: "8px",
                        padding: "11px 16px",
                        fontSize: "14px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Review
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    style={{
                      alignSelf: "center",
                      background: "none",
                      border: "none",
                      color: "#646968",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Save as draft
                  </button>
                </div>
              )}

              {/* STEP 3: Review and submit */}
              {nlStep === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div
                    style={{
                      border: "1px solid #EAEDEC",
                      borderRadius: "8px",
                      padding: "14px",
                      display: "grid",
                      gridTemplateColumns: "110px 1fr",
                      gap: "8px 12px",
                      fontSize: "13px",
                    }}
                  >
                    <span style={{ color: "#646968" }}>Title</span>
                    <span style={{ color: "#101212", fontWeight: 500 }}>{nlTitle}</span>

                    <span style={{ color: "#646968" }}>Category</span>
                    <span style={{ color: "#101212" }}>{nlCat}</span>

                    <span style={{ color: "#646968" }}>Type</span>
                    <span style={{ color: "#101212" }}>{nlKind}</span>

                    <span style={{ color: "#646968" }}>Price</span>
                    <span style={{ color: "#101212", fontWeight: 600 }}>SAR {nlPrice}</span>

                    <span style={{ color: "#646968" }}>
                      {nlKind === "In stock" ? "Units in stock" : "Lead time"}
                    </span>
                    <span style={{ color: "#101212" }}>{nlStock}</span>

                    <span style={{ color: "#646968" }}>Variants</span>
                    <span style={{ color: "#101212" }}>
                      {nlVars.map((v) => v.name || "Standard").join(", ")}
                    </span>

                    <span style={{ color: "#646968" }}>Images</span>
                    <span style={{ color: "#101212" }}>
                      {nlImgs.filter((x) => x === "ok").length} images uploaded
                    </span>
                  </div>

                  <div style={{ fontSize: "13px", color: "#28603A", lineHeight: 1.5, background: "#E7FBEB", padding: "10px 14px", borderRadius: "8px", border: "1px solid #B7ECC8" }}>
                    ✓ Admin approval turned off. Your furniture will be posted directly to the marketplace and made available for shoppers to order immediately.
                  </div>

                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setNlStep(2)}
                      style={{
                        background: "#FFFFFF",
                        color: "#343837",
                        border: "1px solid #D5DBDA",
                        borderRadius: "8px",
                        padding: "11px 16px",
                        fontSize: "14px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handlePublishListing}
                      disabled={isPublishing}
                      style={{
                        flex: 1,
                        background: "#004643",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: "8px",
                        padding: "11px 16px",
                        fontSize: "14px",
                        fontWeight: 600,
                        cursor: isPublishing ? "not-allowed" : "pointer",
                        opacity: isPublishing ? 0.7 : 1,
                      }}
                    >
                      {isPublishing ? "Publishing…" : "Publish to marketplace"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    style={{
                      alignSelf: "center",
                      background: "none",
                      border: "none",
                      color: "#646968",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Save as draft
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ORDER DETAIL DRAWER ── */}
      {openOrder && (() => {
        const o = openOrder;
        const badge = ST_BADGE[o.status] ?? ST_BADGE.paid;
        const flow = isFactory ? FLOW_FACTORY : FLOW_RETAILER;
        const idx = flow.indexOf(o.status);
        const next = flow[idx + 1] as OrderStatus | undefined;
        const hasNext = !!NEXT_LABEL[o.status];
        const needsTrack = next === "shipped";
        const isRts = o.status === "rts";
        const canCancel = ["paid", "processing", "materials"].includes(o.status);
        const OX_addrAuto = !!(o.addr && o.addr.auto);
        const OX_addrAdmin = !!(o.addr && !o.addr.auto);
        const deltas = o.lines.filter(l => l.now).map(l => ({ n: l.n, paid: sar(l.p), now: sar(l.now!), diff: "+" + sar(l.now! - l.p) }));
        const hasDelta = deltas.length > 0;
        const ladder = flow.map((k, j) => {
          const labels: Record<string, string> = { paid: "Paid", materials: "Materials", production: "In production", qc: "Quality check", ready: "Ready to ship", processing: "Processing", shipped: "Shipped", delivered: "Delivered" };
          return { l: labels[k] || k, done: j <= idx, cur: j === idx, c: j <= idx ? "#004643" : "#D5DBDA", tc: j <= idx ? "#101212" : "#8E9493", line: j < flow.length - 1 };
        });
        const total = o.lines.reduce((s, l) => s + l.p * l.q, 0);
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 25, display: "flex", justifyContent: "flex-end" }}>
            {/* Backdrop */}
            <div onClick={() => setOpenOrderId(null)} style={{ flex: 1, background: "rgba(16,18,18,0.32)" }} />
            {/* Panel */}
            <div style={{ width: "480px", maxWidth: "100%", height: "100%", background: "#FFFFFF", boxShadow: "0 16px 48px rgba(0,0,0,0.14)", display: "flex", flexDirection: "column" }}>
              {/* Close */}
              <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px 0" }}>
                <button type="button" onClick={() => setOpenOrderId(null)} aria-label="Close" style={{ background: "none", border: "none", fontSize: "22px", lineHeight: 1, color: "#646968", cursor: "pointer", width: "36px", height: "36px" }}>×</button>
              </div>
              {/* Content */}
              <div style={{ flex: 1, overflow: "auto", padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Order header */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#646968" }}>Placed {o.placed} · {o.cust}, {o.city}</span>
                  <h2 style={{ fontSize: "22px", fontWeight: 600, margin: 0 }}>{o.id}</h2>
                  <span style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: "5px", background: badge.bg, color: badge.fg, fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px" }}>
                    <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: badge.dot }} />{badge.label}
                  </span>
                </div>

                {/* Address auto-change notice */}
                {OX_addrAuto && (
                  <div style={{ background: "#F0FFFE", border: "1px solid #83F2EB", borderRadius: "8px", padding: "12px", fontSize: "13px", color: "#004743" }}>
                    <strong>Shopper changed the delivery address</strong> before processing, so it updated automatically.<br />
                    <span style={{ textDecoration: "line-through", color: "#646968" }}>{o.addr!.from}</span> → {o.addr!.to}
                  </div>
                )}
                {OX_addrAdmin && (
                  <div style={{ background: "#FFFBF2", border: "1px solid #F7DFAD", borderRadius: "8px", padding: "12px", fontSize: "13px", color: "#563D00" }}>
                    <strong>Shopper asked to change the address</strong> to {o.addr!.to}. The order is already in production, so Nooi admin handles this. Keep shipping to {o.addr!.from} until they confirm.
                  </div>
                )}

                {/* Price delta notice */}
                {hasDelta && (
                  <div style={{ background: "#FFFBF2", border: "1px solid #F7DFAD", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "#563D00" }}>
                    <strong>Price changed after this order</strong>
                    {deltas.map((x, i) => <span key={i}>{x.n}: shopper paid {x.paid} · listing now {x.now} ({x.diff})</span>)}
                    <span style={{ color: "#646968" }}>The order keeps the checkout price. Your payout uses the paid amount.</span>
                  </div>
                )}

                {/* RTS banner */}
                {isRts ? (
                  <div style={{ background: "#FFFAF9", border: "1px solid #FFC9C0", borderRadius: "8px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#812F28" }}>Carrier returned this parcel to you</div>
                    <div style={{ fontSize: "13px", color: "#611A15" }}>SMSA made 3 delivery attempts (19–21 Sep) and the shopper couldn&apos;t be reached. This isn&apos;t a customer return — no refund has started.</div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button type="button" onClick={() => { setOrders(prev => prev.map(x => x.id === o.id ? { ...x, status: isFactory ? "ready" : "processing" } : x)); showToast(o.id + " moved back to " + (isFactory ? "Ready to ship" : "Processing") + ". Add the new tracking number when it leaves."); setOpenOrderId(null); }} style={{ background: "#004643", color: "#FFFFFF", border: "none", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Reship to confirmed address</button>
                      <button type="button" onClick={() => setCancelMode(true)} style={{ background: "#FFFFFF", border: "1px solid #D5DBDA", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: 600, color: "#343837", cursor: "pointer" }}>Request cancellation</button>
                    </div>
                  </div>
                ) : (
                  /* Status ladder */
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {ladder.map((r, i) => (
                      <div key={i} style={{ display: "flex", gap: "12px", minHeight: "34px" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "14px" }}>
                          <span style={{ width: "12px", height: "12px", borderRadius: "999px", background: r.c, flexShrink: 0, marginTop: "4px" }} />
                          {r.line && <span style={{ flex: 1, width: "2px", background: r.c }} />}
                        </div>
                        <span style={{ fontSize: "13px", color: r.tc, paddingBottom: r.line ? "6px" : 0 }}>{r.l}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Items */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600 }}>Items</div>
                  {o.lines.map((l, i) => (
                    <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid #F1F4F4" }}>
                      <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "14px" }}>{l.n} × {l.q}</span>
                        <span style={{ fontSize: "12px", color: "#646968" }}>{l.d}</span>
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 500 }}>{sar(l.p * l.q)}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "10px", borderTop: "1px solid #EAEDEC", fontWeight: 600 }}>
                    <span>Total</span><span>{sar(total)}</span>
                  </div>
                </div>

                {/* Existing tracking display */}
                {o.tracking && (
                  <div style={{ fontSize: "13px", color: "#343837", background: "#F1F4F4", borderRadius: "8px", padding: "10px 12px" }}>Tracking: {o.tracking}</div>
                )}

                {/* Actions: next status */}
                {hasNext && !isRts && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", borderTop: "1px solid #EAEDEC", paddingTop: "16px" }}>
                    {needsTrack && (
                      <>
                        <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 500, color: "#343837" }}>
                          Carrier tracking number
                          <input value={trackingInput} onChange={e => { setTrackingInput(e.target.value); setTrackingErr(""); }} placeholder="e.g. SMSA 2903 5512 88" style={{ padding: "10px 14px", border: "1px solid #D5DBDA", borderRadius: "8px", fontSize: "14px", outline: "none" }} />
                        </label>
                        {trackingErr && <div style={{ fontSize: "12px", color: "#812F28" }}>{trackingErr}</div>}
                        <div style={{ fontSize: "12px", color: "#646968" }}>Local courier not listed? Paste their tracking link — shoppers get it as-is.</div>
                      </>
                    )}
                    <button type="button" onClick={() => advanceOrder(o)} style={{ background: "#004643", color: "#FFFFFF", border: "none", borderRadius: "8px", padding: "11px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>{NEXT_LABEL[o.status]}</button>
                    {/* QC fail */}
                    {o.status === "qc" && (
                      <button type="button" onClick={() => { setOrders(prev => prev.map(x => x.id === o.id ? { ...x, status: "production" } : x)); showToast("Returned to In production. Shopper told the revised date: 6 Oct."); }} style={{ background: "#FFFFFF", color: "#812F28", border: "1px solid #FFC9C0", borderRadius: "8px", padding: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Quality check failed — back to production</button>
                    )}
                  </div>
                )}

                {/* Shipped waiting note */}
                {o.status === "shipped" && (
                  <div style={{ fontSize: "13px", color: "#646968" }}>Waiting for the carrier to confirm delivery. If they send no update, the shopper sees the last known status with its time.</div>
                )}

                {/* Cancellation */}
                {canCancel && (
                  cancelMode ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "#FBFCFC", border: "1px solid #EAEDEC", borderRadius: "8px", padding: "14px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600 }}>Request cancellation</div>
                      <div style={{ fontSize: "12px", color: "#646968" }}>Only Nooi admin can cancel an order. Tell them why you can&apos;t fulfil it.</div>
                      <textarea rows={3} value={cancelReason} onChange={e => { setCancelReason(e.target.value); setCancelErr(""); }} style={{ padding: "10px", border: "1px solid #D5DBDA", borderRadius: "8px", fontSize: "13px", resize: "vertical", fontFamily: "inherit" }} />
                      {cancelErr && <div style={{ fontSize: "12px", color: "#812F28" }}>{cancelErr}</div>}
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button type="button" onClick={() => { if (cancelReason.trim().length < 10) { setCancelErr("Add a reason of at least 10 characters. Nooi admin reads it before deciding."); return; } setCancelMode(false); setCancelReason(""); showToast(`Request sent to Nooi admin. Keep the order on hold until they decide.`); }} style={{ background: "#A0483E", color: "#FFFFFF", border: "none", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Send request</button>
                        <button type="button" onClick={() => { setCancelMode(false); setCancelErr(""); }} style={{ background: "none", border: "1px solid #D5DBDA", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", cursor: "pointer" }}>Keep order</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setCancelMode(true)} style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, fontSize: "13px", color: "#812F28", cursor: "pointer" }}>Can&apos;t fulfil this order?</button>
                  )
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── PACKING LIST MODAL ── */}
      {showPackingModal && (() => {
        const { groups, flagged, custom } = buildPackingGroups();
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(16,18,18,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div style={{ width: "560px", maxWidth: "100%", maxHeight: "90vh", overflow: "auto", background: "#FFFFFF", borderRadius: "12px", boxShadow: "0 16px 48px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08)", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 600, margin: 0 }}>Packing list for the floor</h2>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#646968" }}>{selOrders.map(x => x.id).join(", ")} · grouped by material and colour</p>
              </div>

              {/* Groups */}
              {groups.map(({ g, items }) => (
                <div key={g} style={{ border: "1px solid #EAEDEC", borderRadius: "8px", overflow: "hidden" }}>
                  <div style={{ background: "#FBFCFC", padding: "8px 12px", fontSize: "12px", fontWeight: 600, color: "#343837" }}>{g}</div>
                  {items.map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: "12px", padding: "10px 12px", borderTop: "1px solid #F1F4F4", fontSize: "13px" }}>
                      <strong style={{ width: "28px" }}>{item.q}×</strong>
                      <span style={{ flex: 1 }}>{item.n}</span>
                      <span style={{ color: "#646968", fontSize: "12px" }}>{item.ordsL}</span>
                    </div>
                  ))}
                </div>
              ))}

              {/* Custom dims */}
              {custom.length > 0 && (
                <div style={{ border: "1px solid #EAEDEC", borderRadius: "8px", overflow: "hidden" }}>
                  <div style={{ background: "#FBFCFC", padding: "8px 12px", fontSize: "12px", fontWeight: 600, color: "#343837" }}>Custom dimensions · one line each</div>
                  {custom.map((c, i) => (
                    <div key={i} style={{ padding: "10px 12px", borderTop: "1px solid #F1F4F4", fontSize: "13px" }}>
                      {c.q}× {c.n} · {c.m}, {c.c} · <strong>{c.dims}</strong> <span style={{ color: "#646968" }}>({c.ord})</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Flagged missing material */}
              {flagged.length > 0 && (
                <div style={{ border: "1px solid #F7DFAD", background: "#FFFBF2", borderRadius: "8px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", color: "#563D00" }}>
                  <strong>Missing material data — flagged in the export, not left blank</strong>
                  {flagged.map((x, i) => <span key={i}>{x.q}× {x.n} ({x.ord}) · add material and colour on the listing</span>)}
                </div>
              )}

              {/* Exported confirmation */}
              {packingExported && (
                <div style={{ fontSize: "13px", color: "#124525", background: "#F4FFF6", borderRadius: "8px", padding: "10px 12px" }}>Exported packing-list.csv</div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button type="button" onClick={() => setShowPackingModal(false)} style={{ background: "#FFFFFF", border: "1px solid #D5DBDA", borderRadius: "8px", padding: "9px 14px", fontSize: "13px", cursor: "pointer" }}>Close</button>
                <button type="button" onClick={() => { window.print(); }} style={{ background: "#FFFFFF", border: "1px solid #D5DBDA", borderRadius: "8px", padding: "9px 14px", fontSize: "13px", fontWeight: 600, color: "#004643", cursor: "pointer" }}>Print PDF</button>
                <button type="button" onClick={() => { setPackingExported(true); showToast("Packing list exported · packing-list.csv"); }} style={{ background: "#004643", color: "#FFFFFF", border: "none", borderRadius: "8px", padding: "9px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Download CSV</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            maxWidth: "calc(100% - 32px)",
            width: "420px",
            background: "#004643",
            color: "#FFFFFF",
            borderRadius: "12px",
            padding: "12px 16px",
            fontSize: "13px",
            boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* ── FLOATING JOURNEY STATES SWITCHER ── */}
      <div
        style={{
          position: "fixed",
          right: "16px",
          bottom: "16px",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "8px",
          maxWidth: "calc(100vw - 32px)",
        }}
      >
        {journeyPanelOpen && (
          <div
            style={{
              width: "320px",
              maxWidth: "100%",
              maxHeight: "70vh",
              overflow: "auto",
              background: "#FFFFFF",
              border: "1px solid #EAEDEC",
              borderRadius: "12px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08)",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#101212" }}>Journey states</span>
              <span style={{ fontSize: "11px", color: "#8E9493" }}>Vendor lifecycle</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {[
                {
                  stage: "pending" as const,
                  label: "1. Pending review",
                  desc: "Completed onboarding · awaiting admin approval (Image 1)",
                },
                {
                  stage: "new_vendor" as const,
                  label: "2. Approved — first login",
                  desc: "Admin approved · 4-step start selling checklist (Image 2)",
                },
                {
                  stage: "established" as const,
                  label: "3. Established vendor",
                  desc: "Real-time KPIs, charts, orders to fulfil & alerts (Image 3)",
                },
              ].map((item) => {
                const isSelected = vendorStage === item.stage;
                return (
                  <button
                    key={item.stage}
                    type="button"
                    onClick={() => handleSelectStage(item.stage)}
                    style={{
                      textAlign: "left",
                      background: isSelected ? "#F3FEFD" : "#FFFFFF",
                      border: isSelected ? "1px solid #87DDD7" : "1px solid #EAEDEC",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "#F1F4F4";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "#FFFFFF";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#101212" }}>
                        {item.label}
                      </span>
                      {isSelected && (
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#004643", background: "#C3F4F0", padding: "1px 6px", borderRadius: "999px" }}>
                          Active
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "11px", color: "#646968" }}>{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setJourneyPanelOpen(!journeyPanelOpen)}
          style={{
            background: "#101212",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "999px",
            padding: "9px 14px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>{journeyPanelOpen ? "Hide journey states" : "Journey states"}</span>
          <span
            style={{
              fontSize: "10px",
              background: "rgba(255,255,255,0.2)",
              padding: "1px 6px",
              borderRadius: "999px",
            }}
          >
            {vendorStage === "pending" ? "Pending" : vendorStage === "new_vendor" ? "First login" : "Established"}
          </span>
        </button>
      </div>
    </div>
  );
}
