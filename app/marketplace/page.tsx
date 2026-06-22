"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Search, ArrowRight, Check, Globe, ShieldCheck, Clock, ChevronDown, TrendingDown, Truck } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useMarketplaceTranslations, useLanguage } from "@/lib/i18n/useTranslations";

function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 text-[#9ca3af] text-[12px] font-bold cursor-pointer hover:text-neutral-700 transition-colors"
    >
      <Globe className="w-4 h-4" />
      <span>{language === "en" ? "العربية" : "English"}</span>
      <ChevronDown className="w-3 h-3" />
    </button>
  );
}

export default function MarketplacePage() {
  const t = useMarketplaceTranslations();
  const { isRtl } = useLanguage();

  const categories = [
    { name: t.categories.seating,  img: "/assets/seating.png",  bg: "#f8f8f8" },
    { name: t.categories.lighting, img: "/assets/lighting.png", bg: "#c2915b" },
    { name: t.categories.tables,   img: "/assets/tables.png",   bg: "#e2e2e2" },
    { name: t.categories.storage,  img: "/assets/storage.png",  bg: "#d8d8d8" },
    { name: t.categories.decor,    img: "/assets/decor.png",    bg: "#b8b8b8" },
    { name: t.categories.outdoor,  img: "/assets/outdoor.png",  bg: "#e8e1d5" },
  ];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="relative min-h-screen bg-white font-schibsted overflow-x-hidden antialiased">

      <Navbar />

      {/* HERO */}
      <section className="pt-[180px] pb-[80px] px-4 flex flex-col items-center text-center relative overflow-hidden bg-[#E9F0EF]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[#e2eaf0] rounded-full px-[14px] py-[6px] flex items-center gap-[8px] mb-10 shadow-sm"
        >
          <div className="w-[8px] h-[8px] rounded-full bg-[#8bec5c]" />
          <span className="font-schibsted font-medium text-[13px] text-[#555f6d]">{t.hero.badge}</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-[1200px] font-schibsted font-semibold text-[48px] md:text-[84px] leading-[1.05] text-[#111d27] mb-8 tracking-[-3px]"
        >
          {t.hero.headlineLine1}<br />
          <span className={`${isRtl ? "" : "font-instrument italic"} font-normal text-[#004643] tracking-normal`}>
            {t.hero.headlineLine2}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-[660px] text-[18px] md:text-[21px] text-[#555f6d] leading-[1.5] mb-14 font-schibsted opacity-70"
        >
          {t.hero.subtext}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-[900px] h-[64px] md:h-[74px] bg-white border border-[#F3F4F6] rounded-[16px] flex items-center p-1.5 md:p-2 shadow-[0_30px_60px_rgba(0,0,0,0.08)] mb-14 md:mb-20 mx-auto"
        >
          <div className="flex-1 flex items-center gap-2 md:gap-4 pl-3 md:pl-10">
            <Image width={24} height={24} src="/assets/sofaIcon.png" alt="" className="w-5 h-5 md:w-6 md:h-6 opacity-40 shrink-0" />
            <input type="text" placeholder={t.hero.searchPlaceholder} className="w-full bg-transparent outline-none text-[15px] md:text-[18px] text-[#111d27] placeholder:text-[#9ca3af] font-schibsted" />
          </div>
          <div className="hidden md:block w-px h-8 bg-[#E5E7EB] mx-2" />
          <button className="h-[52px] md:h-[60px] px-5 md:px-10 bg-[#004643] text-white rounded-[11px] font-bold text-[15px] md:text-[17px] hover:bg-[#003330] transition-all flex items-center gap-2 shrink-0">
            <span className="hidden md:inline">{t.hero.browseCatalog}</span>
            <ArrowRight className={`w-5 h-5 ${isRtl ? "scale-x-[-1]" : ""}`} />
          </button>
        </motion.div>

        <div className="flex items-center gap-4">
          {[Globe, Check, Clock, ShieldCheck].map((Icon, i) => (
            <div key={i} className="w-[44px] h-[44px] border border-[#d1d5db] rounded-[10px] flex items-center justify-center bg-white/40 shadow-sm">
              <Icon className="w-5 h-5 text-[#555f6d] opacity-60" />
            </div>
          ))}
        </div>
      </section>

      {/* CATALOG SECTION */}
      <section className="py-[80px] md:py-[120px] px-4 bg-white overflow-hidden">
        <div className="max-w-[1240px] mx-auto flex flex-col lg:flex-row items-center gap-[40px] md:gap-[80px] lg:gap-[120px]">
          <div className="flex-1 relative w-full">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative rounded-[24px] md:rounded-[32px] bg-[#f8fafc] aspect-square sm:aspect-[1.3/1] w-full flex items-center justify-center border border-[#e2eaf0] shadow-sm overflow-hidden"
            >
              <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
                <div className="relative w-full h-full rounded-xl md:rounded-2xl overflow-hidden flex items-center justify-center">
                  <Image fill src="/assets/furnitureCatalog.png" alt="Furniture Catalog" className="object-cover" />
                </div>
              </div>
              <div className="absolute bottom-3 sm:bottom-6 left-3 sm:left-6 right-3 sm:right-6 h-[56px] sm:h-[80px] bg-white/90 backdrop-blur-xl border border-white rounded-[16px] md:rounded-[24px] shadow-lg flex items-center justify-between px-4 sm:px-8 z-20">
                <div className="flex flex-col">
                  <span className="text-[10px] md:text-[12px] text-[#555f6d] font-medium tracking-tight">{t.hero.itemsAvailable}</span>
                  <span className="text-[18px] md:text-[24px] font-bold text-[#111d27]">2.4 Million+</span>
                </div>
                <div className="w-[36px] md:w-[44px] h-[36px] md:h-[44px] bg-[#DFF8E6] rounded-full flex items-center justify-center">
                  <Image width={24} height={24} src="/assets/tickIcon.svg" alt="Tick" className="w-5 h-5 md:w-6 md:h-6" />
                </div>
              </div>
            </motion.div>
          </div>

          <div className="flex-1 max-w-[600px] text-center lg:text-left">
            <div className="bg-[#ECFDF5] border border-[#D1FAE5] rounded-full px-4 py-1.5 w-fit mb-6 md:mb-8 mx-auto lg:mx-0">
              <span className="text-[12px] md:text-[13px] font-bold text-[#059669] uppercase tracking-wider">{t.catalog.badge}</span>
            </div>
            <h2 className="max-w-[540px] mx-auto lg:mx-0 text-[32px] sm:text-[42px] md:text-[46px] font-bold text-[#111d27] leading-[1.1] mb-6 md:mb-8 tracking-[-1px] md:tracking-[-1.5px] font-schibsted">
              {t.catalog.heading}
            </h2>
            <p className="text-[16px] md:text-[18px] text-[#4B5563] leading-[1.6] md:leading-[1.7] mb-8 md:mb-10 opacity-70 px-2 lg:px-0">
              {t.catalog.body}
            </p>

            <div className="flex flex-col gap-6 md:gap-8 mb-10 md:mb-12 text-left">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#004643" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7L12 12L22 7L12 2Z"/><path d="M2 17L12 22L22 17"/><path d="M2 12L12 17L22 12"/></svg>
                </div>
                <div>
                  <h4 className="text-[17px] md:text-[18px] font-bold text-[#111d27] mb-1">{t.catalog.feature1Title}</h4>
                  <p className="max-w-[540px] text-[13px] md:text-[14px] text-[#4B5563] opacity-70 leading-relaxed">{t.catalog.feature1Desc}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#004643" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z"/></svg>
                </div>
                <div>
                  <h4 className="text-[17px] md:text-[18px] font-bold text-[#111d27] mb-1">{t.catalog.feature2Title}</h4>
                  <p className="max-w-[540px] text-[13px] md:text-[14px] text-[#4B5563] opacity-70 leading-relaxed">{t.catalog.feature2Desc}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center lg:justify-start">
              <button className="group relative h-[48px] pl-4 pr-1 bg-[#004643] text-white rounded-[16px] font-bold text-[15px] hover:bg-[#003330] transition-all flex items-center gap-3 shadow-[0_20px_40px_rgba(0,70,67,0.15)]">
                {t.catalog.cta}
                <div className="w-[40px] h-[40px] bg-white rounded-[12px] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ArrowRight className={`w-4 h-4 text-black ${isRtl ? "scale-x-[-1]" : ""}`} />
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING VISIBILITY */}
      <section className="py-[120px] px-4 bg-[#f8fafc] overflow-hidden">
        <div className="max-w-[1240px] mx-auto flex flex-col lg:flex-row items-center gap-[60px] md:gap-[80px] lg:gap-[120px]">
          <div className="flex-1 max-w-[500px] text-center lg:text-left">
            <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-full px-4 py-1.5 w-fit mb-8 mx-auto lg:mx-0">
              <span className="text-[13px] font-bold text-[#2563eb] uppercase tracking-wider">{t.pricing.badge}</span>
            </div>
            <h2 className="max-w-[800px] text-[34px] md:text-[46px] font-bold text-[#111d27] leading-[1.1] mb-8 tracking-[-1.5px] font-schibsted">
              {t.pricing.heading}
            </h2>
            <p className="text-[18px] text-[#555f6d] leading-[1.7] mb-12 opacity-70">{t.pricing.body}</p>

            <div className="flex flex-col sm:flex-row gap-6 text-left">
              <div className="flex-1 bg-white p-6 rounded-[24px] border border-black/[0.03] shadow-sm">
                <div className="w-10 h-10 bg-[#eff6ff] rounded-xl flex items-center justify-center mb-5">
                  <TrendingDown className="w-6 h-6 text-[#2563eb]" />
                </div>
                <h4 className="text-[18px] font-bold text-[#111d27] mb-2">{t.pricing.guarantee}</h4>
                <p className="text-[14px] text-[#555f6d] opacity-70 leading-relaxed">{t.pricing.guaranteeDesc}</p>
              </div>
              <div className="flex-1 bg-white p-6 rounded-[24px] border border-black/[0.03] shadow-sm">
                <div className="w-10 h-10 bg-[#fff7ed] rounded-xl flex items-center justify-center mb-5">
                  <Truck className="w-6 h-6 text-[#ea580c]" />
                </div>
                <h4 className="text-[18px] font-bold text-[#111d27] mb-2">{t.pricing.leadTime}</h4>
                <p className="text-[14px] text-[#555f6d] opacity-70 leading-relaxed">{t.pricing.leadTimeDesc}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 relative w-full flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative w-full max-w-[540px] bg-white rounded-[32px] p-8 shadow-[0_40px_100px_rgba(0,0,0,0.05)] border border-black/[0.03]"
            >
              <div className="flex items-center gap-5 mb-10">
                <div className="w-[80px] h-[80px] bg-[#f1f5f9] rounded-2xl flex items-center justify-center p-2 overflow-hidden">
                  <Image width={100} height={100} src="/assets/Furniture 4 3.png" alt="Chair" className="w-full h-auto object-contain" />
                </div>
                <div>
                  <h4 className="text-[20px] font-bold text-[#111d27] mb-1">Eames Lounge Chair</h4>
                  <p className="text-[14px] text-[#555f6d] mb-2">Walnut Wood, Black Leather</p>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-[#f1f5f9] text-[11px] font-bold text-[#555f6d] rounded-full uppercase tracking-wider">Herman Miller</span>
                    <span className="px-3 py-1 bg-[#DFF8E6] text-[11px] font-bold text-[#10B981] rounded-full uppercase tracking-wider">{t.pricing.inStock}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-4 bg-[#F0FDF4] rounded-2xl border border-[#D1FAE5]">
                  <div className="flex items-center gap-4">
                    <div className="w-2.5 h-2.5 bg-[#10B981] rounded-full" />
                    <span className="text-[16px] font-bold text-[#065F46]">Design Within Reach</span>
                  </div>
                  <span className="text-[18px] font-bold text-[#065F46]">$6,495.00</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-[#f8fafc] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-2.5 h-2.5 border-2 border-[#e2eaf0] rounded-full" />
                    <span className="text-[16px] font-medium text-[#555f6d]">Herman Miller Direct</span>
                  </div>
                  <span className="text-[16px] font-bold text-[#111d27] opacity-60">$6,995.00</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-[#f8fafc] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-2.5 h-2.5 border-2 border-[#e2eaf0] rounded-full" />
                    <span className="text-[16px] font-medium text-[#555f6d]">{isRtl ? "موزّع محلي (نيويورك)" : "Local Dealer (NY)"}</span>
                  </div>
                  <span className="text-[16px] font-bold text-[#111d27] opacity-60">$6,250.00</span>
                </div>
              </div>
            </motion.div>
            <div className="absolute -top-20 -right-20 w-[300px] h-[300px] bg-[#8bec5c]/10 blur-[120px] rounded-full -z-10" />
          </div>
        </div>
      </section>

      {/* MULTI-VENDOR CHECKOUT */}
      <section className="py-[80px] md:py-[120px] px-4 bg-white">
        <div className="max-w-[1240px] mx-auto text-center mb-10 md:mb-16">
          <h2 className="text-[32px] sm:text-[42px] md:text-[56px] font-bold text-[#111d27] mb-4 md:mb-6 tracking-[-1px] md:tracking-[-1.5px] font-schibsted">{t.checkout.heading}</h2>
          <p className="max-w-[640px] mx-auto text-[16px] md:text-[18px] text-[#555f6d] leading-[1.6] opacity-70 font-schibsted px-4">{t.checkout.body}</p>
        </div>

        <div className="max-w-[1240px] mx-auto relative rounded-[24px] md:rounded-[40px] bg-[#004643] p-6 md:p-16 overflow-hidden flex flex-col lg:flex-row items-center gap-12 md:gap-24">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 1200 600" fill="none">
              <path d="M-100 600C200 400 400 500 700 300C1000 100 1300 200 1400 0" stroke="white" strokeWidth="2" />
              <path d="M-100 500C300 300 500 400 800 200C1100 0 1400 100 1500 -100" stroke="white" strokeWidth="2" />
            </svg>
          </div>

          <div className="flex-1 text-white relative z-10 w-full text-center lg:text-left flex flex-col items-center lg:items-start">
            <h3 className="text-[24px] md:text-[32px] font-bold mb-8 md:mb-10 tracking-tight">{t.checkout.cartLabel}</h3>
            <div className="flex flex-col gap-8 md:gap-10 text-left w-full max-w-[420px]">
              <div className="flex items-start gap-4 md:gap-5">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-full flex items-center justify-center shrink-0">
                  <div className="w-5 h-5 md:w-6 md:h-6 bg-white/20 rounded-full" />
                </div>
                <div>
                  <h4 className="text-[18px] md:text-[20px] font-bold mb-1 md:mb-2">{t.checkout.invoice}</h4>
                  <p className="text-white/60 text-[14px] md:text-[15px] leading-relaxed">{t.checkout.invoiceDesc}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 md:gap-5">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-full flex items-center justify-center shrink-0">
                  <div className="w-5 h-5 md:w-6 md:h-6 bg-white/20 rounded-full" />
                </div>
                <div>
                  <h4 className="text-[18px] md:text-[20px] font-bold mb-1 md:mb-2">{t.checkout.concierge}</h4>
                  <p className="text-white/60 text-[14px] md:text-[15px] leading-relaxed">{t.checkout.conciergeDesc}</p>
                </div>
              </div>
            </div>
            <button className="mt-10 md:mt-12 h-[52px] md:h-[56px] pl-5 md:pl-6 pr-1 bg-[#94A3B8]/30 hover:bg-[#94A3B8]/40 backdrop-blur-md text-white rounded-[18px] md:rounded-[20px] font-bold text-[14px] md:text-[15px] transition-all flex items-center gap-3 md:gap-4 border border-white/10 shadow-lg">
              {t.checkout.startSourcing}
              <div className="w-[44px] h-[44px] md:w-[48px] md:h-[48px] bg-white rounded-[14px] md:rounded-[16px] flex items-center justify-center">
                <ArrowRight className={`w-4 h-4 md:w-5 md:h-5 text-black ${isRtl ? "scale-x-[-1]" : ""}`} />
              </div>
            </button>
          </div>

          <div className="flex-1 w-full flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="w-full max-w-[440px] md:max-w-[480px] bg-white rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-2xl relative z-10"
            >
              <div className="flex justify-between items-center mb-6 md:mb-8 pb-4 border-b border-[#f1f5f9]">
                <h4 className="text-[16px] md:text-[18px] font-bold text-[#111d27]">{t.checkout.cartTitle}</h4>
                <span className="text-[12px] md:text-[13px] text-[#94a3b8] font-bold uppercase tracking-wider">{t.checkout.cartItems}</span>
              </div>
              <div className="flex flex-col gap-5 md:gap-6 mb-8 md:mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-[#f8fafc] rounded-xl md:rounded-[16px] overflow-hidden p-2 flex items-center justify-center border border-[#e2eaf0]">
                    <Image width={40} height={40} src="/assets/seating.png" alt="" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h5 className="text-[14px] md:text-[16px] font-bold text-[#111d27]">Svelto Sofa</h5>
                      <span className="text-[14px] md:text-[15px] font-bold text-[#111d27]">$1,200</span>
                    </div>
                    <p className="text-[11px] md:text-[12px] text-[#94a3b8]">{t.checkout.vendor}: Article</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-[#f8fafc] rounded-xl md:rounded-[16px] overflow-hidden p-2 flex items-center justify-center border border-[#e2eaf0]">
                    <Image width={40} height={40} src="/assets/lighting.png" alt="" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h5 className="text-[14px] md:text-[16px] font-bold text-[#111d27]">Akari Lamp 1A</h5>
                      <span className="text-[14px] md:text-[15px] font-bold text-[#111d27]">$350</span>
                    </div>
                    <p className="text-[11px] md:text-[12px] text-[#94a3b8]">{t.checkout.vendor}: Noguchi Shop</p>
                  </div>
                </div>
              </div>
              <div className="pt-5 md:pt-6 border-t border-[#f1f5f9] mb-6 md:mb-8 flex justify-between items-center">
                <span className="text-[14px] md:text-[15px] text-[#555f6d] font-medium">{t.checkout.total}</span>
                <span className="text-[20px] md:text-[24px] font-bold text-[#004643]">$1,550.00</span>
              </div>
              <button className="w-full h-[52px] md:h-[56px] bg-[#004643] text-white rounded-[14px] md:rounded-[16px] font-bold text-[14px] md:text-[15px] hover:bg-[#003330] transition-all shadow-[0_15px_30px_rgba(0,70,67,0.15)]">
                {t.checkout.proceedCheckout}
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* POPULAR CATEGORIES */}
      <section className="py-[120px] px-4 bg-[#F8FAFC]">
        <div className="max-w-[1240px] mx-auto text-left mb-12">
          <h2 className="text-[32px] font-bold text-[#111d27] tracking-tight font-schibsted">{t.categories.heading}</h2>
        </div>
        <div className="max-w-[1240px] mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {categories.map((cat, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="group cursor-pointer">
              <div className="aspect-square w-full rounded-[32px] mb-4 overflow-hidden relative border border-black/5" style={{ backgroundColor: cat.bg }}>
                <Image fill src={cat.img} alt={cat.name} className="object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <p className="text-center text-[15px] font-bold text-[#555f6d] group-hover:text-[#111d27] transition-colors">{cat.name}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#f5f7fa] pt-[72px] lg:pt-[90px] pb-9">
        <div className="max-w-[1240px] mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10 lg:gap-12 mb-14 lg:mb-16">
            <div>
              <Link href="/public" className="flex items-center gap-[10px] mb-6">
                <Image width={34} height={34} src="/assets/logo.png" alt="NOOI" className="w-[34px] h-auto object-contain" />
                <span className="font-inter font-bold text-[20px] text-neutral-900 tracking-tight uppercase">NOOI</span>
              </Link>
              <p className="text-[#6b7280] mb-8 text-[14px] leading-relaxed max-w-[320px] font-schibsted opacity-80">{t.footer.tagline}</p>
              <div className="relative max-w-[340px] mb-8">
                <input type="email" placeholder={t.footer.emailPlaceholder} className="w-full h-[52px] bg-white border border-[#e8eaec] rounded-[10px] px-5 outline-none focus:border-[#004643] transition-colors text-[14px] pr-[110px]" />
                <button className="absolute right-1.5 top-1.5 h-[40px] bg-[#004643] text-white px-6 rounded-[8px] text-[13px] font-bold hover:bg-[#003330] transition-colors">{t.footer.subscribe}</button>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
                  <div className="w-5 h-5 flex items-center justify-center border border-black rounded p-0.5"><Image width={16} height={16} src="/assets/windows.svg" alt="" className="w-full h-full grayscale" /></div>
                  <span className="text-[12px] font-bold">{t.footer.windowsApp}</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
                  <div className="w-5 h-5 flex items-center justify-center border border-black rounded p-0.5"><Image width={16} height={16} src="/assets/apple.svg" alt="" className="w-full h-full grayscale" /></div>
                  <span className="text-[12px] font-bold">{t.footer.macApp}</span>
                </div>
              </div>
            </div>

            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-6 tracking-tight uppercase">{t.footer.productHeading}</h5>
              <ul className="space-y-4 text-[14px] text-[#6b7280] font-schibsted">
                {[t.footer.productLinks.floorPlanner, t.footer.productLinks.interiorDesign, t.footer.productLinks.kitchenCloset, t.footer.productLinks.viewer3d, t.footer.productLinks.customFurniture].map((l) => (
                  <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors opacity-80">{l}</li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-6 tracking-tight uppercase">{t.footer.companyHeading}</h5>
              <ul className="space-y-4 text-[14px] text-[#6b7280] font-schibsted">
                {[t.footer.companyLinks.aboutUs, t.footer.companyLinks.contact, t.footer.companyLinks.affiliate, t.footer.companyLinks.careers].map((l) => (
                  <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors opacity-80">{l}</li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-6 tracking-tight uppercase">{t.footer.resourcesHeading}</h5>
              <ul className="space-y-4 text-[14px] text-[#6b7280] font-schibsted">
                {[t.footer.resourcesLinks.designIdeas, t.footer.resourcesLinks.tutorial, t.footer.resourcesLinks.helpCenter, t.footer.resourcesLinks.app].map((l) => (
                  <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors opacity-80">{l}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#f0f0f0] flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-[#9ca3af] text-[12px] font-schibsted">{t.footer.legal}</p>
            <div className="flex items-center gap-8 text-[12px] text-[#9ca3af] font-schibsted">
              <span className="hover:text-[#111d27] cursor-pointer">{t.footer.terms}</span>
              <span className="hover:text-[#111d27] cursor-pointer">{t.footer.privacy}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-[#004643] group transition-all cursor-pointer">
                    <Globe className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
                  </div>
                ))}
              </div>
              <div className="w-px h-4 bg-neutral-200 mx-2" />
              <LanguageToggle />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}