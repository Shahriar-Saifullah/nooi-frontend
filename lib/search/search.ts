/**
 * Platform-wide search — lib/search/search.ts
 * ============================================================================
 * The API (GET /search) returns what the signed-in person may see, grouped by
 * kind: products, vendors, projects, orders, invoices, tickets, accounts. This
 * file adds the instant, local part — shop categories and the pages of the
 * app for that role — and turns every hit into a link.
 */

import { requestApi } from "@/lib/api/http";

export type SearchScope = "public" | "client" | "vendor" | "admin";
export type SearchKind = "product" | "vendor" | "project" | "order" | "invoice" | "ticket" | "account" | "category" | "page";

export interface SearchHit {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string | null;
  image: string | null;
  ref: string | null;
  status: string | null;
  score: number;
}

export interface SearchGroup { kind: SearchKind; hits: SearchHit[] }
export interface SearchResult { q: string; scope: SearchScope; groups: SearchGroup[]; total: number }

export const KIND_LABEL: Record<SearchKind, { en: string; ar: string }> = {
  page: { en: "Go to", ar: "انتقل إلى" },
  category: { en: "Categories", ar: "الفئات" },
  product: { en: "Products", ar: "المنتجات" },
  vendor: { en: "Vendors & factories", ar: "الموردون والمصانع" },
  project: { en: "Your projects", ar: "مشاريعك" },
  order: { en: "Orders", ar: "الطلبات" },
  invoice: { en: "Invoices", ar: "الفواتير" },
  ticket: { en: "Support tickets", ar: "تذاكر الدعم" },
  account: { en: "Accounts", ar: "الحسابات" },
};

/** Ask the API. Anonymous callers get products and vendors only. */
export async function searchRemote(q: string, opts: { kinds?: SearchKind[]; limit?: number; signal?: AbortSignal } = {}): Promise<SearchResult | null> {
  const p = new URLSearchParams({ q });
  if (opts.kinds?.length) p.set("kinds", opts.kinds.join(","));
  if (opts.limit) p.set("limit", String(opts.limit));
  const res = await requestApi<SearchResult>({ path: `/search?${p.toString()}`, method: "GET", signal: opts.signal });
  return res.success ? res.data : null;
}

// ── Local entries: categories and pages ────────────────────────────────────

const CATEGORIES: { group: string; ar: string; words: string }[] = [
  { group: "Seating", ar: "مقاعد", words: "sofa couch chair armchair stool bench seat كنبة كرسي" },
  { group: "Tables", ar: "طاولات", words: "table desk dining coffee side طاولة" },
  { group: "Storage", ar: "تخزين", words: "storage shelf bookcase wardrobe cabinet dresser sideboard خزانة رف" },
  { group: "Beds", ar: "أسرّة", words: "bed mattress headboard سرير" },
  { group: "Lighting", ar: "إضاءة", words: "light lamp chandelier pendant مصباح ثريا" },
  { group: "Decor", ar: "ديكور", words: "decor rug vase mirror art plant سجاد مرآة" },
  { group: "Outdoor", ar: "خارجي", words: "outdoor garden patio terrace حديقة" },
  { group: "Bath", ar: "حمّام", words: "bath bathroom sink toilet vanity حمام" },
  { group: "Kitchen", ar: "مطبخ", words: "kitchen cabinet counter island مطبخ" },
];

interface PageEntry { title: string; ar: string; href: string; words: string }

const PAGES: Record<SearchScope, PageEntry[]> = {
  public: [
    { title: "Marketplace", ar: "المتجر", href: "/marketplace", words: "shop buy furniture store" },
    { title: "Sell on Nooi", ar: "بِع على نوي", href: "/sell", words: "vendor factory supplier join" },
    { title: "Terms of Service", ar: "شروط الخدمة", href: "/legal/terms", words: "terms legal" },
    { title: "Privacy Policy", ar: "سياسة الخصوصية", href: "/legal/privacy", words: "privacy data" },
  ],
  client: [
    { title: "My projects", ar: "مشاريعي", href: "/dashboard", words: "projects designs rooms home dashboard" },
    { title: "Marketplace", ar: "المتجر", href: "/marketplace", words: "shop buy furniture store" },
    { title: "Cart", ar: "السلة", href: "/cart", words: "basket checkout" },
    { title: "My orders", ar: "طلباتي", href: "/orders", words: "orders delivery tracking shipments" },
    { title: "Documents & invoices", ar: "المستندات والفواتير", href: "/dashboard/profile", words: "invoices invoice vat receipts documents downloads agreements" },
    { title: "Support", ar: "الدعم", href: "/support", words: "help support ticket problem return refund" },
    { title: "Profile & settings", ar: "الملف والإعدادات", href: "/dashboard/profile", words: "account profile password settings notifications" },
    { title: "Terms of Service", ar: "شروط الخدمة", href: "/legal/terms", words: "terms legal" },
    { title: "Privacy Policy", ar: "سياسة الخصوصية", href: "/legal/privacy", words: "privacy data" },
  ],
  vendor: [
    { title: "Vendor dashboard", ar: "لوحة المورد", href: "/sell/dashboard", words: "dashboard overview" },
    { title: "Orders", ar: "الطلبات", href: "/sell/orders", words: "orders fulfilment shipping production" },
    { title: "Products & listings", ar: "المنتجات", href: "/sell/products", words: "products listings catalogue new listing" },
    { title: "Payments & payouts", ar: "المدفوعات", href: "/sell/payments", words: "payments payouts earnings bank iban" },
    { title: "Returns", ar: "المرتجعات", href: "/sell/returns", words: "returns refunds" },
    { title: "Store settings", ar: "إعدادات المتجر", href: "/sell/settings", words: "settings store logo profile legal documents" },
    { title: "Support", ar: "الدعم", href: "/sell/support", words: "help support ticket" },
    { title: "Vendor & Factory Agreement", ar: "اتفاقية الموردين", href: "/legal/vendor-agreement", words: "agreement terms legal" },
  ],
  admin: [
    { title: "Admin overview", ar: "نظرة عامة", href: "/admin", words: "dashboard overview stats" },
    { title: "Vendor applications", ar: "طلبات الموردين", href: "/admin/applications", words: "applications vendors approve review" },
    { title: "Vendors", ar: "الموردون", href: "/admin/vendors", words: "vendors factories suppliers" },
    { title: "Listings review", ar: "مراجعة المنتجات", href: "/admin/listings", words: "listings products review approve" },
    { title: "3D models", ar: "النماذج ثلاثية الأبعاد", href: "/admin/models", words: "models 3d glb" },
    { title: "Orders", ar: "الطلبات", href: "/admin/orders", words: "orders" },
    { title: "Refunds & returns", ar: "المبالغ المستردة", href: "/admin/refunds", words: "refunds returns" },
    { title: "Cancellations", ar: "الإلغاءات", href: "/admin/cancellations", words: "cancellations cancel" },
    { title: "Payouts", ar: "المدفوعات للموردين", href: "/admin/payouts", words: "payouts payments vendors" },
    { title: "Support", ar: "الدعم", href: "/admin/support", words: "support tickets help" },
    { title: "Team", ar: "الفريق", href: "/admin/team", words: "team staff admins employees" },
    { title: "Audit log", ar: "سجل التدقيق", href: "/admin/audit", words: "audit log history" },
    { title: "Settings", ar: "الإعدادات", href: "/admin/settings", words: "settings vat commission kitchen prices legal" },
  ],
};

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[ً-ٟ]/g, "").trim();

/** How well q matches a title + keywords: 0 (no) … 1 (title starts with it). */
export function localScore(q: string, title: string, words = ""): number {
  const n = norm(q);
  if (n.length < 2) return 0;
  const t = norm(title);
  if (t.startsWith(n)) return 1;
  if (t.split(/\s+/).some(w => w.startsWith(n))) return 0.9;
  if (t.includes(n)) return 0.8;
  const ws = norm(words).split(/\s+/);
  if (ws.some(w => w.startsWith(n))) return 0.7;
  if (n.length >= 4 && ws.some(w => w.length >= 4 && n.startsWith(w))) return 0.6;   // "sofas" → "sofa"
  return 0;
}

/** Categories and app pages that match, for this scope. Instant. */
export function localGroups(q: string, scope: SearchScope, arabic = false): SearchGroup[] {
  const pages = PAGES[scope]
    .map(p => ({ p, s: Math.max(localScore(q, p.title, p.words), localScore(q, p.ar)) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 4)
    .map(({ p, s }): SearchHit => ({ kind: "page", id: p.href + p.title, title: arabic ? p.ar : p.title, subtitle: null, image: null, ref: p.href, status: null, score: s }));
  const cats = CATEGORIES
    .map(c => ({ c, s: Math.max(localScore(q, c.group, c.words), localScore(q, c.ar)) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map(({ c, s }): SearchHit => ({ kind: "category", id: c.group, title: arabic ? c.ar : c.group, subtitle: null, image: null, ref: c.group, status: null, score: s }));
  return [
    ...(pages.length ? [{ kind: "page" as const, hits: pages }] : []),
    ...(cats.length ? [{ kind: "category" as const, hits: cats }] : []),
  ];
}

/** Where a hit opens, for the person who searched. */
export function hitHref(h: SearchHit, scope: SearchScope): string {
  const enc = encodeURIComponent;
  switch (h.kind) {
    case "page": return h.ref ?? "/";
    case "category": return `/marketplace?group=${enc(h.ref ?? h.id)}`;
    case "product":
      if (scope === "admin" && h.status !== "approved") return `/admin/listings?id=${enc(h.id)}`;
      if (scope === "vendor" && h.status !== "approved") return `/sell/products?product=${enc(h.id)}`;
      return `/marketplace/${enc(h.id)}`;
    case "vendor": return `/marketplace?retailer=${enc(h.id)}`;
    case "project": return `/canvas?projectId=${enc(h.id)}`;
    case "order":
      if (scope === "admin") return `/admin/orders?id=${enc(h.id)}`;
      if (scope === "vendor") return `/sell/orders?order=${enc(h.title)}`;
      return `/orders/${enc(h.id)}`;
    case "invoice": return scope === "admin" ? `/admin/orders?id=${enc(h.ref ?? "")}` : `/orders/${enc(h.ref ?? "")}`;
    case "ticket":
      if (scope === "admin") return `/admin/support?id=${enc(h.id)}`;
      if (scope === "vendor") return `/sell/support?ticket=${enc(h.id)}`;
      return `/support?ticket=${enc(h.id)}`;
    case "account":
      return h.status === "admin" || h.status === "super_admin" ? "/admin/team" : `/admin/applications?id=${enc(h.id)}`;
  }
}

/** Local groups first ("Go to", categories), then the API's, no duplicates. */
export function mergeGroups(local: SearchGroup[], remote: SearchGroup[] | undefined): SearchGroup[] {
  return [...local, ...(remote ?? [])].filter(g => g.hits.length);
}

// ── Recent searches (this browser only) ─────────────────────────────────────

const RECENT_KEY = "nooi-recent-searches";
export function recentSearches(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string").slice(0, 6) : [];
  } catch { return []; }
}
export function rememberSearch(q: string) {
  const t = q.trim();
  if (t.length < 2) return;
  try {
    const next = [t, ...recentSearches().filter(s => s.toLowerCase() !== t.toLowerCase())].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* private mode */ }
}

/** Open the search palette from anywhere (GlobalSearch listens). */
export const OPEN_SEARCH_EVENT = "nooi:open-search";
export function openGlobalSearch(initial = "") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT, { detail: initial }));
}
