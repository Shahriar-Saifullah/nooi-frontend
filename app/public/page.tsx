"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import LandingPromptBox from "@/components/LandingPromptBox";
import { useHomeTranslations, useLanguage } from "@/lib/i18n/useTranslations";

const PremiumFeatureContainer = ({ img1, img2 }: { img1: string, img2: string }) => {
  return (
    <div className="relative w-full aspect-[640/560] bg-[#f0f4f8]/30 rounded-[32px] overflow-visible border border-[#e2eaf0] shadow-inner group p-4 sm:p-10">
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none rounded-[32px]" style={{ backgroundImage: 'linear-gradient(#004643 1px, transparent 1px), linear-gradient(90deg, #004643 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

      <motion.div
        initial={{ x: 20, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
        className="absolute top-[12%] right-[2%] w-[22%] py-10 px-4 pb-3 pt-4 md:w-[140px] z-20"
      >
        <Image width={500} height={500} src="/assets/Furniture 4 3.png" className="w-full h-auto rounded-[16px] shadow-2xl border border-white/60" alt="Style Picker" />
      </motion.div>

      <motion.div
        initial={{ x: -60, y: -20, opacity: 0 }}
        whileInView={{ x: 0, y: 0, opacity: 1 }}
        viewport={{ once: true }}
        className="absolute top-[6%] left-[4%] w-[75%] h-[55%] z-10"
      >
        <div className="relative w-full h-full bg-white rounded-[24px] shadow-[0_30px_70px_rgba(0,0,0,0.1)] border border-white/80 p-1 md:p-2 flex items-center justify-center overflow-hidden">
          <Image width={800} height={800} src={img1}
            className="w-[115%] h-full object-contain drop-shadow-2xl transform scale-110 md:scale-125 transition-transform duration-500"
            alt="Window 1" />
        </div>
      </motion.div>

      <motion.div
        initial={{ x: 60, y: 60, opacity: 0 }}
        whileInView={{ x: 0, y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="absolute bottom-[6%] right-[5%] w-[75%] h-[55%] z-0"
      >
        <div className="relative w-full h-full bg-white rounded-[24px] shadow-[0_30px_70px_rgba(0,0,0,0.1)] border border-white/80 p-1 md:p-2 flex items-center justify-center overflow-hidden">
          <Image width={800} height={800} src={img2}
            className="w-[115%] h-full object-contain drop-shadow-2xl transform scale-110 md:scale-125 transition-transform duration-500"
            alt="Window 2" />
        </div>
      </motion.div>
    </div>
  );
};


export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [activeFilter, setActiveFilter] = useState(0);
  const t = useHomeTranslations();
  const { isRtl } = useLanguage();

  // ─── Scroll to change step ──────────────────────────────────────────────────
  const sectionRef = useRef<HTMLElement>(null);
  const isScrolling = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const handleWheel = (e: WheelEvent) => {
      if (isScrolling.current) return;

      if (e.deltaY > 0 && activeStep < 3) {
        e.preventDefault();
        isScrolling.current = true;
        setActiveStep(prev => prev + 1);
        setTimeout(() => { isScrolling.current = false; }, 700);
      } else if (e.deltaY < 0 && activeStep > 0) {
        e.preventDefault();
        isScrolling.current = true;
        setActiveStep(prev => prev - 1);
        setTimeout(() => { isScrolling.current = false; }, 700);
      }
    };

    section.addEventListener('wheel', handleWheel, { passive: false });
    return () => section.removeEventListener('wheel', handleWheel);
  }, [activeStep]);
  // ───────────────────────────────────────────────────────────────────────────

  // Visual/behavioral config (colors, images, flags) stays hardcoded — only
  // the display text is pulled from the translation dictionary below, so
  // each step's title/description/etc. switches with the active language.
  const stepConfig = [
    {
      img: "/assets/4th Draft 1.png",
      accentColor: "#b3ed97",
      mainBg: "#0c1a17",
      miniCardBg: "#3d4a39",
    },
    {
      img: "/assets/image 19.png",
      accentColor: "#c3b4fc",
      mainBg: "#1a0b3b",
      miniCardBg: "#4a3a6b",
      showMiniBtn: true,
      showScanLine: true
    },
    {
      img: "/assets/image step3.png",
      accentColor: "#d18d53",
      mainBg: "#2b1b11",
      miniCardBg: "#82614a",
    },
    {
      img: "/assets/image 19.png",
      accentColor: "#a5688e",
      mainBg: "#410948",
      miniCardBg: "#7C5A7D",
      showScanLine: true
    }
  ];

  const stepText = [t.howItWorks.steps.step1, t.howItWorks.steps.step2, t.howItWorks.steps.step3, t.howItWorks.steps.step4];
  const steps = stepConfig.map((cfg, i) => ({ ...cfg, ...stepText[i] }));

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="relative min-h-screen bg-white font-schibsted overflow-x-hidden">

      <Navbar />

      {/* HERO */}
      <section className="relative pt-[152px] pb-[60px] flex flex-col items-center z-10 px-4 min-h-[860px] overflow-hidden bg-[#eef2f7]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1408px] h-[717px] pointer-events-none -z-10 opacity-50">
          <Image fill src="/assets/bg-grid.svg" alt="" className="object-cover" />
        </div>

        <div className="flex flex-col gap-[44px] items-center max-w-[1240px] w-full">
          <div className="bg-white/30 border border-[#548381]/20 rounded-full px-[14px] py-[7px] flex items-center gap-[8px] cursor-default backdrop-blur-sm">
            <Image width={100} height={100} src="/assets/stars.svg" alt="" className="w-[14px] h-[14px]" />
            <p className="text-[13px] font-medium tracking-tight flex gap-1">
              {!isRtl && <span className="text-[#b0b0b5] font-schibsted font-medium">New:</span>}
              <span className="text-[#555f6d] font-schibsted font-medium">{t.hero.badge}</span>
            </p>
          </div>

          <div className="flex flex-col items-center gap-0">
            <h1 className="text-center max-w-[960px] flex flex-col items-center">
              <span className="block font-schibsted font-semibold text-[48px] sm:text-[58px] lg:text-[64px] leading-[1.15] text-[#111d27]" style={{ letterSpacing: "0px" }}>
                {t.hero.headlineLine1}
              </span>
              <span
                className={`block ${isRtl ? "" : "italic"} font-normal text-[48px] sm:text-[58px] lg:text-[64px] leading-[1.15] text-[#111d27] -mt-1`}
                style={{ fontFamily: "var(--font-instrument), 'Instrument Serif', Georgia, serif", fontStyle: isRtl ? "normal" : "italic", letterSpacing: "0.5px" }}
              >
                {t.hero.headlineLine2}
              </span>
            </h1>
            <p className="font-schibsted font-normal text-[17px] sm:text-[19px] leading-[1.6] text-[#393945]/70 text-center max-w-[580px] mt-7">
              {t.hero.subtext}
            </p>
          </div>

          <LandingPromptBox />
        </div>
      </section>

      {/* PRODUCT */}
      <section className="py-[50px] lg:py-[60px] px-4 bg-white flex flex-col items-center">
        <div className="max-w-[752px] text-center mb-[60px]">
          <h2 className="text-[48px] font-semibold text-[#272e35] leading-[1.2] mb-[16px] font-schibsted">{t.productFeatures.sectionLabel}</h2>
          <p className="text-[20px] text-[#555f6d] leading-[1.5] font-schibsted">
            {t.productFeatures.description}
          </p>
        </div>

        <div className="w-full max-w-[1240px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px] mb-[60px]">
          {[
            { name: t.productFeatures.cards.roomPlanner, img: "/assets/video-pic-1.png" },
            { name: t.productFeatures.cards.aiHomePlanner, img: "/assets/video-pic-2.png" },
            { name: t.productFeatures.cards.kitchenPlanner, img: "/assets/video-pic-1.png" },
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              className="bg-[#f1f5f9] border border-[#e6f0f2] rounded-[16px] p-[24px] flex flex-col transition-all hover:shadow-lg group"
            >
              <div className="bg-white border border-[#e6f0f2] rounded-[8.2px] p-[12px] mb-[24px] aspect-[350/255] flex items-center justify-center overflow-hidden">
                <Image width={500} height={500} src={feature.img} alt={feature.name} className="w-full h-auto object-contain" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-[28px] font-bold text-[#272e35] leading-[1.2] font-scada">{feature.name}</h3>
                <button className="w-[46px] h-[46px] bg-[#142d25] rounded-[8px] flex items-center justify-center hover:bg-[#003330] transition-colors shadow-sm shrink-0">
                  <Image width={100} height={100} src="/assets/arrow-outward.svg" alt="Go" className={`w-[24px] h-[24px] brightness-[10] ${isRtl ? "scale-x-[-1]" : ""}`} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <button className="bg-[#004643] text-white pl-[24px] pr-[4px] py-[4px] rounded-[16px] flex items-center gap-[16px] hover:bg-[#003330] transition-all shadow-[0px_19px_19px_rgba(0,0,0,0.09)] group">
          <span className="text-[20px] font-schibsted font-normal">{t.productFeatures.viewAllDesign}</span>
          <div className="bg-white p-[12px] rounded-[12px] flex items-center justify-center">
            <Image width={100} height={100} src="/assets/arrow-right-02-sharp.svg" alt="" className={`w-[24px] h-[24px] ${isRtl ? "scale-x-[-1]" : ""}`} />
          </div>
        </button>
      </section>

      {/* KEY */}
      <section className="py-[50px] lg:py-[60px] px-4 bg-white">
        <div className="max-w-[1240px] mx-auto">
          <div className="max-w-[762px] mx-auto text-center mb-[80px]">
            <h2 className="text-[48px] font-semibold text-[#111d27] leading-[1.2] mb-[16px] font-schibsted">{t.keyFeatures.sectionLabel}</h2>
            <p className="text-[20px] text-[#374551] leading-[1.5] font-schibsted">
              {t.keyFeatures.description}
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-[113px] mb-[50px] lg:mb-[60px]">
            <div className="flex-1 max-w-[519px]">
              <div className="bg-[#f8fafc] border border-[#e2eaf0] rounded-full px-4 py-1.5 w-fit mb-6">
                <p className="text-[14px] font-medium font-inter">
                  {!isRtl && <span className="text-[#deb01d]">New: </span>}
                  <span className="text-[#6b7780]">{t.keyFeatures.badge}</span>
                </p>
              </div>
              <h3 className="text-[36px] font-bold text-[#111d27] leading-[1.2] mb-6 font-schibsted">{t.keyFeatures.items.aiFloorPlanner.heading}</h3>
              <p className="text-[20px] text-[#4b5863] leading-[1.5] mb-10 font-schibsted">
                {t.keyFeatures.items.aiFloorPlanner.copy}
              </p>
              <button className="bg-[#004643] text-white pl-[16px] pr-[4px] py-[4px] rounded-[16px] flex items-center gap-[16px] hover:bg-[#003330] transition-all shadow-[0px_19px_19px_rgba(0,0,0,0.09)] group">
                <span className="text-[20px] font-schibsted font-normal">{t.productFeatures.viewAllDesign}</span>
                <div className="bg-white p-[12px] rounded-[12px] flex items-center justify-center">
                  <Image width={100} height={100} src="/assets/arrow-right-02-sharp.svg" alt="" className={`w-[24px] h-[24px] ${isRtl ? "scale-x-[-1]" : ""}`} />
                </div>
              </button>
            </div>
            <div className="flex-1 w-full max-w-[608px]">
              <PremiumFeatureContainer img1="/assets/furniture-2-2.png" img2="/assets/furniture-4-2.png" />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row-reverse items-center gap-10 lg:gap-[113px] mb-[50px] lg:mb-[60px]">
            <div className="flex-1 max-w-[519px]">
              <div className="bg-[#f8fafc] border border-[#e2eaf0] rounded-full px-4 py-1.5 w-fit mb-6">
                <p className="text-[14px] font-medium font-inter">
                  {!isRtl && <span className="text-[#deb01d]">New: </span>}
                  <span className="text-[#6b7780]">{t.keyFeatures.badge}</span>
                </p>
              </div>
              <h3 className="text-[36px] font-bold text-[#111d27] leading-[1.2] mb-6 font-schibsted">{t.keyFeatures.items.realTimeDesign.heading}</h3>
              <p className="text-[20px] text-[#4b5863] leading-[1.5] mb-10 font-schibsted">
                {t.keyFeatures.items.realTimeDesign.copy}
              </p>
              <button className="bg-[#004643] text-white pl-[16px] pr-[4px] py-[4px] rounded-[16px] flex items-center gap-[16px] hover:bg-[#003330] transition-all shadow-[0px_19px_19px_rgba(0,0,0,0.09)] group">
                <span className="text-[20px] font-schibsted font-normal">{t.productFeatures.viewAllDesign}</span>
                <div className="bg-white p-[12px] rounded-[12px] flex items-center justify-center">
                  <Image width={100} height={100} src="/assets/arrow-right-02-sharp.svg" alt="" className={`w-[24px] h-[24px] ${isRtl ? "scale-x-[-1]" : ""}`} />
                </div>
              </button>
            </div>
            <div className="flex-1 w-full max-w-[608px]">
              <PremiumFeatureContainer img1="/assets/furniture-2-2.png" img2="/assets/imgImage10.png" />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-[113px]">
            <div className="flex-1 max-w-[519px]">
              <div className="bg-[#f8fafc] border border-[#e2eaf0] rounded-full px-4 py-1.5 w-fit mb-6">
                <p className="text-[14px] font-medium font-inter">
                  {!isRtl && <span className="text-[#deb01d]">New: </span>}
                  <span className="text-[#6b7780]">{t.keyFeatures.badge}</span>
                </p>
              </div>
              <h3 className="text-[36px] font-bold text-[#111d27] leading-[1.2] mb-6 font-schibsted">{t.keyFeatures.items.orderFromDesign.heading}</h3>
              <p className="text-[20px] text-[#4b5863] leading-[1.5] mb-10 font-schibsted">
                {t.keyFeatures.items.orderFromDesign.copy}
              </p>
              <button className="bg-[#004643] text-white pl-[16px] pr-[4px] py-[4px] rounded-[16px] flex items-center gap-[16px] hover:bg-[#003330] transition-all shadow-[0px_19px_19px_rgba(0,0,0,0.09)] group">
                <span className="text-[20px] font-schibsted font-normal">{t.productFeatures.viewAllDesign}</span>
                <div className="bg-white p-[12px] rounded-[12px] flex items-center justify-center">
                  <Image width={100} height={100} src="/assets/arrow-right-02-sharp.svg" alt="" className={`w-[24px] h-[24px] ${isRtl ? "scale-x-[-1]" : ""}`} />
                </div>
              </button>
            </div>
            <div className="flex-1 w-full max-w-[608px]">
              <PremiumFeatureContainer img1="/assets/imgImage1.png" img2="/assets/furniture-4-2.png" />
            </div>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section ref={sectionRef} className="py-[50px] lg:py-[60px] px-4 bg-white flex flex-col items-center">
        <div className="max-w-[700px] text-center mb-16">
          <h2 className="text-[52px] font-bold text-[#111d27] leading-[1.1] mb-5 tracking-tight font-schibsted">{t.howItWorks.sectionLabel}</h2>
          <p className="text-[20px] text-[#555f6d] leading-[1.5] font-schibsted">
            {t.howItWorks.description}
          </p>
        </div>

        {/* Card */}
        <motion.div
          animate={{ backgroundColor: steps[activeStep].mainBg }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[1240px] rounded-[22px] p-[20px] sm:p-[30px] lg:p-[40px_40px_40px_80px] flex flex-col lg:flex-row items-center lg:items-stretch gap-[40px] lg:gap-[100px] mx-auto overflow-hidden"
        >
          {/* Left Column */}
          <div className="flex-1 w-full max-w-[500px] flex flex-col mx-auto lg:mx-0 py-5">
            <div className="flex items-center border border-white/10 rounded-lg p-1 mb-[40px] md:mb-[80px] w-full sm:w-fit mx-auto lg:mx-0 overflow-hidden">
              <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
                {[1, 2, 3, 4].map((stepNum, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveStep(i)}
                    className={`cursor-pointer px-[8px] min-[375px]:px-[12px] sm:px-[16px] py-[8px] text-[13px] min-[375px]:text-[14px] sm:text-[18px] font-medium transition-all relative whitespace-nowrap shrink-0 rounded-md flex-1 sm:flex-none text-center ${activeStep === i ? "bg-white/5" : "text-[#859c80] hover:text-white/60"}`}
                    style={{ color: activeStep === i ? steps[activeStep].accentColor : undefined }}
                  >
                    {t.howItWorks.stepLabel} {stepNum}
                    {activeStep === i && (
                      <motion.div
                        layoutId="activeStepUnderline"
                        className="absolute bottom-0 left-1 right-1 h-[2px]"
                        style={{ backgroundColor: steps[activeStep].accentColor }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-[20px] min-h-[300px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-[32px] sm:text-[42px] font-bold text-white leading-[1.1] font-schibsted mb-6">
                    {steps[activeStep].title}
                  </h3>
                  <p className="text-[18px] sm:text-[20px] text-white/60 leading-[1.6] font-schibsted mb-[40px]">
                    {steps[activeStep].description}
                  </p>
                </motion.div>
              </AnimatePresence>

              <button
                className="text-white pl-[24px] pr-[8px] py-[8px] rounded-[16px] flex items-center gap-[16px] transition-all shadow-lg group w-fit mt-auto mx-auto lg:mx-0"
                style={{ backgroundColor: steps[activeStep].miniCardBg }}
              >
                <span className="text-[18px] font-schibsted font-normal">{steps[activeStep].btnText}</span>
                <div className="bg-white p-[10px] rounded-[12px] flex items-center justify-center">
                  <Image width={100} height={100} src="/assets/arrow-down-01.svg" alt="" className="w-[20px] h-[20px] -rotate-90" />
                </div>
              </button>
            </div>
          </div>

          {/* Right Column */}
          <motion.div
            animate={{ backgroundColor: steps[activeStep].miniCardBg }}
            transition={{ duration: 0.5 }}
            className="flex-1 w-full max-w-[520px] rounded-[24px] p-[25px] sm:p-[40px] flex flex-col gap-[25px] mx-auto lg:mx-0 shadow-2xl h-fit"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col h-full"
              >
                <h4 className="text-[24px] sm:text-[28px] text-white font-medium leading-[1.2] font-schibsted mb-6">
                  {steps[activeStep].miniTitle}
                </h4>
                <div className="rounded-[20px] pt-[20px] pb-[20px] mb-6 relative">
                  <div className="aspect-[4096/2730] rounded-[12px] overflow-hidden relative border border-white/5 shadow-sm">
                    <Image fill src={steps[activeStep].img} alt={steps[activeStep].miniTitle} className="object-cover rounded-[12px]" />
                  </div>
                </div>
                <p className="text-[16px] sm:text-[18px] text-white/80 leading-[1.6] font-schibsted mb-6">
                  {steps[activeStep].miniDesc}
                </p>
                {steps[activeStep].showMiniBtn && (
                  <button
                    className="w-full py-[14px] rounded-[14px] text-[18px] font-medium transition-all hover:opacity-90"
                    style={{ backgroundColor: steps[activeStep].accentColor, color: steps[activeStep].mainBg }}
                  >
                    {steps[activeStep].btnText}
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Scroll Progress Dots */}
        <div className="flex gap-2 mt-8 justify-center">
          {[0, 1, 2, 3].map(i => (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              className="transition-all duration-300 rounded-full"
              style={{
                width:  activeStep === i ? '24px' : '8px',
                height: '8px',
                backgroundColor: activeStep === i
                  ? steps[activeStep].accentColor
                  : 'rgba(128,128,128,0.3)',
              }}
            />
          ))}
        </div>
      </section>

      {/* GALLERY */}
      <section className="py-[50px] lg:py-[80px] px-4 bg-white">
        <div className="max-w-[1240px] mx-auto">
          <div className="max-w-[800px] mx-auto text-center mb-[40px]">
            <h2 className="text-[36px] sm:text-[48px] lg:text-[56px] font-bold text-[#111D27] leading-[1.1] mb-[16px] tracking-tight">
              {t.gallery.sectionLabel}
            </h2>
            <p className="text-[16px] sm:text-[18px] text-[#556370] leading-[1.6]">
              {t.gallery.description}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-[12px] mb-[50px]">
            {[
              t.gallery.filters.all,
              t.gallery.filters.livingRoom,
              t.gallery.filters.diningRoom,
              t.gallery.filters.kitchen,
              t.gallery.filters.furniture,
              t.gallery.filters.others,
            ].map((f, i) => (
              <button
                key={i}
                onClick={() => setActiveFilter(i)}
                className={`px-[20px] py-[8px] rounded-[6px] text-[14px] font-medium transition-all border ${activeFilter === i ? "bg-[#0c1a17] text-white border-[#0c1a17]" : "bg-white text-[#556370] border-gray-200 hover:border-gray-300"}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[20px]">
            <div className="flex flex-col gap-[20px]">
              <div className="relative w-full h-[380px] rounded-[20px] overflow-hidden group">
                <Image fill src="/assets/gallery-1.png" alt="Gallery" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-[16px] left-[16px] bg-white/90 backdrop-blur-sm px-[12px] py-[6px] rounded-[6px] flex items-center gap-[6px] shadow-sm">
                  <Image width={100} height={100} src="/assets/image-svg-1.svg" className="w-[14px] h-[14px] opacity-70" alt="" />
                  <span className="text-[12px] text-[#556370] font-medium">{t.gallery.viewMore} [4]</span>
                </div>
              </div>
              <div className="relative w-full h-[280px] rounded-[20px] overflow-hidden group">
                <Image fill src="/assets/gallery-2.png" alt="Gallery" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-[16px] left-[16px] bg-white/90 backdrop-blur-sm px-[12px] py-[6px] rounded-[6px] flex items-center gap-[6px] shadow-sm">
                  <Image width={100} height={100} src="/assets/image-svg-1.svg" className="w-[14px] h-[14px] opacity-70" alt="" />
                  <span className="text-[12px] text-[#556370] font-medium">{t.gallery.viewMore} [7]</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-[20px]">
              <div className="relative w-full h-[280px] rounded-[20px] overflow-hidden group">
                <Image fill src="/assets/gallery-3.png" alt="Gallery" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-[16px] left-[16px] bg-white/90 backdrop-blur-sm px-[12px] py-[6px] rounded-[6px] flex items-center gap-[6px] shadow-sm">
                  <Image width={100} height={100} src="/assets/image-svg-1.svg" className="w-[14px] h-[14px] opacity-70" alt="" />
                  <span className="text-[12px] text-[#556370] font-medium">{t.gallery.viewMore} [3]</span>
                </div>
              </div>
              <div className="relative w-full h-[380px] rounded-[20px] overflow-hidden group">
                <Image fill src="/assets/gallery-4.png" alt="Gallery" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-[16px] left-[16px] bg-white/90 backdrop-blur-sm px-[12px] py-[6px] rounded-[6px] flex items-center gap-[6px] shadow-sm">
                  <Image width={100} height={100} src="/assets/image-svg-1.svg" className="w-[14px] h-[14px] opacity-70" alt="" />
                  <span className="text-[12px] text-[#556370] font-medium">{t.gallery.viewMore} [6]</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-[20px] sm:col-span-2 lg:col-span-1">
              <div className="relative w-full sm:w-1/2 lg:w-full h-[380px] rounded-[20px] overflow-hidden group">
                <Image fill src="/assets/gallery-5.png" alt="Gallery" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-[16px] left-[16px] bg-white/90 backdrop-blur-sm px-[12px] py-[6px] rounded-[6px] flex items-center gap-[6px] shadow-sm">
                  <Image width={100} height={100} src="/assets/image-svg-1.svg" className="w-[14px] h-[14px] opacity-70" alt="" />
                  <span className="text-[12px] text-[#556370] font-medium">{t.gallery.viewMore} [10]</span>
                </div>
              </div>
              <div className="relative w-full sm:w-1/2 lg:w-full h-[280px] sm:h-[380px] lg:h-[280px] rounded-[20px] overflow-hidden group">
                <Image fill src="/assets/gallery-6.png" alt="Gallery" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-[16px] left-[16px] bg-white/90 backdrop-blur-sm px-[12px] py-[6px] rounded-[6px] flex items-center gap-[6px] shadow-sm">
                  <Image width={100} height={100} src="/assets/image-svg-1.svg" className="w-[14px] h-[14px] opacity-70" alt="" />
                  <span className="text-[12px] text-[#556370] font-medium">{t.gallery.viewMore} [17]</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="py-[60px] lg:py-[100px] px-4 bg-[#f8fafc]">
        <div className="max-w-[1240px] mx-auto">
          <div className="max-w-[800px] mx-auto text-center mb-[60px]">
            <h2 className="text-[36px] sm:text-[48px] lg:text-[56px] font-bold text-[#111D27] leading-[1.1] mb-[16px] tracking-tight">{t.whyChoose.sectionLabel}</h2>
            <p className="text-[16px] sm:text-[18px] text-[#556370] leading-[1.6]">
              {t.whyChoose.description}
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-[40px] lg:gap-[80px]">
            <div className="flex-1 w-full flex flex-col">
              {[
                { title: t.whyChoose.reasons.expertTools.title, desc: t.whyChoose.reasons.expertTools.desc, icon: "/assets/image-svg-2.svg", active: true },
                { title: t.whyChoose.reasons.allInOne.title, icon: "/assets/arrows-output.svg", active: false },
                { title: t.whyChoose.reasons.realWorld.title, icon: "/assets/icon.svg", active: false },
                { title: t.whyChoose.reasons.trusted.title, icon: "/assets/verified-user.svg", active: false },
                { title: t.whyChoose.reasons.accuracySpeed.title, icon: "/assets/vector-1.svg", active: false },
              ].map((item, i, arr) => (
                <div
                  key={i}
                  className={`flex items-start gap-[20px] p-[20px] sm:p-[24px] transition-all ${item.active ? "bg-[#f1f5f9] rounded-[16px] border border-transparent" : `border-b border-[#e2e8f0] rounded-none ${i === arr.length - 1 ? 'border-none' : ''}`}`}
                >
                  <div className="w-[48px] h-[48px] bg-[#e2e8f0] rounded-[12px] flex items-center justify-center shrink-0">
                    <Image width={100} height={100} src={item.icon || "/assets/verified-user.svg"} alt="" className="w-[20px] h-[20px] opacity-70" />
                  </div>
                  <div className="flex-1 min-w-0 pt-[10px]">
                    <h4 className="text-[18px] sm:text-[20px] font-medium text-[#111D27] leading-snug mb-[8px]">{item.title}</h4>
                    {item.active && item.desc && (
                      <p className="text-[#64748b] leading-relaxed text-[15px] sm:text-[16px] pr-4">{item.desc}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex-1 w-full relative">
              <div className="relative w-full aspect-square sm:aspect-[500/560] lg:aspect-auto lg:h-[600px] rounded-[32px] overflow-hidden bg-[#c2c6c9]">
                <Image fill src="/assets/feature-image.png" alt="3D Room" className="object-cover scale-105 opacity-90" />
              </div>
              <div className="absolute bottom-[20px] left-[20px] sm:bottom-[30px] sm:left-[30px] bg-white p-[24px] rounded-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.08)] w-[260px] sm:w-[300px]">
                <div className="flex justify-between items-start mb-[16px]">
                  <div>
                    <p className="text-[12px] text-[#94a3b8] font-medium mb-[4px]">Current Balance</p>
                    <p className="text-[20px] sm:text-[24px] font-bold text-[#111D27] leading-none">$ 250,560.0</p>
                  </div>
                  <div className="flex gap-[8px]">
                    <span className="text-[11px] text-[#94a3b8]">24h</span>
                    <span className="text-[11px] text-[#94a3b8]">7d</span>
                    <span className="text-[11px] text-[#94a3b8]">30d</span>
                  </div>
                </div>
                <div className="flex items-end justify-between h-[60px] gap-[8px] sm:gap-[12px] mb-[16px] px-1">
                  {[{ h: 35, active: false }, { h: 15, active: false }, { h: 25, active: false }, { h: 90, active: true }, { h: 20, active: false }].map((bar, i) => (
                    <div key={i} className={`w-full rounded-[6px] ${bar.active ? "bg-[#d4a017]" : "bg-[#f1f5f9]"}`} style={{ height: `${bar.h}%` }} />
                  ))}
                </div>
                <div className="flex justify-between items-center text-[10px] text-[#94a3b8] font-medium">
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((label, i) => (
                    <span key={i} className={`px-[8px] py-[4px] rounded-full transition-colors ${label === "Apr" ? "bg-[#1e3a3a] text-white" : ""}`}>{label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* UNLOCK */}
      <section className="relative py-[60px] lg:py-[80px] px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image fill src="/assets/imgImage13.png" alt="" className="object-cover" />
          <div className="absolute inset-0 bg-[#111D27]/70" />
        </div>
        <div className="relative z-10 max-w-[860px] mx-auto text-center">
          <h2 className="text-[48px] sm:text-[64px] lg:text-[80px] font-bold text-white leading-[1.05] mb-7 tracking-tight">
            {t.unlockCta.headlineLine1}<br />{t.unlockCta.headlineLine2}
          </h2>
          <p className="text-[15px] sm:text-[18px] text-white/60 max-w-[580px] mx-auto mb-12 leading-[1.65]">
            {t.unlockCta.subtext}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button className="w-full sm:w-auto bg-[#8bec5c] text-[#142d26] px-9 py-3.5 rounded-full text-[15px] font-bold hover:bg-[#a3f37e] transition-colors shadow-xl shadow-[#8bec5c]/20">
              {t.unlockCta.startTrial}
            </button>
            <button className="w-full sm:w-auto bg-white/10 backdrop-blur-md border border-white/20 text-white px-9 py-3.5 rounded-full text-[15px] font-bold hover:bg-white/20 transition-colors">
              {t.unlockCta.bookDemo}
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white pt-[72px] lg:pt-[90px] pb-9">
        <div className="max-w-[1240px] mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10 lg:gap-12 mb-14 lg:mb-16">
            <div>
              <Link href="/" className="flex items-center gap-[10px] mb-5">
                <Image width={500} height={500} src="/assets/logo.png" alt="NOOI" className="w-[34px] h-auto object-contain" />
                <span className="font-inter font-bold text-[20px] text-neutral-900 tracking-tight">NOOI</span>
              </Link>
              <p className="text-[#6b7280] mb-7 text-[14px] sm:text-[15px] leading-relaxed max-w-[320px]">
                {t.footer.tagline}
              </p>
              <div className="relative max-w-[340px] mb-7">
                <input type="email" placeholder={t.footer.emailPlaceholder} className="w-full h-[48px] bg-[#f5f7f8] border border-[#e8eaec] rounded-full px-5 outline-none text-[13px] pr-[110px] placeholder:text-[#9ca3af]" />
                <button className="absolute right-1.5 top-1.5 h-[36px] bg-[#004643] text-white px-5 rounded-full text-[12px] font-bold hover:bg-[#003330] transition-colors">{t.footer.subscribe}</button>
              </div>
              <div className="flex items-center gap-4">
                <Image width={100} height={100} src="/assets/windows.svg" alt="Windows" className="w-[18px] h-[18px] opacity-30 hover:opacity-70 transition-opacity cursor-pointer" />
                <Image width={100} height={100} src="/assets/apple.svg" alt="Mac" className="w-[18px] h-[18px] opacity-30 hover:opacity-70 transition-opacity cursor-pointer" />
              </div>
            </div>

            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-5 tracking-tight">{t.footer.productHeading}</h5>
              <ul className="space-y-3.5 text-[14px] text-[#6b7280]">
                {[
                  t.footer.productLinks.roomPlanner,
                  t.footer.productLinks.aiHomePlanner,
                  t.footer.productLinks.kitchenPlanner,
                  t.footer.productLinks.pricing,
                ].map((l) => (
                  <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors">{l}</li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-5 tracking-tight">{t.footer.companyHeading}</h5>
              <ul className="space-y-3.5 text-[14px] text-[#6b7280]">
                <li className="hover:text-[#004643] cursor-pointer transition-colors"><Link href="/about">{t.footer.companyLinks.aboutUs}</Link></li>
                {[t.footer.companyLinks.blog, t.footer.companyLinks.careers, t.footer.companyLinks.privacy].map((l) => (
                  <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors">{l}</li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-5 tracking-tight">{t.footer.resourcesHeading}</h5>
              <ul className="space-y-3.5 text-[14px] text-[#6b7280]">
                {[
                  t.footer.resourcesLinks.documentation,
                  t.footer.resourcesLinks.community,
                  t.footer.resourcesLinks.support,
                  t.footer.resourcesLinks.blog,
                ].map((l) => (
                  <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors">{l}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-[#f0f0f0] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[#9ca3af] text-[12px]">{t.footer.legal}</p>
            <div className="flex items-center gap-6">
              {/* Language toggle — switches the whole site between English and
                  Arabic. Shares state with the same toggle in the dashboard's
                  profile dropdown (lib/store.ts useLanguageStore). */}
              <LanguageToggle />
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#f5f5f5] border border-neutral-100 flex items-center justify-center hover:bg-[#004643] group transition-all cursor-pointer">
                  <Image width={100} height={100} src="/assets/group.svg" alt="Social" className="w-3.5 h-3.5 group-hover:brightness-[10] transition-all" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}

// ─── Footer language toggle ────────────────────────────────────────────────
// Replaces the old static "English" label + dropdown chevron with a real,
// working toggle between English and Arabic.
function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  const t = useHomeTranslations();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 text-[#9ca3af] text-[12px] font-medium cursor-pointer hover:text-neutral-700 transition-colors"
    >
      <Image width={100} height={100} src="/assets/language-circle.svg" alt="" className="w-[14px] h-[14px]" />
      <span>{t.footer.language}</span>
      <span className="text-[10px] opacity-60">({language === "en" ? "AR" : "EN"})</span>
    </button>
  );
}