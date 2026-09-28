"use client";

/**
 * Product detail — screen 02
 * ----------------------------------------------------------------------------
 * Gallery with a 3D tab, finish selector, quantity, add to cart / buy now,
 * delivery estimate, spec and review tabs, and more from the same vendor.
 *
 * Three deliberate departures from the prototype, each because the data behind
 * it does not exist yet:
 *
 *   Ratings and "sold" are omitted. Zero reviews and zero orders would render
 *   "★ 0 · 0 sold" on every product, which reads as broken rather than new. The
 *   reviews tab shows an honest empty state instead.
 *
 *   The ZIP delivery check is a date range derived from lead_time_days, not a
 *   postcode lookup. shipping.service.ts hardcodes four business days and has
 *   no ZIP logic, so a box that accepts a postcode and ignores it would be a
 *   lie told in a form field.
 *
 *   Custom made-to-order sizes are left out entirely. "Custom sizes update the
 *   3D model in your design automatically" needs a schema for size options and
 *   a way to rescale a GLB per order. Neither exists.
 *
 * "Place in my design" appears only when the shopper arrived from a canvas
 * (?project=). It returns them to that design; making it preselect the piece
 * needs a `place` handler in app/canvas/page.tsx, which is the next job.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight, ShoppingCart, Plus, Minus, Box, Loader2, Truck, ArrowRight, Rotate3d,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import { useLanguage } from "@/lib/i18n/useTranslations";
import { useCartStore } from "@/lib/store/cart.store";
import { catalogById } from "@/lib/furniture/catalog";
import {
  getProductById, getProducts,
  type MarketplaceProduct, type ProductVariant,
} from "@/lib/api/marketplace";

// three touches window on import, and the GLB is megabytes — only load the
// viewer when the shopper opens the 3D tab.
const ModelViewer = dynamic(() => import("@/components/marketplace/ModelViewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-[11.5px] text-[#8E9493]">
      <Loader2 size={14} className="animate-spin" />
    </div>
  ),
});

const COPY = {
  en: {
    marketplace: "Marketplace", photos: "Photos", view3d: "3D", finish: "Finish",
    quantity: "Quantity", addToCart: "Add to cart", buyNow: "Buy now",
    soldOut: "Sold out", inStock: (n: number) => `${n} in stock`,
    lowStock: (n: number) => `Only ${n} left`, delivery: "Delivery estimate",
    estimated: "Estimated arrival", placeTitle: "Place in my design",
    placeSub: (name: string) => `Open ${name} with this piece`,
    details: "Details", reviews: "Reviews", noReviews: "No reviews yet.",
    moreFrom: (v: string) => `More from ${v}`, notFound: "Product not found",
    notFoundBody: "This product may have been removed or is no longer stocked.",
    backToShop: "Back to marketplace", dimensions: "Dimensions", material: "Material",
    sku: "SKU", leadTime: "Lead time", days: "days", vendor: "Vendor",
    category: "Category", from: "from",
  },
  ar: {
    marketplace: "المتجر", photos: "الصور", view3d: "ثلاثي الأبعاد", finish: "التشطيب",
    quantity: "الكمية", addToCart: "أضف إلى السلة", buyNow: "اشترِ الآن",
    soldOut: "نفدت الكمية", inStock: (n: number) => `${n} متوفر`,
    lowStock: (n: number) => `بقي ${n} فقط`, delivery: "تقدير التوصيل",
    estimated: "الوصول المتوقع", placeTitle: "ضعها في تصميمي",
    placeSub: (name: string) => `فتح ${name} مع هذه القطعة`,
    details: "التفاصيل", reviews: "التقييمات", noReviews: "لا توجد تقييمات بعد.",
    moreFrom: (v: string) => `المزيد من ${v}`, notFound: "المنتج غير موجود",
    notFoundBody: "ربما تمت إزالة هذا المنتج أو لم يعد متوفرًا.",
    backToShop: "العودة إلى المتجر", dimensions: "الأبعاد", material: "الخامة",
    sku: "رمز المنتج", leadTime: "مدة التجهيز", days: "يوم", vendor: "المورد",
    category: "الفئة", from: "من",
  },
} as const;

const LOW_STOCK = 5;

function ProductDetailInner() {
  const router = useRouter();
  const routeParams = useParams<{ id: string }>();
  const search = useSearchParams();
  const productId = routeParams?.id;
  const projectId = search.get("project");

  const { language } = useLanguage();
  const isArabic = language === "ar";
  const t = COPY[isArabic ? "ar" : "en"];

  const cartItems = useCartStore(s => s.items);
  const addItemOptimistic = useCartStore(s => s.addItemOptimistic);
  const updateQuantityOptimistic = useCartStore(s => s.updateQuantityOptimistic);

  const [product, setProduct] = useState<MarketplaceProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [view, setView] = useState<"photos" | "3d">("photos");
  const [tab, setTab] = useState<"details" | "reviews">("details");
  const [more, setMore] = useState<MarketplaceProduct[]>([]);

  const toArabicDigits = useCallback(
    (s: string) => (isArabic ? s.replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[+d]) : s),
    [isArabic],
  );
  const money = useCallback(
    (v: number) => toArabicDigits(`$${Math.round(v).toLocaleString("en-US")}`),
    [toArabicDigits],
  );
  const num = useCallback((v: number) => toArabicDigits(String(v)), [toArabicDigits]);

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    setLoading(true);

    getProductById(productId)
      .then(p => {
        if (cancelled) return;
        setProduct(p);
        const first = p?.variants.find(v => v.stock_quantity > 0) ?? p?.variants[0];
        setVariantId(first?.id ?? null);
      })
      .catch(err => {
        if (!cancelled) console.error("[pdp] load failed:", err);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [productId]);

  // More from the same vendor.
  useEffect(() => {
    if (!product?.retailer?.id) return;
    let cancelled = false;
    getProducts({ retailerId: product.retailer.id, limit: 6 })
      .then(res => {
        if (cancelled) return;
        setMore(res.products.filter(p => p.id !== product.id).slice(0, 4));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [product?.retailer?.id, product?.id]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const variant: ProductVariant | null = useMemo(
    () => product?.variants.find(v => v.id === variantId) ?? product?.variants[0] ?? null,
    [product, variantId],
  );

  const catalogItem = product?.canvas_model_id ? catalogById(product.canvas_model_id) : undefined;

  const images = variant?.images?.length
    ? variant.images
    : product?.variants.flatMap(v => v.images ?? []) ?? [];

  const inCartQty = useMemo(() => {
    if (!variant) return 0;
    return cartItems.filter(i => i.variant_id === variant.id).reduce((n, i) => n + i.quantity, 0);
  }, [cartItems, variant]);

  const arrival = useMemo(() => {
    if (!product) return null;
    const d = new Date();
    d.setDate(d.getDate() + product.lead_time_days);
    return d.toLocaleDateString(isArabic ? "ar" : "en-US", {
      day: "numeric", month: "long", year: "numeric",
    });
  }, [product, isArabic]);

  const dims = variant && variant.width_cm != null
    ? `${num(Math.round(Number(variant.width_cm)))} × ${num(Math.round(Number(variant.depth_cm ?? 0)))} × ${num(Math.round(Number(variant.height_cm ?? 0)))} cm`
    : null;

  // ── Cart ───────────────────────────────────────────────────────────────────

  const addToCart = useCallback((quantity: number) => {
    if (!product || !variant) return;
    const existing = cartItems.find(i => i.variant_id === variant.id);
    if (existing) {
      updateQuantityOptimistic(existing.id, existing.quantity + quantity);
      return;
    }
    addItemOptimistic({
      id: variant.id,
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
  }, [product, variant, cartItems, addItemOptimistic, updateQuantityOptimistic]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-white" dir={isArabic ? "rtl" : "ltr"}>
        <Navbar />
        <main className="max-w-[1180px] mx-auto px-5 pt-[120px]">
          <div className="grid md:grid-cols-2 gap-10">
            <div className="aspect-square rounded-2xl bg-[#F1F4F4] animate-pulse" />
            <div className="space-y-3 pt-4">
              <div className="h-3 w-24 bg-[#F1F4F4] rounded animate-pulse" />
              <div className="h-7 w-2/3 bg-[#F1F4F4] rounded animate-pulse" />
              <div className="h-5 w-28 bg-[#F1F4F4] rounded animate-pulse" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white" dir={isArabic ? "rtl" : "ltr"}>
        <Navbar />
        <main className="max-w-[1180px] mx-auto px-5 pt-[160px] text-center">
          <h1 className="text-[20px] font-medium text-[#101212]">{t.notFound}</h1>
          <p className="mt-2 text-[13px] text-[#646968]">{t.notFoundBody}</p>
          <button
            onClick={() => router.push("/marketplace")}
            className="mt-5 px-4 py-2 rounded-full bg-[#004643] text-white text-[12.5px] font-medium hover:bg-[#003836]"
          >
            {t.backToShop}
          </button>
        </main>
      </div>
    );
  }

  const stock = variant?.stock_quantity ?? 0;

  return (
    <div className="min-h-screen bg-white" dir={isArabic ? "rtl" : "ltr"}>
      <Navbar />

      <main className="max-w-[1180px] mx-auto px-5 pt-[120px] pb-20">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11.5px] text-[#8E9493]">
          <button onClick={() => router.push("/marketplace")} className="hover:text-[#004643]">
            {t.marketplace}
          </button>
          <ChevronRight size={12} className={isArabic ? "rotate-180" : ""} />
          <button
            onClick={() => router.push(`/marketplace?group=${encodeURIComponent(product.shop_group)}`)}
            className="hover:text-[#004643]"
          >
            {product.shop_group}
          </button>
          <ChevronRight size={12} className={isArabic ? "rotate-180" : ""} />
          <span className="text-[#4B4F4F] truncate">{product.title}</span>
        </nav>

        <div className="mt-5 grid md:grid-cols-2 gap-10">
          {/* ── Gallery ─────────────────────────────────────────────────── */}
          <div>
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#F1F4F4] border border-[#E6EBEA]">
              {view === "3d" && catalogItem ? (
                <ModelViewer modelPath={catalogItem.path} size={catalogItem.size} />
              ) : images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={images[0]} alt={product.title} className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-[#B3B9B9]">
                  <Box size={34} strokeWidth={1.1} />
                </span>
              )}
            </div>

            {catalogItem && (
              <div className="mt-3 flex items-center gap-2">
                {([
                  { k: "photos" as const, l: t.photos, icon: null },
                  { k: "3d" as const, l: t.view3d, icon: <Rotate3d size={12} /> },
                ]).map(v => (
                  <button
                    key={v.k}
                    onClick={() => setView(v.k)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-[12px] transition-colors
                      ${view === v.k
                        ? "bg-[#F3FEFD] border-[#87DDD7] text-[#004643]"
                        : "bg-white border-[#D5DBDA] text-[#343837] hover:bg-[#F1F4F4]"}`}
                  >
                    {v.icon}{v.l}
                  </button>
                ))}
                {view === "3d" && (
                  <span className="text-[11px] text-[#8E9493]">
                    {catalogItem.name} · {num(catalogItem.size.w)}×{num(catalogItem.size.d)}×{num(catalogItem.size.h)} cm
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Detail ──────────────────────────────────────────────────── */}
          <div className="flex flex-col">
            <button
              onClick={() => product.retailer && router.push(`/marketplace?retailer=${product.retailer.id}`)}
              className="self-start text-[12px] text-[#646968] hover:text-[#004643]"
            >
              {product.retailer?.name}
            </button>

            <h1 className="mt-1 text-[27px] leading-tight text-[#101212]">{product.title}</h1>

            {dims && <span className="mt-1.5 text-[12px] text-[#8E9493]">{dims}</span>}

            <div className="mt-4 text-[24px] font-semibold text-[#004643]">
              {money(Number(variant?.price ?? product.from_price))}
            </div>

            {product.description && (
              <p className="mt-3 text-[13px] leading-relaxed text-[#4B4F4F]">{product.description}</p>
            )}

            {/* Finish */}
            {product.variants.length > 1 && (
              <div className="mt-6">
                <span className="text-[12px] text-[#646968]">
                  {t.finish}: <strong className="text-[#101212]">{variant?.color ?? "—"}</strong>
                </span>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {product.variants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => { setVariantId(v.id); setQty(1); }}
                      aria-pressed={v.id === variant?.id}
                      className={`px-3 py-1.5 rounded-full border text-[12px] transition-colors
                        ${v.id === variant?.id
                          ? "bg-[#F3FEFD] border-[#87DDD7] text-[#004643]"
                          : "bg-white border-[#D5DBDA] text-[#343837] hover:bg-[#F1F4F4]"}
                        ${v.stock_quantity === 0 ? "opacity-50" : ""}`}
                    >
                      {v.color ?? v.sku}
                      {Number(v.price) !== Number(product.from_price) && (
                        <span className="ms-1.5 text-[10.5px] text-[#8E9493]">{money(Number(v.price))}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + actions */}
            <div className="mt-6 flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1 px-1.5 py-1 rounded-full border border-[#D5DBDA] bg-[#F1F4F4]">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="w-7 h-7 flex items-center justify-center rounded-full text-[#004643] hover:bg-white"
                >
                  <Minus size={13} />
                </button>
                <span className="w-8 text-center text-[12.5px] font-medium text-[#101212]">{num(qty)}</span>
                <button
                  onClick={() => setQty(q => Math.min(Math.max(stock, 1), q + 1))}
                  aria-label="Increase quantity"
                  className="w-7 h-7 flex items-center justify-center rounded-full text-[#004643] hover:bg-white"
                >
                  <Plus size={13} />
                </button>
              </div>

              <button
                onClick={() => addToCart(qty)}
                disabled={stock === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#004643] text-white text-[12.5px] font-medium hover:bg-[#003836] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ShoppingCart size={13} />
                {stock === 0 ? t.soldOut : t.addToCart}
              </button>

              {stock > 0 && (
                <button
                  onClick={() => { addToCart(qty); router.push("/checkout"); }}
                  className="px-5 py-2.5 rounded-full border border-[#D5DBDA] bg-white text-[12.5px] font-medium text-[#004643] hover:bg-[#F1F4F4]"
                >
                  {t.buyNow}
                </button>
              )}
            </div>

            <span className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-[#646968]">
              <span className={`w-1.5 h-1.5 rounded-full ${stock === 0 ? "bg-[#812F28]" : stock <= LOW_STOCK ? "bg-[#812F28]" : "bg-[#28603A]"}`} />
              {stock === 0 ? t.soldOut : stock <= LOW_STOCK ? t.lowStock(stock) : t.inStock(stock)}
              {inCartQty > 0 && <span className="text-[#28603A]">· {num(inCartQty)} in cart</span>}
            </span>

            {/* Delivery + place in design */}
            <div className="mt-6 space-y-2.5">
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-[#E6EBEA] bg-[#FBFCFC]">
                <Truck size={15} className="mt-0.5 text-[#646968] shrink-0" />
                <span className="text-[12.5px]">
                  <span className="block text-[#101212] font-medium">{t.delivery}</span>
                  <span className="block mt-0.5 text-[#646968]">
                    {t.estimated}: {arrival} · {num(product.lead_time_days)} {t.days}
                  </span>
                </span>
              </div>

              {projectId && (
                <button
                  onClick={() =>
                    router.push(
                      `/canvas?project=${projectId}${product.canvas_model_id ? `&place=${encodeURIComponent(product.canvas_model_id)}` : ""}`,
                    )
                  }
                  className="w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[#87DDD7] bg-[#F3FEFD] text-start hover:bg-[#e9fbfa] transition-colors"
                >
                  <span className="text-[12.5px]">
                    <span className="block font-medium text-[#004643]">{t.placeTitle}</span>
                    <span className="block mt-0.5 text-[#646968]">{t.placeSub(product.title)}</span>
                  </span>
                  <ArrowRight size={15} className={`text-[#004643] shrink-0 ${isArabic ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <section className="mt-14">
          <div className="flex items-center gap-2 border-b border-[#E6EBEA]">
            {([
              { k: "details" as const, l: t.details },
              { k: "reviews" as const, l: t.reviews },
            ]).map(x => (
              <button
                key={x.k}
                onClick={() => setTab(x.k)}
                className={`px-3.5 py-2.5 text-[13px] border-b-2 -mb-px transition-colors
                  ${tab === x.k
                    ? "border-[#004643] text-[#004643] font-medium"
                    : "border-transparent text-[#8E9493] hover:text-[#4B4F4F]"}`}
              >
                {x.l}
              </button>
            ))}
          </div>

          {tab === "details" && (
            <div className="mt-5 max-w-[620px] divide-y divide-[#F1F4F4]">
              {[
                dims && { l: t.dimensions, v: dims },
                variant?.material && { l: t.material, v: variant.material },
                variant?.sku && { l: t.sku, v: variant.sku },
                { l: t.leadTime, v: `${num(product.lead_time_days)} ${t.days}` },
                product.retailer?.name && { l: t.vendor, v: product.retailer.name },
                { l: t.category, v: product.type_name ?? product.shop_group },
                ...Object.entries(product.specs_json ?? {})
                  .filter(([, v]) => typeof v === "string" || typeof v === "number")
                  .map(([k, v]) => ({ l: k.replace(/_/g, " "), v: String(v) })),
              ]
                .filter(Boolean)
                .map((row, i) => {
                  const r = row as { l: string; v: string };
                  return (
                    <div key={i} className="flex items-baseline justify-between gap-6 py-2.5">
                      <span className="text-[12.5px] text-[#8E9493] capitalize">{r.l}</span>
                      <span className="text-[12.5px] text-[#101212] text-end">{r.v}</span>
                    </div>
                  );
                })}
            </div>
          )}

          {tab === "reviews" && (
            <div className="mt-5 max-w-[620px]">
              {!product.reviews?.length ? (
                <p className="py-8 text-[12.5px] text-[#8E9493]">{t.noReviews}</p>
              ) : (
                <div className="divide-y divide-[#F1F4F4]">
                  {product.reviews.map(r => (
                    <div key={r.id} className="py-4">
                      <span className="text-[12.5px] font-medium text-[#101212]">
                        {r.user_name}
                        <span className="ms-2 font-normal text-[#8E9493]">
                          ★ {num(r.rating)} · {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </span>
                      {r.comment && (
                        <p className="mt-1 text-[12.5px] text-[#4B4F4F]">{r.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── More from vendor ─────────────────────────────────────────── */}
        {more.length > 0 && product.retailer && (
          <section className="mt-14">
            <h2 className="text-[17px] font-medium text-[#101212]">
              {t.moreFrom(product.retailer.name)}
            </h2>
            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {more.map(m => {
                const img = m.variants.find(v => v.images?.length)?.images?.[0];
                return (
                  <button
                    key={m.id}
                    onClick={() => router.push(`/marketplace/${m.id}${projectId ? `?project=${projectId}` : ""}`)}
                    className="text-start group"
                  >
                    <span className="block aspect-[4/3] rounded-xl overflow-hidden bg-[#F1F4F4] border border-[#E6EBEA]">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-[#B3B9B9]">
                          <Box size={22} strokeWidth={1.25} />
                        </span>
                      )}
                    </span>
                    <span className="mt-2 flex items-baseline justify-between gap-2">
                      <span className="text-[12.5px] text-[#101212] truncate">{m.title}</span>
                      <span className="shrink-0 text-[12.5px] font-semibold text-[#004643]">
                        {money(m.from_price)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ProductDetailInner />
    </Suspense>
  );
}