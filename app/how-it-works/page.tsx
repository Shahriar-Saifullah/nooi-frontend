"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { useHowItWorksTranslations, useHomeTranslations, useLanguage } from "@/lib/i18n/useTranslations";

function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  const t = useHomeTranslations();
  return (
    <button onClick={toggleLanguage} className="flex items-center gap-1.5 text-[#9ca3af] text-[12px] font-medium cursor-pointer hover:text-neutral-700 transition-colors">
      <Image width={14} height={14} src="/assets/language-circle.svg" alt="" className="w-[14px] h-[14px]" />
      <span>{t.footer.language}</span>
      <span className="text-[10px] opacity-60">({language === "en" ? "AR" : "EN"})</span>
    </button>
  );
}

function CheckItem({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-3 text-[15px] text-[#4b5863]">
      <div className="w-5 h-5 rounded-full bg-[#004643] flex items-center justify-center shrink-0">
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {label}
    </li>
  );
}

export default function HowItWorksPage() {
  const t = useHowItWorksTranslations();
  const tf = useHomeTranslations();
  const { language } = useLanguage();

  return (
    <div className="relative min-h-screen bg-white font-schibsted overflow-x-hidden">

      <Navbar />

      {/* HERO */}
      <section className="pt-[152px] pb-[80px] px-4 bg-[#eef2f7] flex flex-col items-center text-center">
        <div className="bg-white/30 border border-[#548381]/20 rounded-full px-[14px] py-[7px] flex items-center gap-[8px] mb-8">
          <Image width={14} height={14} src="/assets/stars.svg" alt="" />
          <span className="text-[13px] font-medium text-[#555f6d]">{t.hero.badge}</span>
        </div>
        <h1 className="font-schibsted font-semibold text-[48px] sm:text-[58px] lg:text-[72px] leading-[1.1] text-[#111d27] tracking-[-2px] mb-4 max-w-[800px]">
          {t.hero.headlineLine1}
        </h1>
        <h2 className={`font-instrument italic font-normal text-[48px] sm:text-[58px] lg:text-[72px] leading-[1.1] text-[#111d27] tracking-[-1.5px] mb-6`}>
          {t.hero.headlineLine2}
        </h2>
        <p className="text-[17px] sm:text-[19px] text-[#393945]/70 max-w-[560px] leading-[1.6] mb-10">
          {t.hero.subtext}
        </p>
        <Link
          href="/authpage/signup"
          className={`bg-[#004643] text-white py-[8px] rounded-[16px] flex items-center gap-[16px] hover:bg-[#003330] transition-all shadow-lg pl-[24px] pr-[8px]`}
        >
          <span className="text-[16px] font-medium">{t.hero.cta}</span>
          <div className="bg-white p-[10px] rounded-[12px] flex items-center justify-center">
            <Image width={20} height={20} src="/assets/arrow-right-02-sharp.svg" alt="" className={`w-[16px] h-[16px]`} />
          </div>
        </Link>
      </section>

      {/* STEP 1 */}
      <section className="py-[80px] px-4 bg-white">
        <div className="max-w-[1240px] mx-auto flex flex-col lg:flex-row items-center gap-[60px] lg:gap-[100px]">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex-1 max-w-[500px]">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-7 h-7 rounded-full bg-[#004643] text-white text-[13px] font-bold flex items-center justify-center">
                {language === "ar" ? "١" : "1"}
              </span>
              <span className="text-[13px] font-medium text-[#004643] tracking-wide uppercase">{t.step1.phase}</span>
            </div>
            <h2 className="text-[36px] sm:text-[42px] font-bold text-[#111d27] leading-[1.2] mb-5 font-schibsted">{t.step1.heading}</h2>
            <p className="text-[17px] text-[#4b5863] leading-[1.6] mb-8">{t.step1.body}</p>
            <ul className="space-y-3 mb-10">
              <CheckItem label={t.step1.feat1} />
              <CheckItem label={t.step1.feat2} />
            </ul>
            <button className={`flex items-center gap-3 bg-[#004643] text-white px-6 py-3 rounded-[12px] hover:bg-[#003330] transition-colors font-medium text-[15px] `}>
              {t.step1.cta}
              <Image width={16} height={16} src="/assets/arrow-right-02-sharp.svg" alt="" className={`brightness-[10]`} />
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex-1 w-full max-w-[560px]">
            <div className="bg-[#f1f5f9] rounded-[32px] p-6 aspect-[4/3] flex items-center justify-center relative overflow-hidden">
              <div className="bg-white rounded-[20px] shadow-xl p-4 w-[85%] aspect-[4/3] flex flex-col items-center justify-center gap-4">
                <Image width={400} height={300} src="/assets/4th Draft 1.png" alt="Floor Plan" className="w-full h-auto object-contain rounded-[12px]" />
                <div className="flex items-center gap-2 bg-[#f8fafc] border border-[#e2eaf0] rounded-full px-4 py-2">
                  <div className="w-2 h-2 rounded-full bg-[#004643] animate-pulse" />
                  <span className="text-[13px] text-[#555f6d] font-medium">{t.step1.scanning}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STEP 2 */}
      <section className="py-[80px] px-4 bg-[#f8fafc]">
        <div className="max-w-[1240px] mx-auto flex flex-col lg:flex-row-reverse items-center gap-[60px] lg:gap-[100px]">
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex-1 max-w-[500px]">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-7 h-7 rounded-full bg-[#004643] text-white text-[13px] font-bold flex items-center justify-center">
                {language === "ar" ? "٢" : "2"}
              </span>
              <span className="text-[13px] font-medium text-[#004643] tracking-wide uppercase">{t.step2.phase}</span>
            </div>
            <h2 className="text-[36px] sm:text-[42px] font-bold text-[#111d27] leading-[1.2] mb-5 font-schibsted">{t.step2.heading}</h2>
            <p className="text-[17px] text-[#4b5863] leading-[1.6] mb-8">{t.step2.body}</p>
            <div className="grid grid-cols-2 gap-4 mb-10">
              {[
                { icon: "/assets/stars.svg", title: t.step2.style, desc: t.step2.styleDesc },
                { icon: "/assets/icon.svg",  title: t.step2.lighting, desc: t.step2.lightDesc },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-[16px] p-4 border border-[#e2eaf0]">
                  <div className="w-8 h-8 bg-[#eef2f7] rounded-[8px] flex items-center justify-center mb-3">
                    <Image width={16} height={16} src={item.icon} alt="" className="w-4 h-4" />
                  </div>
                  <p className="text-[14px] font-semibold text-[#111d27]">{item.title}</p>
                  <p className="text-[12px] text-[#6b7280]">{item.desc}</p>
                </div>
              ))}
            </div>
            <button className={`flex items-center gap-3 bg-[#004643] text-white px-6 py-3 rounded-[12px] hover:bg-[#003330] transition-colors font-medium text-[15px] `}>
              {t.step2.cta}
              <Image width={16} height={16} src="/assets/arrow-right-02-sharp.svg" alt="" className={`brightness-[10]`} />
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex-1 w-full max-w-[560px]">
            <div className="bg-[#e8edf5] rounded-[32px] overflow-hidden aspect-[4/3] relative">
              <Image fill src="/assets/furniture-2-2.png" alt="Design Studio" className="object-cover" />
              <div className="absolute bottom-6 left-6 bg-white rounded-[16px] p-4 shadow-xl flex items-center gap-4 w-[200px]">
                <div className="w-8 h-8 rounded-full bg-[#c2c6c9] shrink-0" />
                <div>
                  <p className="text-[11px] text-[#9ca3af]">{t.step2.styleLabel}</p>
                  <p className="text-[13px] font-semibold text-[#111d27]">{t.step2.styleName}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STEP 3 */}
      <section className="py-[80px] px-4 bg-white">
        <div className="max-w-[1240px] mx-auto flex flex-col lg:flex-row items-center gap-[60px] lg:gap-[100px]">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex-1 max-w-[500px]">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-7 h-7 rounded-full bg-[#004643] text-white text-[13px] font-bold flex items-center justify-center">
                {language === "ar" ? "٣" : "3"}
              </span>
              <span className="text-[13px] font-medium text-[#004643] tracking-wide uppercase">{t.step3.phase}</span>
            </div>
            <h2 className="text-[36px] sm:text-[42px] font-bold text-[#111d27] leading-[1.2] mb-5 font-schibsted">{t.step3.heading}</h2>
            <p className="text-[17px] text-[#4b5863] leading-[1.6] mb-8">{t.step3.body}</p>
            <div className="bg-[#0c1a17] rounded-[20px] p-5 mb-10">
              <p className="text-white font-semibold text-[16px] mb-1">{t.step3.renderCard}</p>
              <p className="text-white/60 text-[13px] mb-4">{t.step3.renderDesc}</p>
              <button className={`flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-[10px] transition-colors font-medium text-[14px] `}>
                {t.step3.renderCta}
                <Image width={16} height={16} src="/assets/arrow-right-02-sharp.svg" alt="" className={`brightness-[10]`} />
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex-1 w-full max-w-[560px]">
            <div className="grid grid-cols-2 gap-3">
              {["/assets/imgImage8.png", "/assets/imgImage10.png", "/assets/imgImage12.png", "/assets/imgImage14.png"].map((src, i) => (
                <div key={i} className="aspect-square rounded-[16px] overflow-hidden relative">
                  <Image fill src={src} alt={`Render ${i + 1}`} className="object-cover" />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="py-[80px] px-4 bg-[#0c1a17] flex flex-col items-center text-center">
        <div className="text-[#8bec5c] text-[48px] mb-6">"</div>
        <blockquote className="text-white text-[22px] sm:text-[28px] font-medium leading-[1.5] max-w-[760px] mb-8 font-schibsted italic">
          {t.testimonial.quote}
        </blockquote>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#1e3a3a] overflow-hidden relative">
            <Image fill src="/assets/imgAvatar.png" alt={t.testimonial.name} className="object-cover" />
          </div>
          <div >
            <p className="text-white font-semibold text-[15px]">{t.testimonial.name}</p>
            <p className="text-white/50 text-[13px]">{t.testimonial.role}</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-[80px] px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image fill src="/assets/imgImage13.png" alt="" className="object-cover" />
          <div className="absolute inset-0 bg-[#111D27]/70" />
        </div>
        <div className="relative z-10 max-w-[760px] mx-auto text-center">
          <h2 className="text-[48px] sm:text-[64px] font-bold text-white leading-[1.05] mb-6 tracking-tight">{t.cta.heading}</h2>
          <p className="text-[16px] sm:text-[18px] text-white/60 max-w-[480px] mx-auto mb-10 leading-[1.65]">{t.cta.body}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/authpage/signup" className="w-full sm:w-auto bg-[#8bec5c] text-[#142d26] px-9 py-3.5 rounded-full text-[15px] font-bold hover:bg-[#a3f37e] transition-colors">
              {t.cta.startTrial} →
            </Link>
            <button className="w-full sm:w-auto bg-white/10 backdrop-blur-md border border-white/20 text-white px-9 py-3.5 rounded-full text-[15px] font-bold hover:bg-white/20 transition-colors">
              {t.cta.bookDemo}
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white pt-[72px] pb-9">
        <div className="max-w-[1240px] mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10 lg:gap-12 mb-14">
            <div>
              <Link href="/" className="flex items-center gap-[10px] mb-5">
                <Image width={34} height={34} src="/assets/logo.png" alt="NOOI" className="w-[34px] h-auto" />
                <span className="font-inter font-bold text-[20px] text-neutral-900 tracking-tight">NOOI</span>
              </Link>
              <p className="text-[#6b7280] mb-7 text-[14px] leading-relaxed max-w-[320px]">{t.footer.tagline}</p>
              <div className="relative max-w-[340px] mb-7">
                <input type="email" placeholder={t.footer.emailPlaceholder} className="w-full h-[48px] bg-[#f5f7f8] border border-[#e8eaec] rounded-full px-5 outline-none text-[13px] pr-[110px] placeholder:text-[#9ca3af]" />
                <button className="absolute right-1.5 top-1.5 h-[36px] bg-[#004643] text-white px-5 rounded-full text-[12px] font-bold hover:bg-[#003330] transition-colors">{t.footer.subscribe}</button>
              </div>
            </div>
            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-5">{tf.footer.productHeading}</h5>
              <ul className="space-y-3.5 text-[14px] text-[#6b7280]">
                {[tf.footer.productLinks.roomPlanner, tf.footer.productLinks.aiHomePlanner, tf.footer.productLinks.kitchenPlanner, tf.footer.productLinks.pricing].map((l) => <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors">{l}</li>)}
              </ul>
            </div>
            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-5">{tf.footer.companyHeading}</h5>
              <ul className="space-y-3.5 text-[14px] text-[#6b7280]">
                {[tf.footer.companyLinks.aboutUs, tf.footer.companyLinks.blog, tf.footer.companyLinks.careers, tf.footer.companyLinks.privacy].map((l) => <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors">{l}</li>)}
              </ul>
            </div>
            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-5">{tf.footer.resourcesHeading}</h5>
              <ul className="space-y-3.5 text-[14px] text-[#6b7280]">
                {[tf.footer.resourcesLinks.documentation, tf.footer.resourcesLinks.community, tf.footer.resourcesLinks.support, tf.footer.resourcesLinks.blog].map((l) => <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors">{l}</li>)}
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-[#f0f0f0] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[#9ca3af] text-[12px]">{t.footer.legal}</p>
            <div className="flex items-center gap-6">
              <span className="text-[#9ca3af] text-[12px]">{t.footer.terms}</span>
              <span className="text-[#9ca3af] text-[12px]">{t.footer.privacy}</span>
              <LanguageToggle />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}