"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import VendorPaymentsPanel from "@/components/vendor/VendorPaymentsPanel";
import { useVendorStore } from "@/lib/store";
import { createClient } from "@/utils/supabase/client";
import {
  getVendorOrders,
  dispatchVendorShipment,
  updateVendorShipmentStatus,
  updateVendorOrderStage,
  type VendorShipment,
  type VendorOrdersData,
} from "@/lib/api/vendor";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/sell/dashboard", icon: "grid" },
  { id: "orders", label: "Orders", href: "/sell/orders", icon: "package" },
  { id: "products", label: "Products", href: "/sell/products", icon: "tag" },
  { id: "returns", label: "Returns", href: "/sell/returns", icon: "refresh" },
  { id: "payments", label: "Payments", href: "/sell/payments", icon: "credit-card" },
  { id: "support", label: "Support", href: "/sell/support", icon: "message" },
  { id: "marketplace", label: "Marketplace", href: "/marketplace", icon: "store" },
  { id: "settings", label: "Settings", href: "/sell/settings", icon: "settings" },
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
    case "store":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9 4.5 3h15L21 9v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
          <path d="M3 9h18" />
          <path d="M10 13a2 2 0 0 0 4 0" />
        </svg>
      );
    default:
      return null;
  }
}

export type VendorJourneyStage = "pending" | "new_vendor" | "established";

export type VendorSection = "dashboard" | "orders" | "products" | "returns" | "payments" | "support" | "marketplace" | "settings";

export default function VendorDashboardView({
  initialSection = "dashboard",
}: {
  initialSection?: VendorSection;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const activeNav = useMemo<VendorSection>(() => {
    if (pathname?.startsWith("/sell/orders")) return "orders";
    if (pathname?.startsWith("/sell/products")) return "products";
    if (pathname?.startsWith("/sell/returns")) return "returns";
    if (pathname?.startsWith("/sell/payments")) return "payments";
    if (pathname?.startsWith("/sell/support")) return "support";
    if (pathname?.startsWith("/sell/settings")) return "settings";
    if (pathname?.startsWith("/sell/dashboard")) return "dashboard";
    return initialSection || "dashboard";
  }, [pathname, initialSection]);

  const setActiveNav = useCallback(
    (section: string) => {
      router.push(`/sell/${section}`);
    },
    [router]
  );

  const storeProfile = useVendorStore((state) => state.storeProfile);
  const setStoreProfile = useVendorStore((state) => state.setStoreProfile);
  const accountData = useVendorStore((state) => state.accountData);
  const legalDocs = useVendorStore((state) => state.legalDocs);
  const submittedAt = useVendorStore((state) => state.submittedAt);
  const applicationStatus = useVendorStore((state) => state.applicationStatus);
  const stripeConnected = useVendorStore((state) => state.stripeConnected);
  const [settingsTab, setSettingsTab] = useState<"profile" | "legal" | "payout">("profile");
  const [mounted, setMounted] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [storeNameInput, setStoreNameInput] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Vendor journey lifecycle state (Pending review, New vendor approved, Established vendor)
  const [vendorStage, setVendorStage] = useState<VendorJourneyStage>("pending");
  const [deliveryRegionsDone, setDeliveryRegionsDone] = useState(false);
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
  const productsRef = useRef(products);
  productsRef.current = products;
  const [isRefreshing, setIsRefreshing] = useState(false);
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
  const [nlImages, setNlImages] = useState<Array<{ id: string; url: string; name: string; isUploading?: boolean; error?: string }>>([]);
  const [nlModel, setNlModel] = useState<{ url: string; name: string; size?: number; isUploading?: boolean; error?: string } | null>(null);
  const [nlErr, setNlErr] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

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
    shipmentId: string;
    orderNumber: string;
    rawOrderId?: string;
    placed: string;
    cust: string;
    city: string;
    street?: string;
    postcode?: string;
    value: number;
    due: string;
    overdue: boolean;
    status: OrderStatus;
    /** production_stage from DB — restored on page refresh for factory orders. */
    productionStage?: string;
    shipmentStatus?: string;
    carrierCode?: string;
    tracking?: string;
    trackingUrl?: string;
    addr?: { from: string; to: string; auto: boolean };
    lines: OrderLine[];
    history?: Array<{ at: string; text: string }>;
  }

  // ── ORDER STATE ───────────────────────────────────────────────────────────
  const isFactory = (storeProfile.fulfillmentType || "Factory").toLowerCase() !== "retailer";
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  // Track order IDs that the vendor has locally advanced so the polling sync
  // never overwrites those changes with stale API data.
  const locallyModifiedOrderIds = useRef<Set<string>>(new Set());
  const [orderTab, setOrderTab] = useState<"To fulfil" | "Shipped" | "Delivered" | "All">("To fulfil");
  const [carriers, setCarriers] = useState<string[]>([
    "ARAMEX",
    "DHL",
    "FEDEX",
    "UPS",
    "SMSA",
    "NAQEL",
    "OTHER",
  ]);
  const [selectedCarrier, setSelectedCarrier] = useState<string>("SMSA");
  const [orderCounts, setOrderCounts] = useState<{
    to_fulfil: number;
    shipped: number;
    delivered: number;
    all: number;
  }>({ to_fulfil: 0, shipped: 0, delivered: 0, all: 0 });
  const [isDispatching, setIsDispatching] = useState(false);
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

  const advanceOrder = async (o: VendorOrder) => {
    const flow = isFactory ? FLOW_FACTORY : FLOW_RETAILER;
    const idx = flow.indexOf(o.status);
    const next = flow[idx + 1];
    if (!next) return;

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Dispatch flow: "Add tracking and ship" -> POST /vendor/orders/:shipmentId/dispatch
    // ──────────────────────────────────────────────────────────────────────────
    if (next === "shipped") {
      const tracking = trackingInput.trim();
      if (!tracking) {
        setTrackingErr("A tracking number is required.");
        return;
      }
      if (tracking.length < 5) {
        setTrackingErr("The carrier doesn't recognise this tracking number. Status not advanced — check the number and try again.");
        return;
      }

      setIsDispatching(true);
      setTrackingErr("");

      const shipmentId = o.shipmentId || o.rawOrderId || o.id;
      const res = await dispatchVendorShipment(shipmentId, {
        carrier_code: selectedCarrier || "SMSA",
        tracking_number: tracking,
      });

      setIsDispatching(false);

      if (!res.success) {
        // As instructed in handover doc: server error is shown, do NOT advance local state on failure!
        setTrackingErr(typeof res.error === "string" ? res.error : "Failed to dispatch shipment.");
        return;
      }

      const updated = res.data;
      locallyModifiedOrderIds.current.add(o.id);
      if (o.shipmentId) locallyModifiedOrderIds.current.add(o.shipmentId);

      setOrders(prev =>
        prev.map(x =>
          x.id === o.id || (o.shipmentId && x.shipmentId === o.shipmentId)
            ? {
                ...x,
                status: "shipped",
                shipmentStatus: updated?.shipment_status || "in_transit",
                overdue: false,
                carrierCode: updated?.carrier_code || selectedCarrier,
                tracking: updated?.tracking_number || tracking,
                trackingUrl: updated?.tracking_url || undefined,
              }
            : x
        )
      );

      setTrackingInput("");
      setTrackingErr("");
      showToast(`${o.id} dispatched with ${updated?.carrier_code || selectedCarrier}. Shopper notified.`);

      // Sync backend to refresh server counts and tracking events
      syncVendorListingsAndOrders();
      return;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Status update flow: POST /vendor/orders/:shipmentId/status
    // ──────────────────────────────────────────────────────────────────────────
    if (next === "delivered" && o.shipmentId) {
      const res = await updateVendorShipmentStatus(o.shipmentId, { status: "delivered" });
      if (!res.success) {
        showToast(typeof res.error === "string" ? res.error : "Failed to update shipment status.");
        return;
      }
      locallyModifiedOrderIds.current.add(o.id);
      locallyModifiedOrderIds.current.add(o.shipmentId);
      setOrders(prev =>
        prev.map(x =>
          x.id === o.id || x.shipmentId === o.shipmentId
            ? { ...x, status: "delivered", shipmentStatus: "delivered", overdue: false }
            : x
        )
      );
      showToast(`${o.id} marked as delivered.`);
      syncVendorListingsAndOrders();
      return;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Factory pre-dispatch stages (materials -> production -> qc -> ready)
    //    Persist to DB so the stage survives a page refresh.
    // ──────────────────────────────────────────────────────────────────────────
    const stageRes = await updateVendorOrderStage(
      o.shipmentId || o.rawOrderId || o.id,
      next as "materials" | "production" | "qc" | "ready"
    );

    if (!stageRes.success) {
      // Do NOT advance local state on failure — same rule as dispatch.
      showToast(
        typeof stageRes.error === "string"
          ? stageRes.error
          : `Failed to advance to ${ST_BADGE[next as OrderStatus]?.label || next}.`
      );
      return;
    }

    locallyModifiedOrderIds.current.add(o.id);
    if (o.shipmentId) locallyModifiedOrderIds.current.add(o.shipmentId);
    setOrders(prev =>
      prev.map(x =>
        x.id === o.id || (o.shipmentId && x.shipmentId === o.shipmentId)
          ? { ...x, status: next, productionStage: next, overdue: false }
          : x
      )
    );
    showToast(`${o.id} moved to ${ST_BADGE[next as OrderStatus]?.label || next}.`);
    // Event-driven sync after advancing factory stage
    syncVendorListingsAndOrders();
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
      let token: string | undefined;
      let sessionEmail: string | undefined;
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
        sessionEmail = session?.user?.email;
      } catch {}

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/vendor/status", {
        method: "POST",
        headers,
        body: JSON.stringify({
          workEmail: accountData.workEmail || sessionEmail,
          businessName: accountData.businessName || storeProfile.storeName,
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
          const fourStepsDone =
            typeof window !== "undefined" &&
            (localStorage.getItem("nooi-vendor-four-steps-done") === "true" ||
              (stripeConnected && productsRef.current.length > 0 && deliveryRegionsDone));
          setVendorStage(fourStepsDone ? "established" : "new_vendor");
        } else {
          useVendorStore.getState().setApplicationStatus(v.status || "submitted");
          setVendorStage("pending");
        }
      }
    } catch (err) {
      console.warn("[Dashboard] Failed to sync vendor status:", err);
    }
  }, [accountData.workEmail, accountData.businessName, storeProfile.storeName, stripeConnected, deliveryRegionsDone, setStoreProfile]);

  const syncVendorListingsAndOrders = useCallback(async (isFirst = false) => {
    try {
      let token: string | undefined;
      let sessionEmail: string | undefined;
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
        sessionEmail = session?.user?.email;
      } catch {}

      const email = accountData.workEmail || sessionEmail;
      const businessName = accountData.businessName || storeProfile.storeName;
      const params = new URLSearchParams();
      if (email) params.set("email", email);
      if (businessName) params.set("businessName", businessName);

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // 1. Sync live listings
      const resListings = await fetch(`/api/vendor/listings?${params.toString()}`, { headers });
      if (resListings.ok) {
        const data = await resListings.json();
        if (data.success && Array.isArray(data.products)) {
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
            const uniquePrev = prev.filter((p) => !apiIds.has(p.id) && !p.id.startsWith("temp-"));
            return [...apiProducts, ...uniquePrev];
          });
        }
      }

      // 2. Sync vendor orders from Express backend (/vendor/orders)
      // Returns shipments scoped to the vendor's retailers with address, items, and carriers list
      const resOrders = await getVendorOrders("all");
      if (resOrders.success && resOrders.data) {
        const { shipments: backendShipments, counts: backendCounts, carriers: backendCarriers } = resOrders.data;

        if (Array.isArray(backendCarriers) && backendCarriers.length > 0) {
          setCarriers(backendCarriers);
          if (!backendCarriers.includes(selectedCarrier)) {
            setSelectedCarrier(backendCarriers[0]);
          }
        }

        if (backendCounts) {
          setOrderCounts(backendCounts);
        }

        if (Array.isArray(backendShipments)) {
          const mappedOrders: VendorOrder[] = backendShipments.map((s: any) => {
            const placedDate = new Date(s.placed_at || Date.now());
            const placedFormatted =
              placedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
              " · " +
              placedDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

            const estDate = s.estimated_delivery
              ? new Date(s.estimated_delivery)
              : new Date(placedDate.getTime() + 14 * 24 * 60 * 60 * 1000);
            const dueFormatted = estDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
            const isOverdue = estDate.getTime() < Date.now() && s.shipment_status !== "delivered";

            let uiStatus: OrderStatus = "paid";
            if (s.shipment_status === "delivered") {
              uiStatus = "delivered";
            } else if (
              s.shipment_status === "in_transit" ||
              s.shipment_status === "dispatched" ||
              s.shipment_status === "out_for_delivery" ||
              Boolean(s.tracking_number)
            ) {
              uiStatus = "shipped";
            } else if (s.shipment_status === "label_created") {
              uiStatus = "ready";
            } else {
              uiStatus = "paid";
            }

            const deliverTo = s.deliver_to || {};

            const lines: OrderLine[] = (s.items || []).map((it: any) => ({
              n: it.title || "Furniture Item",
              q: it.quantity || 1,
              p: Math.round((Number(s.value) / (Number(s.item_count) || 1)) || 0),
              d: dueFormatted,
              m: it.sku || "Standard",
              c: it.color || "Standard",
            }));

            return {
              id: s.order_number || `SHIP-${s.id.slice(0, 6)}`,
              shipmentId: s.id,
              orderNumber: s.order_number || s.id,
              rawOrderId: s.order_id || s.id,
              placed: placedFormatted,
              cust: deliverTo.name || "Customer",
              city: deliverTo.city || "Riyadh",
              street: deliverTo.street || "",
              postcode: deliverTo.postcode || "",
              value: Number(s.value) || 0,
              due: dueFormatted,
              overdue: isOverdue,
              status: uiStatus,
              shipmentStatus: s.shipment_status,
              carrierCode: s.carrier_code || undefined,
              tracking: s.tracking_number || undefined,
              trackingUrl: s.tracking_url || undefined,
              lines: lines.length > 0 ? lines : [{ n: "Furniture Item", q: 1, p: Number(s.value) || 0, d: dueFormatted }],
            };
          });

          setOrders(prev => {
            const localMap = new Map(prev.map(o => [o.shipmentId || o.id, o]));
            const modified = locallyModifiedOrderIds.current;

            const merged = mappedOrders.map((apiOrder: VendorOrder) => {
              const key = apiOrder.shipmentId || apiOrder.id;
              if (modified.has(key) || modified.has(apiOrder.id)) {
                return localMap.get(key) || localMap.get(apiOrder.id) || apiOrder;
              }
              return apiOrder;
            });

            return merged;
          });
        }
      } else {
        // Fallback: sync from internal route if Express backend returned no data
        const resOrdersInternal = await fetch(`/api/vendor/orders?${params.toString()}`, { headers });
        if (resOrdersInternal.ok) {
          const ordData = await resOrdersInternal.json();
          if (ordData.success && Array.isArray(ordData.orders)) {
            setOrders(prev => {
              const localMap = new Map(prev.map(o => [o.id, o]));
              const modified = locallyModifiedOrderIds.current;
              return ordData.orders.map((apiOrder: any) => {
                if (modified.has(apiOrder.id)) return localMap.get(apiOrder.id) ?? apiOrder;
                return {
                  ...apiOrder,
                  shipmentId: apiOrder.shipmentId || apiOrder.rawOrderId || apiOrder.id,
                  orderNumber: apiOrder.orderNumber || apiOrder.id,
                };
              });
            });
          }
        }
      }
    } catch (err) {
      console.warn("[Dashboard] Sync listings/orders error:", err);
    } finally {
      if (isFirst) setDataLoading(false);
    }
  }, [accountData.workEmail, accountData.businessName, storeProfile.storeName]);

  useEffect(() => {
    useVendorStore.persist.rehydrate();
    setMounted(true);
    if (typeof window !== "undefined") {
      const delivDone = localStorage.getItem("nooi-vendor-delivery-done") === "true";
      if (delivDone) setDeliveryRegionsDone(true);
      const fourStepsDone =
        localStorage.getItem("nooi-vendor-four-steps-done") === "true" ||
        (stripeConnected && products.length > 0 && delivDone);

      if (applicationStatus === "approved") {
        setVendorStage(fourStepsDone ? "established" : "new_vendor");
      } else {
        setVendorStage("pending");
      }
    }

    import("@/lib/api/auth").then(({ getCurrentUser }) => {
      getCurrentUser().then((userRes) => {
        if (userRes.success && userRes.data?.user) {
          const u = userRes.data.user;
          if (u.email && !accountData.workEmail) {
            useVendorStore.getState().setAccountData({ workEmail: u.email, fullName: u.full_name });
          }
          if (u.vendor_status === "approved") {
            useVendorStore.getState().setApplicationStatus("approved");
            const fourStepsDone = typeof window !== "undefined" && localStorage.getItem("nooi-vendor-four-steps-done") === "true";
            setVendorStage(fourStepsDone ? "established" : "new_vendor");
          } else if (u.vendor_status) {
            setVendorStage("pending");
          }
        }
      });
    });

    // Perform live sync with database immediately on mount
    syncVendorStatus();
    syncVendorListingsAndOrders(true);

    // Background sync safety net (60 seconds, reduced from 5s)
    // Only poll when browser tab is active to eliminate redundant requests
    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      syncVendorStatus();
      syncVendorListingsAndOrders();
    }, 60000);

    // Live refresh when vendor returns focus to the tab
    const handleVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        syncVendorStatus();
        syncVendorListingsAndOrders();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      clearInterval(pollInterval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, [applicationStatus, syncVendorStatus, syncVendorListingsAndOrders]);

  // Automatically transition from new_vendor (first login) to established when the 4 steps are complete
  useEffect(() => {
    if (vendorStage === "new_vendor" && stripeConnected && products.length > 0 && deliveryRegionsDone) {
      if (typeof window !== "undefined") {
        localStorage.setItem("nooi-vendor-four-steps-done", "true");
      }
      setVendorStage("established");
    }
  }, [vendorStage, stripeConnected, products.length, deliveryRegionsDone]);

  useEffect(() => {
    if (mounted) {
      setStoreNameInput(storeProfile.storeName || accountData.businessName || "Atelier Rawda");
    }
  }, [mounted, storeProfile.storeName, accountData.businessName]);

  if (!mounted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#FBFCFC",
          display: "flex",
          fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
        }}
      >
        {/* Sidebar skeleton */}
        <aside
          style={{
            width: "248px",
            flexShrink: 0,
            background: "#FFFFFF",
            borderRight: "1px solid #EAEDEC",
            display: "flex",
            flexDirection: "column",
            padding: "20px 16px",
            gap: "12px",
          }}
        >
          {/* Logo placeholder */}
          <div style={{ width: 80, height: 20, borderRadius: 4, background: "#EAEDEC" }} />
          {/* Store card placeholder */}
          <div style={{ height: 48, borderRadius: 8, background: "#F1F4F4" }} />
          {/* Nav items placeholders */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                style={{
                  height: 38,
                  borderRadius: 8,
                  background: i === 1 ? "#F3FEFD" : "#F8FAFA",
                  animation: "pulse 1.5s ease-in-out infinite",
                  opacity: 1 - i * 0.07,
                }}
              />
            ))}
          </div>
        </aside>

        {/* Main content skeleton */}
        <main style={{ flex: 1, padding: "32px 40px", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Header bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ width: 200, height: 28, borderRadius: 6, background: "#EAEDEC" }} />
            <div style={{ width: 120, height: 36, borderRadius: 8, background: "#EAEDEC" }} />
          </div>
          {/* Stat cards row */}
          <div style={{ display: "flex", gap: 16 }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 96,
                  borderRadius: 12,
                  background: "#F1F4F4",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
          {/* Content block */}
          <div style={{ flex: 1, minHeight: 300, borderRadius: 12, background: "#F1F4F4", animation: "pulse 1.5s ease-in-out infinite" }} />
        </main>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

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
    setDeliveryRegionsDone(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("nooi-vendor-delivery-done", "true");
    }
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
    setNlImages([]);
    setNlModel(null);
    setNlErr("");
    setIsNewListingOpen(true);
  };

  const handleUploadImages = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (!fileList.length) return;
    setNlErr("");

    const newSlots = fileList.map((f, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      url: "",
      name: f.name,
      isUploading: true,
    }));

    setNlImages((prev) => [...prev, ...newSlots]);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const slotId = newSlots[i].id;
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "asset");
        formData.append("assetType", "product_image");
        if (accountData.workEmail) {
          formData.append("workEmail", accountData.workEmail);
        }

        const res = await fetch("/api/vendor/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.success && data.url) {
          setNlImages((prev) =>
            prev.map((slot) =>
              slot.id === slotId
                ? { ...slot, url: data.url, isUploading: false }
                : slot
            )
          );
        } else {
          setNlImages((prev) =>
            prev.map((slot) =>
              slot.id === slotId
                ? { ...slot, isUploading: false, error: data.error || "Upload failed" }
                : slot
            )
          );
        }
      } catch (err: any) {
        setNlImages((prev) =>
          prev.map((slot) =>
            slot.id === slotId
              ? { ...slot, isUploading: false, error: err?.message || "Upload error" }
              : slot
          )
        );
      }
    }
  };

  const handleUploadModel = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".glb") && !file.type.includes("gltf")) {
      setNlErr("Please select a valid .glb 3D model file.");
      return;
    }
    setNlErr("");
    setNlModel({
      url: "",
      name: file.name,
      size: file.size,
      isUploading: true,
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "asset");
      formData.append("assetType", "product_model");
      if (accountData.workEmail) {
        formData.append("workEmail", accountData.workEmail);
      }

      const res = await fetch("/api/vendor/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success && data.url) {
        setNlModel({
          url: data.url,
          name: file.name,
          size: file.size,
          isUploading: false,
        });
      } else {
        setNlModel(null);
        setNlErr(data.error || "Failed to upload 3D model file.");
      }
    } catch (err: any) {
      setNlModel(null);
      setNlErr(err?.message || "3D model upload failed.");
    }
  };

  const handleSaveDraft = () => {
    if (nlTitle.trim()) {
      const validImages = nlImages.filter((img) => img.url && !img.isUploading);
      setProducts((prev) => [
        {
          id: String(Date.now()),
          title: nlTitle.trim(),
          cat: nlCat === "Choose" ? "Uncategorised" : nlCat,
          kind: nlKind,
          price: nlPrice,
          stock: nlStock,
          vars: nlVars,
          imgCount: validImages.length,
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
    setNlErr("");
    const validImages = nlImages.filter((img) => img.url && !img.isUploading).map((img) => img.url);
    const finalImages =
      validImages.length > 0
        ? validImages
        : [`https://picsum.photos/seed/${encodeURIComponent(nlTitle.trim())}/800/600`];

    try {
      let token: string | undefined;
      let sessionEmail: string | undefined;
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
        sessionEmail = session?.user?.email;
      } catch (authErr) {
        console.warn("[Dashboard] Could not fetch Supabase session:", authErr);
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const storeName = storeProfile.storeName || accountData.businessName || "Vendor Store";
      const workEmail = accountData.workEmail || sessionEmail;

      const res = await fetch("/api/vendor/listings", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: nlTitle.trim(),
          category: nlCat === "Choose" ? "Sofas" : nlCat,
          type: nlKind,
          price: nlPrice,
          stock: nlStock,
          variants: nlVars,
          images: finalImages,
          model_url: nlModel?.url || undefined,
          // is_returnable is false for made-to-order and custom pieces; shoppers
          // are shown a "no returns" notice on the product and order pages.
          is_returnable: nlKind === "In stock",
          storeName,
          businessName: accountData.businessName || storeName,
          workEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to publish listing to the marketplace.");
      }

      const created = data.product;
      const newProductEntry = {
        id: created.id,
        title: created.title || nlTitle.trim(),
        cat: created.category || (nlCat === "Choose" ? "Sofas" : nlCat),
        kind: created.specs_json?.kind || nlKind,
        price: String(created.base_price || nlPrice),
        stock: String(created.specs_json?.stock || nlStock),
        vars: (created.variants || nlVars || []).map((v: any, idx: number) => ({
          id: v.id || String(idx + 1),
          name: v.color || v.name || "Standard",
          sku: v.sku || "",
          stock: String(v.stock_quantity || v.stock || "10"),
        })),
        imgCount: finalImages.length,
        status: "live" as const,
        updatedAt: new Date(created.created_at || Date.now()),
      };

      setProducts((prev) => [newProductEntry, ...prev.filter((p) => p.id !== created.id)]);
      setIsNewListingOpen(false);
      setActiveNav("products");
      showToast("Listing published! Your furniture is now live on the marketplace.");

      // Align state with backend
      syncVendorListingsAndOrders();
    } catch (err: any) {
      console.error("[Dashboard] Error publishing listing to API:", err);
      const msg = err.message || "Failed to publish listing.";
      setNlErr(msg);
      showToast(msg);
    } finally {
      setIsPublishing(false);
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
                ? orders.filter((o) => !["shipped", "delivered", "rts"].includes(o.status)).length || undefined
                : undefined;

            return (
              <Link
                key={item.id}
                href={item.href}
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
                  textDecoration: "none",
                  boxSizing: "border-box",
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
              </Link>
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
              {vendorStage === "established" && (orders.some((o) => o.overdue) || products.some((p) => p.status === "changes_requested")) && (
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
                    {!orders.some((o) => o.overdue) && !products.some((p) => p.status === "changes_requested") ? (
                      <div style={{ padding: "10px", fontSize: "13px", color: "#646968" }}>
                        No notifications yet. Order and review updates will show here.
                      </div>
                    ) : (
                      <>
                        {orders.filter((o) => o.overdue).map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => {
                              setOpenOrderId(o.id);
                              setActiveNav("orders");
                              setBellOpen(false);
                            }}
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
                          >
                            <span style={{ fontSize: "13px", color: "#812F28", fontWeight: 600 }}>
                              {o.id} is overdue
                            </span>
                            <span style={{ fontSize: "12px", color: "#8E9493" }}>Due {o.due}</span>
                          </button>
                        ))}
                        {products.filter((p) => p.status === "changes_requested").map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setActiveNav("products");
                              setBellOpen(false);
                            }}
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
                          >
                            <span style={{ fontSize: "13px", color: "#101212", fontWeight: 500 }}>
                              Changes requested on {p.title}
                            </span>
                            <span style={{ fontSize: "12px", color: "#8E9493" }}>Awaiting updates</span>
                          </button>
                        ))}
                      </>
                    )}
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
            // LOADING SKELETON — shown while API sync is in flight so the correct
            // dashboard variant (pending / new_vendor / established) is never
            // flashed prematurely.
            // ════════════════════════════════════════════════════════════════════
            if (dataLoading) {
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Greeting placeholder */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ width: 260, height: 28, borderRadius: 6, background: "#EAEDEC", animation: "pulse 1.5s ease-in-out infinite" }} />
                    <div style={{ width: 180, height: 16, borderRadius: 4, background: "#F1F4F4", animation: "pulse 1.5s ease-in-out infinite" }} />
                  </div>

                  {/* KPI stat cards row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: 12, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ width: "60%", height: 12, borderRadius: 3, background: "#F1F4F4", animation: "pulse 1.5s ease-in-out infinite" }} />
                        <div style={{ width: "80%", height: 22, borderRadius: 4, background: "#EAEDEC", animation: "pulse 1.5s ease-in-out infinite" }} />
                        <div style={{ width: "50%", height: 10, borderRadius: 3, background: "#F1F4F4", animation: "pulse 1.5s ease-in-out infinite" }} />
                      </div>
                    ))}
                  </div>

                  {/* Main content block */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: 16 }}>
                    <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: 12, height: 220, animation: "pulse 1.5s ease-in-out infinite" }} />
                    <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: 12, height: 220, animation: "pulse 1.5s ease-in-out infinite" }} />
                  </div>

                  <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
                </div>
              );
            }

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
                            border: products.length > 0 ? "1.5px solid #004643" : "1.5px solid #B3B9B9",
                            background: products.length > 0 ? "#004643" : "#FFFFFF",
                            color: "#FFFFFF",
                            fontSize: "11px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: "1px",
                          }}
                        >
                          {products.length > 0 ? "✓" : ""}
                        </span>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "14px", fontWeight: 600, color: "#101212" }}>
                            Create your first listing
                          </span>
                          <span style={{ fontSize: "12px", color: "#646968" }}>
                            {products.length > 0
                              ? `${products.length} listing${products.length > 1 ? "s" : ""} added`
                              : "Listings are reviewed within 1 business day"}
                          </span>
                        </div>
                        {products.length === 0 ? (
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
                        ) : null}
                      </div>

                      {/* Step 4: Set delivery regions */}
                      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                        <span
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "999px",
                            border: deliveryRegionsDone ? "1.5px solid #004643" : "1.5px solid #B3B9B9",
                            background: deliveryRegionsDone ? "#004643" : "#FFFFFF",
                            color: "#FFFFFF",
                            fontSize: "11px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: "1px",
                          }}
                        >
                          {deliveryRegionsDone ? "✓" : ""}
                        </span>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "14px", fontWeight: 600, color: "#101212" }}>
                            Set delivery regions
                          </span>
                          <span style={{ fontSize: "12px", color: "#646968" }}>
                            {deliveryRegionsDone
                              ? "Delivery regions set"
                              : "Choose where you deliver and your lead times"}
                          </span>
                        </div>
                        {!deliveryRegionsDone ? (
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
                        ) : null}
                      </div>

                      {stripeConnected && products.length > 0 && deliveryRegionsDone && (
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              localStorage.setItem("nooi-vendor-four-steps-done", "true");
                            }
                            setVendorStage("established");
                          }}
                          style={{
                            marginTop: "8px",
                            background: "#004643",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: "8px",
                            padding: "10px 16px",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                          }}
                        >
                          Continue to vendor dashboard →
                        </button>
                      )}
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
            // Starts from clean empty state; only latest/live data is shown
            // ════════════════════════════════════════════════════════════════════
            const toFulfilOrders = orders.filter((o) => !["shipped", "delivered", "rts"].includes(o.status));
            const overdueOrders = toFulfilOrders.filter((o) => o.overdue);
            const deliveredOrders = orders.filter((o) => o.status === "delivered");
            const kpiEarnings = deliveredOrders.reduce((sum, o) => sum + o.value * 0.88, 0);

            const kpiListingsLive = products.filter((p) => p.status === "live").length;
            const kpiListingsPending = products.filter((p) => p.status === "pending_review").length;
            const kpiListingsChanges = products.filter((p) => p.status === "changes_requested").length;
            const kpiListingsDraft = products.filter((p) => p.status === "draft").length;

            const kpiNextPayout = kpiEarnings;

            // Real dynamic alerts
            const dynamicAlerts: Array<{ id: string; title: string; body: string; action: string; go: () => void }> = [];
            overdueOrders.slice(0, 3).forEach((o) => {
              dynamicAlerts.push({
                id: `alert-overdue-${o.id}`,
                title: `${o.id} is overdue`,
                body: `${ST_BADGE[o.status]?.label || o.status} · due ${o.due}`,
                action: "Open",
                go: () => {
                  setOpenOrderId(o.id);
                  setActiveNav("orders");
                },
              });
            });
            products.filter((p) => p.status === "changes_requested").slice(0, 2).forEach((p) => {
              dynamicAlerts.push({
                id: `alert-prod-${p.id}`,
                title: p.title,
                body: "Changes requested by reviewer",
                action: "Review",
                go: () => {
                  setActiveNav("products");
                },
              });
            });

            // Real month labels for last 6 months
            const chartMonths: string[] = [];
            for (let i = 5; i >= 0; i--) {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
              chartMonths.push(d.toLocaleDateString("en-GB", { month: "short" }));
            }

            // Listings stacked bar data
            const lstLive    = kpiListingsLive;
            const lstPending = kpiListingsPending;
            const lstChanges = kpiListingsChanges;
            const lstDraft   = kpiListingsDraft;
            const lstTotal   = lstLive + lstPending + lstChanges + lstDraft;
            const lstPct     = (n: number) => (lstTotal > 0 ? `${((n / lstTotal) * 100).toFixed(1)}%` : "0%");

            const currentMonthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const currentRangeLabel = `1–${currentMonthDays} ${now.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;

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
                      {currentRangeLabel}
                    </span>
                  </div>
                </div>

                {/* ─ KPI cards (4-up) ─ */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                  {/* Net earnings */}
                  <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: "12px", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4B4F4F" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                      <span style={{ fontSize: "13px" }}>Net earnings · {now.toLocaleDateString("en-GB", { month: "long" })}</span>
                    </div>
                    <div style={{ fontSize: "26px", fontWeight: 600, color: "#101212", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
                      SAR {kpiEarnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: "12px", color: kpiEarnings > 0 ? "#28603A" : "#8E9493" }}>
                      {kpiEarnings > 0 ? "After 12% commission" : "No delivered sales yet"}
                    </div>
                  </div>

                  {/* Orders to fulfil */}
                  <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: "12px", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "10px", cursor: "pointer" }}
                    onClick={() => setActiveNav("orders")}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4B4F4F" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>
                      <span style={{ fontSize: "13px" }}>Orders to fulfil</span>
                    </div>
                    <div style={{ fontSize: "26px", fontWeight: 600, color: "#101212", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
                      {toFulfilOrders.length}
                    </div>
                    <div style={{ fontSize: "12px", color: overdueOrders.length > 0 ? "#812F28" : "#646968" }}>
                      {overdueOrders.length > 0 ? `${overdueOrders.length} overdue` : toFulfilOrders.length === 0 ? "All caught up" : "0 overdue"}
                    </div>
                  </div>

                  {/* Live listings */}
                  <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: "12px", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "10px", cursor: "pointer" }}
                    onClick={() => setActiveNav("products")}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4B4F4F" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/></svg>
                      <span style={{ fontSize: "13px" }}>Live listings</span>
                    </div>
                    <div style={{ fontSize: "26px", fontWeight: 600, color: "#101212", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
                      {kpiListingsLive}
                    </div>
                    <div style={{ fontSize: "12px", color: "#646968" }}>
                      {kpiListingsPending > 0
                        ? `${kpiListingsPending} awaiting review`
                        : kpiListingsLive === 0
                        ? "No live listings yet"
                        : "Active on marketplace"}
                    </div>
                  </div>

                  {/* Next payout */}
                  <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: "12px", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "10px", cursor: "pointer" }}
                    onClick={() => setActiveNav("payments")}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4B4F4F" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>
                      <span style={{ fontSize: "13px" }}>Next payout</span>
                    </div>
                    <div style={{ fontSize: "26px", fontWeight: 600, color: "#101212", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
                      SAR {kpiNextPayout.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: "12px", color: "#646968" }}>
                      {kpiNextPayout > 0 ? "Scheduled next cycle" : "No payouts scheduled"}
                    </div>
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
                    {toFulfilOrders.length === 0 ? (
                      <div style={{ padding: "40px 20px", textAlign: "center", color: "#646968", fontSize: "14px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "15px", fontWeight: 600, color: "#101212" }}>No orders to fulfil</span>
                        <span style={{ fontSize: "13px" }}>New customer orders will appear here automatically.</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {toFulfilOrders.slice(0, 5).map((o) => {
                          const badge = ST_BADGE[o.status] ?? ST_BADGE.paid;
                          const itemCount = `${o.lines.length} ${o.lines.length > 1 ? "items" : "item"}`;
                          return (
                            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: "12px 20px", borderTop: "1px solid #F1F4F4", background: "none", cursor: "pointer" }}
                              onClick={() => { setOpenOrderId(o.id); setActiveNav("orders"); }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#FBFCFC"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}>
                              <span style={{ flex: "1 1 160px", display: "flex", flexDirection: "column", minWidth: 0 }}>
                                <span style={{ fontSize: "14px", fontWeight: 600, color: "#101212" }}>{o.id}</span>
                                <span style={{ fontSize: "12px", color: "#646968" }}>{itemCount} · {o.cust}, {o.city}</span>
                              </span>
                              <span style={{ fontSize: "12px", color: o.overdue ? "#812F28" : "#4B4F4F", flex: "0 0 auto" }}>
                                {o.overdue ? `Overdue · due ${o.due}` : `Due ${o.due}`}
                              </span>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: badge.bg, color: badge.fg, fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px" }}>
                                <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: badge.dot }} />
                                {badge.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Needs attention panel */}
                  <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: "12px", display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <div style={{ padding: "16px 20px", fontSize: "15px", fontWeight: 600, color: "#101212" }}>
                      Needs attention
                    </div>
                    {dynamicAlerts.length === 0 ? (
                      <div style={{ padding: "40px 20px", textAlign: "center", color: "#646968", fontSize: "14px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "18px", color: "#437E54" }}>✓</span>
                        <span style={{ fontSize: "15px", fontWeight: 600, color: "#101212" }}>All caught up</span>
                        <span style={{ fontSize: "13px" }}>No items require your attention right now.</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {dynamicAlerts.map((a) => (
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
                    )}
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
                    {kpiEarnings === 0 && orders.length === 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "160px", gap: "6px", textAlign: "center" }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8E9493" strokeWidth="1.5">
                          <line x1="18" y1="20" x2="18" y2="10" />
                          <line x1="12" y1="20" x2="12" y2="4" />
                          <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#646968" }}>No earnings recorded yet</span>
                        <span style={{ fontSize: "12px", color: "#8E9493" }}>Monthly breakdown will appear once your orders are fulfilled</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", height: "160px", paddingTop: "8px" }}>
                        {chartMonths.map((m, idx) => {
                          const isCurrent = idx === chartMonths.length - 1;
                          const barHeight = isCurrent && kpiEarnings > 0 ? "80%" : "8%";
                          return (
                            <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", height: "100%", justifyContent: "flex-end" }}>
                              <div
                                style={{
                                  width: "100%",
                                  maxWidth: "40px",
                                  height: barHeight,
                                  background: isCurrent ? "#004643" : "#C3F4F0",
                                  borderRadius: "6px",
                                  transition: "height 0.3s ease",
                                }}
                              />
                              <span style={{ fontSize: "12px", color: "#646968" }}>{m}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                      {lstTotal === 0 ? (
                        <div style={{ width: "100%", background: "#EAEDEC" }} />
                      ) : (
                        <>
                          <div style={{ width: lstPct(lstLive), background: "#004643" }} />
                          <div style={{ width: lstPct(lstPending), background: "#C19E52" }} />
                          <div style={{ width: lstPct(lstChanges), background: "#D47165" }} />
                          <div style={{ width: lstPct(lstDraft), background: "#B3B9B9" }} />
                        </>
                      )}
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
                {/* Header with manual refresh */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "#101212" }}>Orders</h1>
                    <p style={{ margin: "2px 0 0", color: "#646968", fontSize: "14px" }}>Overdue orders are pinned to the top.</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsRefreshing(true);
                      await Promise.all([syncVendorStatus(), syncVendorListingsAndOrders()]);
                      setIsRefreshing(false);
                      showToast("Orders and listings refreshed.");
                    }}
                    disabled={isRefreshing}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#FFFFFF",
                      border: "1px solid #EAEDEC",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#343837",
                      cursor: isRefreshing ? "not-allowed" : "pointer",
                      opacity: isRefreshing ? 0.6 : 1,
                      transition: "all 0.15s ease",
                    }}
                    title="Refresh orders from server"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        animation: isRefreshing ? "spin 1s linear infinite" : "none",
                      }}
                    >
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                      <path d="M16 21h5v-5" />
                    </svg>
                    <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
                  </button>
                </div>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

                {dataLoading && orders.length === 0 ? (
                  /* Loading skeleton for orders table */
                  <div style={{ background: "#FFFFFF", border: "1px solid #EAEDEC", borderRadius: "12px", overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 20px", background: "#FBFCFC", borderBottom: "1px solid #EAEDEC", fontSize: "12px", fontWeight: 600, color: "#646968" }}>
                      <span style={{ width: "16px", flexShrink: 0 }} />
                      <span style={{ flex: "1 1 180px" }}>Order</span>
                      <span style={{ flex: "0 0 110px" }}>Placed</span>
                      <span style={{ flex: "0 0 130px" }}>Value</span>
                      <span style={{ flex: "0 0 170px" }}>Due date</span>
                      <span style={{ flex: "0 0 130px" }}>Status</span>
                    </div>
                    {[1, 2, 3].map((i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 20px", borderTop: i === 1 ? "none" : "1px solid #F1F4F4" }}>
                        <div style={{ width: 16, height: 14, borderRadius: 3, background: "#EAEDEC" }} />
                        <div style={{ flex: "1 1 180px", display: "flex", flexDirection: "column", gap: 5 }}>
                          <div style={{ height: 13, width: "50%", borderRadius: 3, background: "#EAEDEC", animation: "pulse 1.5s ease-in-out infinite" }} />
                          <div style={{ height: 11, width: "70%", borderRadius: 3, background: "#F1F4F4", animation: "pulse 1.5s ease-in-out infinite" }} />
                        </div>
                        <div style={{ flex: "0 0 110px", height: 13, borderRadius: 3, background: "#EAEDEC", animation: "pulse 1.5s ease-in-out infinite" }} />
                        <div style={{ flex: "0 0 130px", height: 13, borderRadius: 3, background: "#EAEDEC", animation: "pulse 1.5s ease-in-out infinite" }} />
                        <div style={{ flex: "0 0 170px", height: 13, borderRadius: 3, background: "#F1F4F4", animation: "pulse 1.5s ease-in-out infinite" }} />
                        <div style={{ flex: "0 0 130px", height: 22, borderRadius: 999, background: "#F1F4F4", animation: "pulse 1.5s ease-in-out infinite" }} />
                      </div>
                    ))}
                    <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
                  </div>
                ) : vendorStage === "established" || orders.length > 0 ? (
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
                        let cnt = 0;
                        if (t === "To fulfil") cnt = orderCounts.to_fulfil || orders.filter(oFilter[t]).length;
                        else if (t === "Shipped") cnt = orderCounts.shipped || orders.filter(oFilter[t]).length;
                        else if (t === "Delivered") cnt = orderCounts.delivered || orders.filter(oFilter[t]).length;
                        else cnt = orderCounts.all || orders.length;

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

                  {/* Loading skeleton rows */}
                  {dataLoading && products.length === 0 && (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {[1, 2, 3].map((i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 20px", borderTop: i === 1 ? "none" : "1px solid #F1F4F4" }}>
                          <div style={{ width: 16, height: 14, borderRadius: 3, background: "#EAEDEC" }} />
                          <div style={{ width: 36, height: 36, borderRadius: 6, background: "#F1F4F4" }} />
                          <div style={{ flex: "1 1 180px", display: "flex", flexDirection: "column", gap: 5 }}>
                            <div style={{ height: 13, width: "60%", borderRadius: 3, background: "#EAEDEC", animation: "pulse 1.5s ease-in-out infinite" }} />
                            <div style={{ height: 11, width: "30%", borderRadius: 3, background: "#F1F4F4", animation: "pulse 1.5s ease-in-out infinite" }} />
                          </div>
                          <div style={{ flex: "0 0 160px", height: 13, borderRadius: 3, background: "#EAEDEC", animation: "pulse 1.5s ease-in-out infinite" }} />
                          <div style={{ flex: "0 0 140px", height: 22, borderRadius: 999, background: "#F1F4F4", animation: "pulse 1.5s ease-in-out infinite" }} />
                          <div style={{ flex: "0 0 90px", height: 13, borderRadius: 3, background: "#EAEDEC", animation: "pulse 1.5s ease-in-out infinite" }} />
                          <div style={{ flex: "0 0 90px", height: 13, borderRadius: 3, background: "#F1F4F4", animation: "pulse 1.5s ease-in-out infinite" }} />
                          <div style={{ flex: "0 0 80px", height: 12, borderRadius: 3, background: "#EAEDEC", animation: "pulse 1.5s ease-in-out infinite" }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {!dataLoading && filtered.length === 0 && (
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
          {activeNav === "payments" && <VendorPaymentsPanel />}

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
                  "Images & 3D",
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

                  {/* No-returns warning — shown for Made to order & Custom size */}
                  {(nlKind === "Made to order" || nlKind === "Custom size") && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        background: "#FFFBF0",
                        border: "1px solid #F0C860",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        marginTop: "2px",
                      }}
                    >
                      <span style={{ fontSize: "15px", lineHeight: 1, flexShrink: 0, marginTop: "1px" }}>⚠</span>
                      <div style={{ fontSize: "12px", color: "#7A5200", lineHeight: "1.5" }}>
                        <strong style={{ fontWeight: 600 }}>No returns on this listing.</strong>{" "}
                        {nlKind === "Made to order"
                          ? "Made-to-order items are built specifically for each shopper and cannot be returned unless faulty."
                          : "Custom size items are made to the shopper's exact specifications and cannot be returned unless faulty."}
                        {" "}Shoppers will see this notice before and after purchase.
                      </div>
                    </div>
                  )}

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

              {/* STEP 2: Upload images & 3D Model */}
              {nlStep === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Hidden inputs */}
                  <input
                    type="file"
                    ref={imgInputRef}
                    multiple
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files) handleUploadImages(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <input
                    type="file"
                    ref={modelInputRef}
                    accept=".glb,model/gltf-binary"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleUploadModel(e.target.files[0]);
                      e.target.value = "";
                    }}
                  />

                  {/* Section 1: Product Images */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#101212" }}>
                        Product Images ({nlImages.length}/8)
                      </span>
                      <span style={{ fontSize: "12px", color: "#646968" }}>
                        First image is the main thumbnail
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" }}>
                      {nlImages.map((img, idx) => (
                        <div
                          key={img.id}
                          style={{
                            aspectRatio: "1",
                            borderRadius: "10px",
                            overflow: "hidden",
                            position: "relative",
                            border: "1px solid #D5DBDA",
                            background: "#F8FAFA",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {img.isUploading ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "8px", textAlign: "center" }}>
                              <div style={{ width: "20px", height: "20px", border: "2px solid #D5DBDA", borderTopColor: "#004643", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                              <span style={{ fontSize: "10px", color: "#646968" }}>Uploading…</span>
                            </div>
                          ) : img.error ? (
                            <div style={{ padding: "8px", textAlign: "center", color: "#812F28", fontSize: "10px" }}>
                              <div>Upload failed</div>
                              <button
                                type="button"
                                onClick={() => setNlImages((prev) => prev.filter((x) => x.id !== img.id))}
                                style={{ marginTop: "4px", fontSize: "10px", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "#812F28" }}
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img.url} alt={img.name || `Image ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              {idx === 0 && (
                                <span
                                  style={{
                                    position: "absolute",
                                    bottom: "6px",
                                    left: "6px",
                                    background: "#004643",
                                    color: "#FFFFFF",
                                    fontSize: "9.5px",
                                    fontWeight: 600,
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  Main image
                                </span>
                              )}
                              <button
                                type="button"
                                aria-label="Remove image"
                                onClick={() => setNlImages((prev) => prev.filter((x) => x.id !== img.id))}
                                style={{
                                  position: "absolute",
                                  top: "6px",
                                  right: "6px",
                                  background: "rgba(0,0,0,0.6)",
                                  color: "#FFFFFF",
                                  border: "none",
                                  borderRadius: "999px",
                                  width: "20px",
                                  height: "20px",
                                  fontSize: "12px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                }}
                              >
                                ×
                              </button>
                            </>
                          )}
                        </div>
                      ))}

                      {nlImages.length < 8 && (
                        <button
                          type="button"
                          onClick={() => imgInputRef.current?.click()}
                          style={{
                            aspectRatio: "1",
                            borderRadius: "10px",
                            border: "1.5px dashed #B3B9B9",
                            background: "#FBFCFC",
                            color: "#004643",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            padding: "8px",
                            transition: "border-color 0.15s ease, background 0.15s ease",
                          }}
                        >
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                          </svg>
                          <span style={{ fontSize: "11px", fontWeight: 600 }}>+ Add photos</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Section 2: 3D GLB Model for Canvas & AR */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid #EAEDEC", paddingTop: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#101212", display: "flex", alignItems: "center", gap: "6px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#004643" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m21 8-9-5-9 5v8l9 5 9-5Z" />
                          <path d="m3 8 9 5 9-5" />
                          <path d="M12 13v9" />
                        </svg>
                        3D Canvas & AR Model (.glb)
                      </span>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#004643", background: "#F3FEFD", border: "1px solid #87DDD7", padding: "2px 8px", borderRadius: "999px" }}>
                        Interactive 3D
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#646968", lineHeight: 1.4 }}>
                      Upload a 3D model in <strong>.glb</strong> format. Shoppers will be able to inspect your product in 360° 3D on the product page and place it inside the 3D room canvas.
                    </div>

                    {nlModel ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 14px",
                          borderRadius: "10px",
                          background: "#F3FEFD",
                          border: "1px solid #87DDD7",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                          <span style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#004643", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="m21 8-9-5-9 5v8l9 5 9-5Z" />
                              <path d="m3 8 9 5 9-5" />
                              <path d="M12 13v9" />
                            </svg>
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "#101212", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "230px" }}>
                              {nlModel.name}
                            </div>
                            <div style={{ fontSize: "11px", color: nlModel.isUploading ? "#004643" : "#28603A", fontWeight: 500 }}>
                              {nlModel.isUploading
                                ? "Uploading 3D model…"
                                : `✓ 3D Model Attached${nlModel.size ? ` · ${(nlModel.size / (1024 * 1024)).toFixed(1)} MB` : ""}`}
                            </div>
                          </div>
                        </div>

                        {!nlModel.isUploading && (
                          <button
                            type="button"
                            onClick={() => setNlModel(null)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#812F28",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              padding: "4px 8px",
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => modelInputRef.current?.click()}
                        style={{
                          width: "100%",
                          padding: "16px",
                          borderRadius: "10px",
                          border: "1.5px dashed #B3B9B9",
                          background: "#FBFCFC",
                          color: "#343837",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "10px",
                          transition: "border-color 0.15s ease, background 0.15s ease",
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#004643" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m21 8-9-5-9 5v8l9 5 9-5Z" />
                          <path d="m3 8 9 5 9-5" />
                          <path d="M12 13v9" />
                        </svg>
                        <span style={{ fontSize: "13px", fontWeight: 500 }}>
                          Click to select a <strong>.glb</strong> 3D model file
                        </span>
                      </button>
                    )}
                  </div>

                  {nlErr && (
                    <div style={{ fontSize: "12.5px", color: "#812F28", background: "#FDF2F2", padding: "8px 12px", borderRadius: "6px", border: "1px solid #F8D7DA" }}>
                      {nlErr}
                    </div>
                  )}

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
                        const hasValidImg = nlImages.some((x) => x.url && !x.isUploading);
                        if (!hasValidImg) {
                          setNlErr("Please upload at least 1 product image before continuing.");
                          return;
                        }
                        if (nlImages.some((x) => x.isUploading) || nlModel?.isUploading) {
                          setNlErr("Please wait for all uploads to complete before continuing.");
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
                      {nlImages.filter((x) => x.url).length} images uploaded
                    </span>

                    <span style={{ color: "#646968" }}>3D Model</span>
                    <span style={{ color: "#101212" }}>
                      {nlModel?.url ? `Attached (${nlModel.name})` : "None"}
                    </span>
                  </div>

                  <div style={{ fontSize: "13px", color: "#28603A", lineHeight: 1.5, background: "#E7FBEB", padding: "10px 14px", borderRadius: "8px", border: "1px solid #B7ECC8" }}>
                    ✓ Admin approval turned off. Your furniture will be posted directly to the marketplace and made available for shoppers to order immediately.
                  </div>

                  {/* Repeat no-returns notice on confirm step so vendor sees it before publishing */}
                  {(nlKind === "Made to order" || nlKind === "Custom size") && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        background: "#FFFBF0",
                        border: "1px solid #F0C860",
                        borderRadius: "8px",
                        padding: "10px 12px",
                      }}
                    >
                      <span style={{ fontSize: "15px", lineHeight: 1, flexShrink: 0, marginTop: "1px" }}>⚠</span>
                      <div style={{ fontSize: "12px", color: "#7A5200", lineHeight: "1.5" }}>
                        <strong style={{ fontWeight: 600 }}>No returns policy applies.</strong>{" "}
                        This listing will be marked as non-returnable. Shoppers will see this before and after purchase.
                      </div>
                    </div>
                  )}

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
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "#343837", background: "#F1F4F4", borderRadius: "8px", padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                      <span><strong>Carrier:</strong> {o.carrierCode || "Standard"}</span>
                      <span><strong>Tracking:</strong> {o.tracking}</span>
                    </div>
                    {o.trackingUrl && (
                      <a
                        href={o.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#004643", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12.5px", marginTop: "2px" }}
                      >
                        Track parcel on {o.carrierCode || "carrier"} site &rarr;
                      </a>
                    )}
                  </div>
                )}

                {/* Actions: next status */}
                {hasNext && !isRts && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid #EAEDEC", paddingTop: "16px" }}>
                    {needsTrack && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "#F8FAF9", border: "1px solid #EAEDEC", borderRadius: "10px", padding: "14px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#101212" }}>
                          Dispatch & Carrier Tracking
                        </div>
                        <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12.5px", fontWeight: 500, color: "#343837" }}>
                          Select carrier
                          <select
                            value={selectedCarrier}
                            onChange={e => setSelectedCarrier(e.target.value)}
                            style={{ padding: "9px 12px", border: "1px solid #D5DBDA", borderRadius: "8px", fontSize: "13.5px", outline: "none", background: "#FFFFFF", cursor: "pointer" }}
                          >
                            {carriers.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </label>
                        <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12.5px", fontWeight: 500, color: "#343837" }}>
                          Carrier tracking number
                          <input
                            value={trackingInput}
                            onChange={e => { setTrackingInput(e.target.value); setTrackingErr(""); }}
                            placeholder={`e.g. ${selectedCarrier} tracking number`}
                            style={{ padding: "9px 12px", border: "1px solid #D5DBDA", borderRadius: "8px", fontSize: "13.5px", outline: "none" }}
                          />
                        </label>
                        {trackingErr && <div style={{ fontSize: "12px", color: "#812F28", fontWeight: 500 }}>{trackingErr}</div>}
                        <div style={{ fontSize: "11.5px", color: "#646968" }}>
                          Entering tracking advances status to &quot;In transit&quot;, marks items shipped, and generates a live tracking link for the shopper.
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={isDispatching}
                      onClick={() => advanceOrder(o)}
                      style={{ background: "#004643", color: "#FFFFFF", border: "none", borderRadius: "8px", padding: "11px", fontSize: "14px", fontWeight: 600, cursor: isDispatching ? "not-allowed" : "pointer", opacity: isDispatching ? 0.7 : 1 }}
                    >
                      {isDispatching ? "Dispatching..." : NEXT_LABEL[o.status]}
                    </button>
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
    </div>
  );
}
