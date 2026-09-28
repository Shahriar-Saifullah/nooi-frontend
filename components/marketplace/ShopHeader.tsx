"use client";

/**
 * ShopHeader — chrome for the shop screens
 * ----------------------------------------------------------------------------
 * The marketing Navbar (Products / About / Pricing) is the wrong furniture for
 * a shopping surface: no cart, no search, and a nav built to sell the product
 * rather than to move around inside it. The design has a separate shop header
 * for exactly this reason, and it serves every screen from marketplace through
 * checkout to order tracking.
 *
 * Search lives here rather than in the filter bar, matching the design, and it
 * writes to the URL (?q=). That makes a search shareable, survives a refresh,
 * and means this component owns no state the page has to stay in step with.
 * It's debounced so typing doesn't push a history entry per keystroke.
 *
 * The cart badge reads the local zustand store. Once the cart syncs to the
 * server, this number should come from the same place the cart page reads, or
 * the two will disagree in exactly the way people notice.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, ShoppingCart, X } from "lucide-react";

import { useLanguage } from "@/lib/i18n/useTranslations";
import { useCartStore } from "@/lib/store/cart.store";
import { getCurrentUser, type AuthUser } from "@/lib/api/auth";

const COPY = {
  en: {
    marketplace: "Marketplace",
    orders: "Orders",
    search: "Search sofas, oak, lamps, vendors",
    clear: "Clear search",
    cart: "Cart",
    signIn: "Sign in",
  },
  ar: {
    marketplace: "المتجر",
    orders: "الطلبات",
    search: "ابحث عن أرائك، بلوط، مصابيح، موردين",
    clear: "مسح البحث",
    cart: "السلة",
    signIn: "تسجيل الدخول",
  },
} as const;

export default function ShopHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const { language, toggleLanguage, isRtl } = useLanguage();
  const t = COPY[language === "ar" ? "ar" : "en"];

  const totalItems = useCartStore(s => s.totalItems());

  const [user, setUser] = useState<AuthUser | null>(null);
  const [q, setQ] = useState(params.get("q") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then(res => { if (!cancelled) setUser(res.success ? res.data.user : null); })
      .catch(() => { if (!cancelled) setUser(null); });
    return () => { cancelled = true; };
  }, []);

  // Keep the field in step when the URL changes from elsewhere — a cleared
  // filter, a back button.
  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);

  const pushQuery = useCallback(
    (value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");

      // Searching from a product page should land on the grid, not filter a
      // page that has nothing to filter.
      const target = pathname.startsWith("/marketplace/") ? "/marketplace" : pathname;
      router.replace(`${target}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const onChange = (value: string) => {
    setQ(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => pushQuery(value), 350);
  };

  const tabs = [
    { href: "/marketplace", label: t.marketplace },
    { href: "/orders", label: t.orders },
  ];

  return (
    <>
      {/* Fades scrolled content out from under the floating bar. */}
      <div
        aria-hidden
        className="fixed top-0 left-0 right-0 h-[118px] z-40 pointer-events-none bg-gradient-to-b from-white via-white/90 to-transparent"
      />

      <header
        className="fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[1240px] h-[72px] z-50"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="w-full h-full backdrop-blur-[100px] bg-[#f7fbfc]/90 border border-[#e2eaf0] rounded-[22px] flex items-center gap-4 ps-[16px] md:ps-[24px] pe-[12px] py-[12px] shadow-[0_4px_30px_rgba(0,0,0,0.03)]">

          <Link href="/" aria-label="NOOI home" className="flex items-center gap-[9px] shrink-0">
            <Image
              width={100}
              height={100}
              src="/assets/logo.png"
              alt="NOOI"
              className="w-[32px] md:w-[40px] h-auto object-contain"
            />
            <span className="font-inter font-bold text-[18px] md:text-[20px] text-[#111d27] tracking-tight">
              NOOI
            </span>
          </Link>

          <nav aria-label="Shop" className="hidden md:flex items-center gap-1 shrink-0">
            {tabs.map(tab => {
              const current = pathname === tab.href || pathname.startsWith(tab.href + "/");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={current ? "page" : undefined}
                  className={`px-3 py-1.5 rounded-full text-[13px] transition-colors
                    ${current ? "bg-white text-[#004643] font-medium" : "text-[#4B4F4F] hover:bg-white/60"}`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          {/* Search — owns no state the page has to mirror; the URL is the state. */}
          <div className="flex-1 min-w-0 max-w-[420px] relative">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[#8E9493] pointer-events-none" />
            <input
              value={q}
              onChange={e => onChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  if (debounce.current) clearTimeout(debounce.current);
                  pushQuery(q);
                }
              }}
              aria-label={t.search}
              placeholder={t.search}
              className="w-full ps-9 pe-8 py-2 rounded-full border border-[#e2eaf0] bg-white text-[13px] text-[#101212] placeholder:text-[#B3B9B9] focus:outline-none focus:border-[#87DDD7]"
            />
            {q && (
              <button
                onClick={() => { setQ(""); pushQuery(""); }}
                aria-label={t.clear}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-[#8E9493] hover:bg-[#F1F4F4]"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* ms-auto: the search is flex-1 but capped, so without this the
              leftover width collects to the right of the avatar instead of
              between the search and the controls. */}
          <div className="ms-auto flex items-center gap-2 shrink-0">
          <button
            onClick={toggleLanguage}
            className="hidden md:flex items-center justify-center h-[40px] px-3 rounded-[12px] border border-[#e6e6e8] bg-white text-[13px] text-[#4B4F4F] hover:bg-neutral-50 shrink-0"
          >
            {language === "ar" ? "EN" : "العربية"}
          </button>

          <Link
            href="/cart"
            aria-label={`${t.cart}${totalItems ? ` (${totalItems})` : ""}`}
            className="relative flex items-center gap-2 h-[40px] md:h-[46px] px-3.5 rounded-[12px] border border-[#e6e6e8] bg-white text-[13px] font-medium text-[#004643] hover:bg-[#F3FEFD] hover:border-[#87DDD7] transition-colors shrink-0"
          >
            <ShoppingCart size={15} />
            <span className="hidden md:inline">{t.cart}</span>
            {totalItems > 0 && (
              <span className="min-w-[19px] h-[19px] px-1 flex items-center justify-center rounded-full bg-[#004643] text-white text-[10.5px] font-semibold">
                {totalItems}
              </span>
            )}
          </Link>

          {user ? (
            <Link
              href="/dashboard"
              title={user.full_name || user.email}
              className="shrink-0 w-[36px] h-[36px] md:w-[40px] md:h-[40px] rounded-full bg-[#004643] text-white flex items-center justify-center text-[13px] font-medium overflow-hidden"
            >
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                (user.full_name || user.email || "?").trim().charAt(0).toUpperCase()
              )}
            </Link>
          ) : (
            <Link
              href="/authpage/signin"
              className="shrink-0 h-[40px] md:h-[46px] px-4 flex items-center rounded-[12px] bg-[#004643] text-white text-[13px] font-medium hover:bg-[#003836]"
            >
              {t.signIn}
            </Link>
          )}
          </div>
        </div>
      </header>
    </>
  );
}