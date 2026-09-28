"use client";

/**
 * Marketplace — screen 01
 * ----------------------------------------------------------------------------
 * Two stacked sections:
 *
 *   "Shop this room"  Only when ?project=<id> is present, which is how the
 *                     canvas hands off. Lists what the shopper placed, matched
 *                     to real products, with per-item selection and a bulk add.
 *
 *   "All furniture"   The browsable grid — group chips, vendor and price
 *                     filters, sort, and paging.
 *
 * Notes for whoever picks this up next:
 *
 *   Grouping uses groupPlacedFurniture from FurnitureListPanel, the same
 *   function the canvas panel uses. Six identical dining chairs must read as
 *   one row with ×6 in both places or the cart totals won't match what the
 *   shopper was shown.
 *
 *   Copy lives in the COPY map below rather than lib/i18n/translations.ts. The
 *   page is self-contained that way; move the strings across when the
 *   translation files get consolidated. Arabic must not regress — the previous
 *   version of this page was fully translated.
 *
 *   Ratings are deliberately absent. See the note in ProductCard.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SlidersHorizontal, Check, X, ArrowLeft, Box, Loader2,
} from "lucide-react";

import ShopHeader from "@/components/marketplace/ShopHeader";
import ProductCard from "@/components/marketplace/ProductCard";
import { useLanguage } from "@/lib/i18n/useTranslations";
import { useCartStore } from "@/lib/store/cart.store";
import { getProject } from "@/lib/api/projects";
import {
  getFacets, getProducts, getCanvasMatches,
  type Facets, type MarketplaceProduct, type ProductVariant, type ProductQuery,
} from "@/lib/api/marketplace";
import { groupPlacedFurniture, type FurnitureGroup } from "@/components/FurnitureListPanel";
import { rankProducts, type ProductMatch } from "@/lib/matching/products";

// ─── Copy ────────────────────────────────────────────────────────────────────

const COPY = {
  en: {
    fromDesign: "From your design",
    roomTitleA: "Shop this room,",
    roomTitleB: "piece by piece",
    roomNote: "We matched what you placed to real products from our vendors.",
    openDesign: "Open design",
    addSelected: (n: number) => `Add ${n} to cart`,
    selected: (n: number, t: number) => `${n} of ${t} selected`,
    noMatches: "No vendor carries this piece yet.",
    closest: "Closest match",
    allFurniture: "All furniture",
    countLabel: (n: number) => `${n} item${n === 1 ? "" : "s"}`,
    search: "Search furniture",
    vendor: "Vendor",
    price: "Price",
    allVendors: "All vendors",
    anyPrice: "Any price",
    inStockOnly: "In stock",
    threeDOnly: "3D ready",
    clearAll: "Clear all",
    sort: "Sort",
    sortNewest: "Newest",
    sortPriceAsc: "Price: low to high",
    sortPriceDesc: "Price: high to low",
    sortLead: "Fastest delivery",
    emptyTitle: "No furniture matches",
    emptyBody: "Try a broader search, another category, or remove a filter.",
    clearFilters: "Clear all filters",
    loadMore: "Load more",
    threeD: "3D ready",
    inCart: "In cart",
    addToCart: "Add to cart",
    soldOut: "Sold out",
    days: "days",
    from: "from",
  },
  ar: {
    fromDesign: "من تصميمك",
    roomTitleA: "تسوّق هذه الغرفة،",
    roomTitleB: "قطعة بقطعة",
    roomNote: "طابقنا ما وضعته مع منتجات حقيقية من موردينا.",
    openDesign: "فتح التصميم",
    addSelected: (n: number) => `أضف ${n} إلى السلة`,
    selected: (n: number, t: number) => `${n} من ${t} محدد`,
    noMatches: "لا يوجد مورد لهذه القطعة بعد.",
    closest: "أقرب بديل",
    allFurniture: "كل الأثاث",
    countLabel: (n: number) => `${n} منتج`,
    search: "ابحث عن أثاث",
    vendor: "المورد",
    price: "السعر",
    allVendors: "كل الموردين",
    anyPrice: "أي سعر",
    inStockOnly: "متوفر",
    threeDOnly: "جاهز ثلاثي الأبعاد",
    clearAll: "مسح الكل",
    sort: "ترتيب",
    sortNewest: "الأحدث",
    sortPriceAsc: "السعر: من الأقل",
    sortPriceDesc: "السعر: من الأعلى",
    sortLead: "أسرع توصيل",
    emptyTitle: "لا توجد نتائج",
    emptyBody: "جرّب بحثًا أوسع أو فئة أخرى أو أزل أحد عوامل التصفية.",
    clearFilters: "مسح كل عوامل التصفية",
    loadMore: "عرض المزيد",
    threeD: "ثلاثي الأبعاد",
    inCart: "في السلة",
    addToCart: "أضف إلى السلة",
    soldOut: "نفدت الكمية",
    days: "يوم",
    from: "من",
  },
} as const;

const PAGE_SIZE = 12;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Cheapest in-stock variant, else cheapest overall. What "add to cart" buys. */
function defaultVariant(product: MarketplaceProduct): ProductVariant | null {
  const active = product.variants.filter(v => v.is_active);
  if (!active.length) return null;
  const inStock = active.filter(v => v.stock_quantity > 0);
  const pool = inStock.length ? inStock : active;
  return pool.reduce((best, v) => (Number(v.price) < Number(best.price) ? v : best), pool[0]);
}

// ─── Page ────────────────────────────────────────────────────────────────────

function MarketplaceInner() {
  const router = useRouter();
  const params = useSearchParams();
  const projectId = params.get("project");
  // Search is owned by ShopHeader and lives in the URL, so it survives a
  // refresh and can be shared. The page only reads it.
  const search = params.get("q") ?? "";

  const { language } = useLanguage();
  const t = COPY[language === "ar" ? "ar" : "en"];
  const isArabic = language === "ar";

  const cartItems = useCartStore(s => s.items);
  const addItemOptimistic = useCartStore(s => s.addItemOptimistic);
  const removeItemOptimistic = useCartStore(s => s.removeItemOptimistic);
  const updateQuantityOptimistic = useCartStore(s => s.updateQuantityOptimistic);

  // Filters
  const [group, setGroup] = useState("All");
  const [retailerId, setRetailerId] = useState("All");
  const [priceBand, setPriceBand] = useState("All");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [threeDOnly, setThreeDOnly] = useState(false);
  const [sort, setSort] = useState<ProductQuery["sort"]>("newest");
  const [page, setPage] = useState(1);

  // Data
  const [facets, setFacets] = useState<Facets | null>(null);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Room band
  const [roomLoading, setRoomLoading] = useState(Boolean(projectId));
  const [projectName, setProjectName] = useState<string | null>(null);
  const [roomThumb, setRoomThumb] = useState<string | null>(null);
  const [roomRows, setRoomRows] = useState<
    { group: FurnitureGroup; match: ProductMatch | null }[]
  >([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── Price formatting ───────────────────────────────────────────────────────
  const toArabicDigits = useCallback(
    (s: string) => (isArabic ? s.replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[+d]) : s),
    [isArabic],
  );

  const formatPrice = useCallback(
    (value: number) => toArabicDigits(`$${Math.round(value).toLocaleString("en-US")}`),
    [toArabicDigits],
  );

  const formatNumber = useCallback(
    (value: number) => toArabicDigits(String(value)),
    [toArabicDigits],
  );

  // ── Facets ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    getFacets().then(setFacets).catch(err => {
      console.error("[marketplace] facets failed:", err);
    });
  }, []);

  // ── Grid ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const band = priceBand === "All" ? null : priceBand.split("-").map(Number);

    getProducts({
      group,
      retailerId,
      search: search.trim() || undefined,
      minPrice: band ? band[0] : undefined,
      maxPrice: band && band[1] ? band[1] : undefined,
      inStock: inStockOnly || undefined,
      sort,
      page,
      limit: PAGE_SIZE,
    })
      .then(res => {
        if (cancelled) return;
        // 3D-ready is a client-side narrowing — every seeded product has a
        // canvas_model_id today, so it only bites once vendors list pieces
        // without a model.
        const rows = threeDOnly ? res.products.filter(p => p.is_3d) : res.products;
        setProducts(prev => (page === 1 ? rows : [...prev, ...rows]));
        setTotal(res.total);
      })
      .catch(err => {
        if (cancelled) return;
        console.error("[marketplace] products failed:", err);
        setError(String(err.message ?? err));
      })
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [group, retailerId, priceBand, inStockOnly, threeDOnly, search, sort, page]);

  // Any filter change resets paging.
  useEffect(() => {
    setPage(1);
  }, [group, retailerId, priceBand, inStockOnly, threeDOnly, search, sort]);

  // ── Room band ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    (async () => {
      setRoomLoading(true);
      try {
        const project = await getProject(projectId);
        if (cancelled) return;

        setProjectName(project.name);
        setRoomThumb(project.thumbnail_url);

        const placed = project.room_data?.furniture ?? [];
        const groups = groupPlacedFurniture(placed as any);

        // One request per distinct model. Placed rooms are small, so this is a
        // handful of calls, not a storm.
        const rows = await Promise.all(
          groups.map(async g => {
            if (!g.sample.modelId) return { group: g, match: null };
            try {
              // Exact model first — someone selling this very piece.
              const exact = await getCanvasMatches(g.sample.modelId);
              if (exact.length) {
                const ranked = rankProducts(g, exact);
                if (ranked[0]) return { group: g, match: ranked[0] };
              }

              // Then anything of the same type. A shopper who placed a king bed
              // is better served by a queen from a real vendor than by "no
              // vendor carries this piece yet" — and the fit warning on the
              // card tells them where it differs. This is what type_id is for.
              const typeId = g.cat?.typeId;
              if (!typeId) return { group: g, match: null };

              const similar = await getProducts({
                typeId,
                excludeModel: g.sample.modelId,
                limit: 12,
              });
              const ranked = rankProducts(g, similar.products);
              return { group: g, match: ranked[0] ?? null };
            } catch {
              return { group: g, match: null };
            }
          }),
        );

        if (cancelled) return;
        setRoomRows(rows);
        // Everything matched starts selected — the shopper came here to buy.
        setSelected(new Set(rows.filter(r => r.match).map(r => r.group.key)));
      } catch (err) {
        if (!cancelled) console.error("[marketplace] room load failed:", err);
      } finally {
        if (!cancelled) setRoomLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [projectId]);

  // ── Cart ───────────────────────────────────────────────────────────────────

  const quantityFor = useCallback(
    (product: MarketplaceProduct) => {
      const ids = new Set(product.variants.map(v => v.id));
      return cartItems
        .filter(i => ids.has(i.variant_id))
        .reduce((n, i) => n + i.quantity, 0);
    },
    [cartItems],
  );

  const addToCart = useCallback(
    (product: MarketplaceProduct, quantity = 1) => {
      const variant = defaultVariant(product);
      if (!variant) return;

      const existing = cartItems.find(i => i.variant_id === variant.id);
      if (existing) {
        updateQuantityOptimistic(existing.id, existing.quantity + quantity);
        return;
      }

      addItemOptimistic({
        id: variant.id, // local cart keys on the variant; server sync replaces it
        variant_id: variant.id,
        quantity,
        product_data: {
          title: product.title,
          price: Number(variant.price),
          retailer_name: product.retailer?.name,
          color: variant.color ?? undefined,
          image: variant.images?.[0],
        },
      });
    },
    [cartItems, addItemOptimistic, updateQuantityOptimistic],
  );

  const decrement = useCallback(
    (product: MarketplaceProduct) => {
      const ids = new Set(product.variants.map(v => v.id));
      const item = cartItems.find(i => ids.has(i.variant_id));
      if (!item) return;
      if (item.quantity <= 1) removeItemOptimistic(item.id);
      else updateQuantityOptimistic(item.id, item.quantity - 1);
    },
    [cartItems, removeItemOptimistic, updateQuantityOptimistic],
  );

  const addSelectedRoomItems = useCallback(() => {
    for (const row of roomRows) {
      if (!row.match || !selected.has(row.group.key)) continue;
      addToCart(row.match.product, row.group.qty);
    }
  }, [roomRows, selected, addToCart]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const anyFilter =
    group !== "All" || retailerId !== "All" || priceBand !== "All" ||
    inStockOnly || threeDOnly || search.trim().length > 0;

  const clearAll = () => {
    setGroup("All"); setRetailerId("All"); setPriceBand("All");
    setInStockOnly(false); setThreeDOnly(false); setSort("newest");
    if (search) {
      const next = new URLSearchParams(params.toString());
      next.delete("q");
      router.replace(`/marketplace?${next.toString()}`, { scroll: false });
    }
  };

  const priceBands = useMemo(() => {
    if (!facets) return [];
    const { max } = facets.price;
    return [
      { v: "All", l: t.anyPrice },
      { v: "0-250", l: `< ${formatPrice(250)}` },
      { v: "250-750", l: `${formatPrice(250)} – ${formatPrice(750)}` },
      { v: "750-2000", l: `${formatPrice(750)} – ${formatPrice(2000)}` },
      { v: `2000-${Math.ceil(max)}`, l: `> ${formatPrice(2000)}` },
    ];
  }, [facets, formatPrice, t.anyPrice]);

  const matchedCount = roomRows.filter(r => r.match && selected.has(r.group.key)).length;
  const hasMore = products.length < total;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white" dir={isArabic ? "rtl" : "ltr"}>
      <ShopHeader />

      {/* Navbar is fixed at top-6 with h-[72px], so content starts below
          24 + 72 + breathing room or it renders underneath the bar. */}
      <main className="max-w-[1180px] mx-auto px-5 pt-[120px] pb-20">
        {/* ─── Shop this room ─────────────────────────────────────────────── */}
        {projectId && (
          <section
            aria-label="Shop your design"
            className="grid md:grid-cols-[minmax(0,380px)_1fr] gap-6 p-5 rounded-2xl border border-[#E6EBEA] bg-[#FBFCFC]"
          >
            <div className="rounded-xl overflow-hidden bg-[#F1F4F4] aspect-[4/3]">
              {roomThumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={roomThumb} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#B3B9B9] text-[12px]">
                  <Box size={26} strokeWidth={1.25} />
                </div>
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-[11.5px] text-[#646968]">
                {t.fromDesign}
                {projectName ? ` · ${projectName}` : ""}
              </span>

              <h1 className="mt-1 text-[26px] leading-tight text-[#101212]">
                {t.roomTitleA}{" "}
                <span
                  className="italic"
                  style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
                >
                  {t.roomTitleB}
                </span>
              </h1>

              <p className="mt-1.5 text-[12.5px] text-[#646968]">{t.roomNote}</p>

              <div className="mt-4 flex-1 divide-y divide-[#E6EBEA] border-y border-[#E6EBEA]">
                {roomLoading && (
                  <div className="py-6 flex items-center gap-2 text-[12.5px] text-[#8E9493]">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                )}

                {!roomLoading && roomRows.map(({ group: g, match }) => {
                  const on = selected.has(g.key);
                  const qty = match ? quantityFor(match.product) : 0;

                  return (
                    <div key={g.key} className="flex items-center gap-3 py-2.5">
                      <button
                        role="checkbox"
                        aria-checked={on}
                        aria-label={`Select ${g.cat?.name ?? g.sample.name}`}
                        disabled={!match}
                        onClick={() =>
                          setSelected(prev => {
                            const next = new Set(prev);
                            if (next.has(g.key)) next.delete(g.key);
                            else next.add(g.key);
                            return next;
                          })
                        }
                        className={`shrink-0 w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center transition-colors
                          ${on ? "bg-[#004643] border-[#004643] text-white" : "bg-white border-[#D5DBDA]"}
                          disabled:opacity-30 disabled:cursor-not-allowed`}
                      >
                        {on && <Check size={11} strokeWidth={3} />}
                      </button>

                      <span className="shrink-0 w-10 h-10 rounded-lg bg-[#F1F4F4] border border-[#E6EBEA] overflow-hidden flex items-center justify-center">
                        {g.cat?.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={g.cat.thumbnail} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <Box size={15} className="text-[#B3B9B9]" strokeWidth={1.25} />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-medium text-[#101212] truncate">
                          {g.cat?.name ?? g.sample.name}
                          {g.qty > 1 && (
                            <span className="ms-1.5 text-[11px] text-[#8E9493]">×{g.qty}</span>
                          )}
                        </span>
                        <span className="block text-[11px] text-[#8E9493] truncate">
                          {match
                            ? `${match.exact ? "" : t.closest + " · "}${match.product.retailer?.name ?? ""} · ${match.product.lead_time_days} ${t.days}`
                            : t.noMatches}
                        </span>
                      </span>

                      {qty > 0 && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#E7FBEB] text-[10.5px] font-medium text-[#28603A]">
                          {t.inCart}
                        </span>
                      )}

                      <span className="shrink-0 text-[12.5px] font-semibold text-[#004643]">
                        {match ? formatPrice(match.product.from_price * g.qty) : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <span className="text-[11.5px] text-[#646968]">
                  {t.selected(matchedCount, roomRows.length)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/canvas?project=${projectId}`)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#D5DBDA] bg-white text-[12.5px] font-medium text-[#004643] transition-colors hover:bg-[#F1F4F4]"
                  >
                    <ArrowLeft size={13} className={isArabic ? "rotate-180" : ""} />
                    {t.openDesign}
                  </button>
                  <button
                    onClick={addSelectedRoomItems}
                    disabled={matchedCount === 0}
                    className="px-4 py-2 rounded-full bg-[#004643] text-white text-[12.5px] font-medium transition-colors hover:bg-[#003836] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t.addSelected(matchedCount)}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─── All furniture ──────────────────────────────────────────────── */}
        <section aria-label="All furniture" className="mt-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-[19px] font-medium text-[#101212]">{t.allFurniture}</h2>
            <span className="text-[12px] text-[#8E9493]">{t.countLabel(total)}</span>
          </div>

          {/* Group chips */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
            {(facets?.groups ?? []).map(g => (
              <button
                key={g.group}
                onClick={() => setGroup(g.group)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-[12.5px] transition-colors
                  ${group === g.group
                    ? "bg-[#004643] border-[#004643] text-white"
                    : "bg-white border-[#D5DBDA] text-[#343837] hover:bg-[#F1F4F4]"}`}
              >
                {g.group}
                <span className={group === g.group ? "text-white/60" : "text-[#8E9493]"}>
                  {g.count}
                </span>
              </button>
            ))}
          </div>

          {/* Filter bar */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <select
              value={priceBand}
              onChange={e => setPriceBand(e.target.value)}
              aria-label={t.price}
              className="px-3 py-1.5 rounded-full border border-[#D5DBDA] bg-white text-[12.5px] text-[#343837] focus:outline-none focus:border-[#87DDD7]"
            >
              {priceBands.map(o => (
                <option key={o.v} value={o.v}>{o.l}</option>
              ))}
            </select>

            <select
              value={retailerId}
              onChange={e => setRetailerId(e.target.value)}
              aria-label={t.vendor}
              className="px-3 py-1.5 rounded-full border border-[#D5DBDA] bg-white text-[12.5px] text-[#343837] focus:outline-none focus:border-[#87DDD7]"
            >
              <option value="All">{t.allVendors}</option>
              {(facets?.vendors ?? []).map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>

            {[
              { on: inStockOnly, set: setInStockOnly, label: t.inStockOnly },
              { on: threeDOnly, set: setThreeDOnly, label: t.threeDOnly },
            ].map(tog => (
              <button
                key={tog.label}
                onClick={() => tog.set(!tog.on)}
                aria-pressed={tog.on}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12.5px] transition-colors
                  ${tog.on
                    ? "bg-[#F3FEFD] border-[#87DDD7] text-[#004643]"
                    : "bg-white border-[#D5DBDA] text-[#343837] hover:bg-[#F1F4F4]"}`}
              >
                {tog.on && <Check size={11} strokeWidth={3} />}
                {tog.label}
              </button>
            ))}

            {anyFilter && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] text-[#812F28] hover:underline"
              >
                <X size={12} />
                {t.clearAll}
              </button>
            )}

            <span className="ms-auto flex items-center gap-2">
              <label className="text-[11.5px] text-[#8E9493]">
                <SlidersHorizontal size={12} className="inline me-1" />
                {t.sort}
              </label>
              <select
                value={sort}
                onChange={e => setSort(e.target.value as ProductQuery["sort"])}
                className="px-3 py-1.5 rounded-full border border-[#D5DBDA] bg-white text-[12.5px] text-[#343837] focus:outline-none focus:border-[#87DDD7]"
              >
                <option value="newest">{t.sortNewest}</option>
                <option value="price_asc">{t.sortPriceAsc}</option>
                <option value="price_desc">{t.sortPriceDesc}</option>
                <option value="lead_time">{t.sortLead}</option>
              </select>
            </span>
          </div>

          {/* Results */}
          {error && (
            <div className="mt-8 p-4 rounded-xl border border-[#812F28]/25 bg-[#FFFAF9] text-[12.5px] text-[#812F28]">
              {error}
            </div>
          )}

          {loading && page === 1 && (
            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-[#E6EBEA] overflow-hidden">
                  <div className="aspect-[4/3] bg-[#F1F4F4] animate-pulse" />
                  <div className="p-3.5 space-y-2">
                    <div className="h-2.5 w-1/3 bg-[#F1F4F4] rounded animate-pulse" />
                    <div className="h-3 w-3/4 bg-[#F1F4F4] rounded animate-pulse" />
                    <div className="h-7 bg-[#F1F4F4] rounded-full animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && products.length === 0 && (
            <div className="mt-10 py-14 text-center">
              <div className="text-[15px] font-medium text-[#101212]">{t.emptyTitle}</div>
              <div className="mt-1.5 text-[12.5px] text-[#646968]">{t.emptyBody}</div>
              {anyFilter && (
                <button
                  onClick={clearAll}
                  className="mt-4 px-4 py-2 rounded-full border border-[#D5DBDA] bg-white text-[12.5px] font-medium text-[#004643] hover:bg-[#F1F4F4]"
                >
                  {t.clearFilters}
                </button>
              )}
            </div>
          )}

          {products.length > 0 && (
            <>
              <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {products.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    quantity={quantityFor(p)}
                    onOpen={prod => router.push(`/marketplace/${prod.id}`)}
                    onAdd={prod => addToCart(prod, 1)}
                    onIncrement={prod => addToCart(prod, 1)}
                    onDecrement={decrement}
                    formatPrice={formatPrice}
                    formatNumber={formatNumber}
                    labels={{
                      threeD: t.threeD,
                      inCart: t.inCart,
                      addToCart: t.addToCart,
                      soldOut: t.soldOut,
                      days: t.days,
                      from: t.from,
                    }}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#D5DBDA] bg-white text-[12.5px] font-medium text-[#004643] hover:bg-[#F1F4F4] disabled:opacity-50"
                  >
                    {loading && <Loader2 size={13} className="animate-spin" />}
                    {t.loadMore}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default function MarketplacePage() {
  // useSearchParams needs a Suspense boundary or the route opts out of static
  // rendering and the build warns.
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <MarketplaceInner />
    </Suspense>
  );
}