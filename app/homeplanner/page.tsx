"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Globe, ChevronDown, Box, Maximize, Smartphone } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useHomePlannerTranslations, useLanguage } from "@/lib/i18n/useTranslations";

function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  return (
    <button onClick={toggleLanguage} className="flex items-center gap-1.5 text-[#9ca3af] text-[12px] font-bold cursor-pointer hover:text-neutral-700 transition-colors">
      <Globe className="w-4 h-4" />
      <span>{language === "en" ? "العربية" : "English"}</span>
      <ChevronDown className="w-3 h-3" />
    </button>
  );
}

export default function HomePlannerPage() {
  const t = useHomePlannerTranslations();
  const { isRtl } = useLanguage();

  const tools = [
    { title: t.tools.tool1.title, desc: t.tools.tool1.desc, icon: <Box className="w-6 h-6 text-[#2563eb]" />,    img: "/assets/blueprint.png" },
    { title: t.tools.tool2.title, desc: t.tools.tool2.desc, icon: <Maximize className="w-6 h-6 text-[#10b981]" />,img: "/assets/sofa.png" },
    { title: t.tools.tool3.title, desc: t.tools.tool3.desc, icon: <Smartphone className="w-6 h-6 text-[#ea580c]" />, img: "/assets/tablet.png" },
  ];

  const steps = [
    { step: "1", title: t.workflow.step1.title, desc: t.workflow.step1.desc },
    { step: "2", title: t.workflow.step2.title, desc: t.workflow.step2.desc },
    { step: "3", title: t.workflow.step3.title, desc: t.workflow.step3.desc },
  ];

  const layouts = [
    { ...t.layouts.layout1, img: "/assets/tdv.png" },
    { ...t.layouts.layout2, img: "/assets/mik.png" },
    { ...t.layouts.layout3, img: "/assets/cms.png" },
  ];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="relative min-h-screen bg-white font-schibsted overflow-x-hidden antialiased">

      <Navbar />

      {/* HERO */}
      <section className="relative pt-[160px] md:pt-[200px] pb-[100px] px-4 overflow-hidden">
        <div className="absolute top-[10%] left-[-5%] w-[400px] h-[400px] bg-[#8bec5c]/10 blur-[100px] rounded-full -z-10 animate-pulse" />
        <div className="absolute top-[20%] right-[-5%] w-[350px] h-[350px] bg-[#0ea5e9]/5 blur-[100px] rounded-full -z-10" />

        <div className="max-w-[1240px] mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-[#e2e8f0] rounded-full mb-10 shadow-sm">
            <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse" />
            <span className="text-[13px] font-medium text-[#555f6d] tracking-tight">{t.hero.badge}</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-[48px] sm:text-[64px] lg:text-[84px] font-bold text-[#004643] leading-[1] mb-2 tracking-[-2px] font-schibsted">
            {t.hero.title}
          </motion.h1>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`text-[36px] sm:text-[54px] lg:text-[72px] ${isRtl ? "" : "font-instrument italic"} text-[#555f6d] leading-[1.2] mb-10 tracking-[0.02em]`}>
            {t.hero.headline}
          </motion.h2>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="max-w-[760px] mx-auto text-[17px] md:text-[19px] text-[#555f6d] leading-[1.6] opacity-80 mb-14">
            {t.hero.subtext}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="max-w-[760px] mx-auto bg-white p-2 rounded-[16px] shadow-[0_0_0_1px_rgba(17,24,39,0.05),0_20px_25px_-5px_rgba(0,0,0,0.1)] flex items-center">
            <div className="pl-6 pr-4 flex-1 flex items-center gap-4">
              <div className="w-10 h-10 flex items-center justify-center text-[#94a3b8] opacity-60">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /><path d="M16 5h6" /><path d="M19 2v6" /></svg>
              </div>
              <input type="text" placeholder="" className="w-full h-full bg-transparent outline-none text-[16px] text-[#111d27] placeholder:text-[#94a3b8] font-medium" />
            </div>
            <button className="h-[52px] px-8 bg-[#004643] text-white rounded-[14px] font-bold text-[15px] hover:bg-[#003330] transition-all flex items-center gap-3 shadow-lg">
              {t.hero.startDesign}
              <ArrowRight className={`w-4 h-4 opacity-80 ${isRtl ? "scale-x-[-1]" : ""}`} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* PLANNING TOOLS */}
      <section className="py-[80px] px-4 bg-white">
        <div className="max-w-[1240px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[32px] md:text-[44px] font-bold text-[#111d27] mb-4 tracking-tight">{t.tools.heading}</h2>
            <p className="text-[18px] text-[#555f6d] opacity-70">{t.tools.subtext}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tools.map((tool, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="group bg-[#F9FAFB] rounded-[32px] p-8 border border-black/[0.03] shadow-sm hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6">{tool.icon}</div>
                <h4 className="text-[22px] font-bold text-[#111d27] mb-4">{tool.title}</h4>
                <p className="text-[16px] text-[#555f6d] leading-relaxed mb-8 opacity-70">{tool.desc}</p>
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#f1f5f9]">
                  <Image fill src={tool.img} alt={tool.title} className="object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* BLUEPRINT TO REALITY */}
      <section className="py-[100px] md:py-[140px] px-4 bg-[#004643] overflow-hidden relative">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#8bec5c]/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-[1240px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-[120px]">
          <div className="flex-1 text-white relative z-10 w-full lg:max-w-[640px]">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/10 rounded-full mb-8">
              <span className="text-[15px] font-medium text-white/90">{t.workflow.badge}</span>
            </div>
            <h2 className="text-[40px] md:text-[56px] font-bold leading-[1.1] mb-8 tracking-tight">{t.workflow.heading}</h2>
            <p className="text-white/70 text-[16px] md:text-[18px] leading-relaxed mb-12">{t.workflow.body}</p>

            <div className="space-y-10 mb-16">
              {steps.map((item, i) => (
                <div key={i} className="flex gap-6 items-start">
                  <div className="w-10 h-10 bg-white/10 border border-white/5 rounded-full flex items-center justify-center shrink-0 font-bold text-[14px]">{item.step}</div>
                  <div>
                    <h4 className="text-[20px] font-bold mb-2">{item.title}</h4>
                    <p className="text-white/60 text-[15px] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="h-[56px] pl-6 pr-1.5 bg-[#94A3B8]/40 hover:bg-[#94A3B8]/50 backdrop-blur-md text-white rounded-[16px] font-semibold text-[17px] transition-all flex items-center gap-6 border border-white/10 shadow-sm group">
              {t.workflow.startProject}
              <div className="w-[44px] h-[44px] bg-white rounded-[12px] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <ArrowRight className={`w-4 h-4 text-[#004643] ${isRtl ? "scale-x-[-1]" : ""}`} />
              </div>
            </button>
          </div>

          <div className="flex-1 w-full flex justify-center lg:justify-end relative group">
            <div className="relative w-full max-w-[576px] h-[576px] aspect-square rounded-[24px] overflow-hidden shadow-2xl rotate-2 transition-transform duration-700 group-hover:-rotate-1">
              <Image fill src="/assets/interior.png" alt="Interior" className="object-cover group-hover:scale-105 transition-transform duration-700" />
            </div>
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} className="absolute bottom-[-20px] lg:bottom-[-30px] left-1/2 -translate-x-1/2 lg:left-[-40px] lg:translate-x-0 w-[calc(100%-40px)] max-w-[280px] bg-white rounded-[24px] p-5 shadow-[0_30px_60px_rgba(0,0,0,0.4)] border border-white/50 z-20">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-[60px] h-[60px] bg-[#f8fafc] rounded-[16px] flex items-center justify-center p-2">
                  <Image width={60} height={60} src="/assets/seating.png" alt="Sofa" className="w-full h-full object-contain" />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-[#111d27] mb-0.5">{t.workflow.productName}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-bold text-[#10b981]">{t.workflow.inStock}</span>
                    <span className="text-[12px] text-[#94a3b8]">•</span>
                    <span className="text-[12px] font-bold text-[#10b981]">{t.workflow.fitsPerfectly}</span>
                  </div>
                </div>
              </div>
              <button className="w-full h-[44px] bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#111d27] rounded-full text-[13px] font-bold transition-colors">
                {t.workflow.addToCart}
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* POPULAR LAYOUTS */}
      <section className="py-[120px] px-4 bg-white">
        <div className="max-w-[1240px] mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
            <div className="text-left">
              <h2 className="text-[32px] md:text-[44px] font-bold text-[#004643] mb-4 tracking-tight">{t.layouts.heading}</h2>
              <p className="text-[18px] text-[#555f6d] opacity-70">{t.layouts.subtext}</p>
            </div>
            <button className="text-[15px] font-bold text-[#004643] flex items-center gap-2 hover:gap-3 transition-all">
              {t.layouts.viewAll} <ArrowRight className={`w-4 h-4 ${isRtl ? "scale-x-[-1]" : ""}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {layouts.map((layout, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="group cursor-pointer bg-white rounded-[32px] border border-black/[0.03] shadow-sm hover:shadow-xl transition-all overflow-hidden">
                <div className="relative aspect-[1.4/1] overflow-hidden">
                  <Image fill src={layout.img} alt={layout.title} className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full">
                    <span className="text-[10px] font-medium text-[#111d27] uppercase tracking-1">{layout.tag}</span>
                  </div>
                </div>
                <div className="p-8">
                  <h4 className="text-[20px] font-bold text-[#004643] mb-2">{layout.title}</h4>
                  <p className="text-[14px] text-[#94a3b8] mb-8">{layout.meta}</p>
                  <div className="pt-6 border-t border-[#f1f5f9] flex justify-between items-center">
                    <div className="flex -space-x-2">
                      {[1, 2].map((a) => (
                        <div key={a} className="w-8 h-8 rounded-full border-2 border-white bg-[#f1f5f9] overflow-hidden">
                          <Image width={32} height={32} src="/assets/imgAvatar.png" alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <span className="text-[14px] font-bold text-[#004643] group-hover:underline">{t.layouts.useTemplate}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-[120px] md:py-[160px] px-4 lg:px-8 relative flex justify-center items-center overflow-hidden" style={{ background: `linear-gradient(180deg, rgba(1, 28, 27, 0.52) 0%, rgba(0, 78, 75, 0.87) 97.32%), url('/assets/kitchen.jpg') lightgray 50% / cover no-repeat` }}>
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#B6F09C]/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#0ea5e9]/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full max-w-[1280px] px-5 py-[80px] md:py-[100px] lg:px-[200px] bg-white/5 backdrop-blur-[12px] border border-white/20 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          <h2 className="mb-[16px] md:mb-[24px] text-[40px] md:text-[80px] font-medium text-white tracking-tight text-center leading-[1.1]">
            {isRtl ? t.cta.heading : <>{t.cta.heading.split("your")[0]}<br /><span className="text-white/70">your {t.cta.heading.split("your")[1]}</span></>}
          </h2>
          <p className="text-white/70 text-[16px] md:text-[18px] text-center leading-relaxed">{t.cta.body}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-[16px] mt-[32px] md:mt-[48px]">
            <button className="h-[52px] pl-[20px] pr-[6px] bg-[#c4f4a3] hover:bg-[#b5eb92] text-[#004643] rounded-[12px] font-medium text-[15px] transition-all flex items-center gap-[12px] shadow-sm group">
              {t.cta.startTrial}
              <div className="w-[40px] h-[40px] bg-white rounded-[8px] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <ArrowRight className={`w-4 h-4 text-[#004643] ${isRtl ? "scale-x-[-1]" : ""}`} />
              </div>
            </button>
            <button className="h-[52px] px-[28px] border border-white/40 hover:bg-white/10 text-white rounded-[12px] font-medium text-[15px] transition-all">{t.cta.bookDemo}</button>
          </div>
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
              <p className="text-[#6b7280] mb-8 text-[14px] leading-relaxed max-w-[320px] font-schibsted opacity-80">
                {isRtl ? "اشترك في نشرة Nooi الأسبوعية واستمتع بسبعة أيام من أخبار التصميم الداخلي في رسالة واحدة، مع توصيل عالمي." : "Subscribe to the nooi weekly and enjoy seven days of interior design news in one newsletter, with worldwide delivery."}
              </p>
              <div className="relative max-w-[340px] mb-8">
                <input type="email" placeholder={isRtl ? "أدخل بريدك الإلكتروني" : "Enter your email"} className="w-full h-[52px] bg-white border border-[#e8eaec] rounded-[10px] px-5 outline-none focus:border-[#004643] transition-colors text-[14px] pr-[110px]" />
                <button className="absolute right-1.5 top-1.5 h-[40px] bg-[#004643] text-white px-6 rounded-[8px] text-[13px] font-bold hover:bg-[#003330] transition-colors">{isRtl ? "اشترك" : "Subscribe"}</button>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
                  <div className="w-5 h-5 flex items-center justify-center border border-black rounded p-0.5"><Image width={16} height={16} src="/assets/windows.svg" alt="" className="w-full h-full grayscale" /></div>
                  <span className="text-[12px] font-bold">{isRtl ? "تطبيق Nooi لويندوز" : "Nooi Windows App"}</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
                  <div className="w-5 h-5 flex items-center justify-center border border-black rounded p-0.5"><Image width={16} height={16} src="/assets/apple.svg" alt="" className="w-full h-full grayscale" /></div>
                  <span className="text-[12px] font-bold">{isRtl ? "تطبيق Nooi لماك" : "Nooi Mac App"}</span>
                </div>
              </div>
            </div>

            {[
              { heading: isRtl ? "المنتج" : "Product", items: isRtl ? ["مخطط الأرضيات", "التصميم الداخلي", "تصميم المطابخ والخزائن", "عارض ثلاثي الأبعاد", "أثاث مخصص"] : ["Floor planner", "Interior design", "Kitchen & Closet Design", "3D Viewer", "Custom Furniture"] },
              { heading: isRtl ? "الشركة" : "Company",  items: isRtl ? ["من نحن", "اتصل بنا", "برنامج الشركاء", "الوظائف"] : ["About Us", "Contact us", "Affiliate program", "Careers"] },
              { heading: isRtl ? "الموارد" : "Resources",items: isRtl ? ["أفكار تصميم المنزل", "الدروس التعليمية", "مركز المساعدة", "تطبيق Nooi"] : ["Home Design Ideas", "Tutorial", "Help center", "Nooi app"] },
            ].map((col, i) => (
              <div key={i}>
                <h5 className="text-[14px] font-bold text-[#111D27] mb-6 tracking-tight uppercase">{col.heading}</h5>
                <ul className="space-y-4 text-[14px] text-[#6b7280] font-schibsted">
                  {col.items.map((l) => <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors opacity-80">{l}</li>)}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-[#f0f0f0] flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-[#9ca3af] text-[12px] font-schibsted">{isRtl ? "© 2026 شركة Nooi. جميع الحقوق محفوظة." : "2026 Nooi, Inc. All Rights Reserved."}</p>
            <div className="flex items-center gap-8 text-[12px] text-[#9ca3af] font-schibsted">
              <span className="hover:text-[#111d27] cursor-pointer">{isRtl ? "الشروط والأحكام" : "Terms & Conditions"}</span>
              <span className="hover:text-[#111d27] cursor-pointer">{isRtl ? "سياسة الخصوصية" : "Privacy Policy"}</span>
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