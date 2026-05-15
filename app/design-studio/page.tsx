"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

export default function DesignStudioPage() {
  return (
    <div className="relative min-h-screen bg-white font-schibsted overflow-x-hidden">

      <Navbar />

      {/* HERO */}
      <section className="relative pt-[152px] pb-[60px] flex flex-col items-center z-10 px-4 bg-[#eef2f7] overflow-hidden">
        <div className="flex flex-col gap-[32px] items-center max-w-[1240px] w-full">

          {/* Badge */}
          <div className="bg-white/30 border border-[#548381]/20 rounded-full px-[14px] py-[7px] flex items-center gap-[8px]">
            <Image width={14} height={14} src="/assets/stars.svg" alt="" />
            <p className="text-[13px] font-medium text-[#555f6d]">
              New Feature · Intelligent 3D Rendering Engine
            </p>
          </div>

          {/* Title */}
          <div className="flex flex-col items-center gap-0 text-center">
            <h1 className="font-schibsted font-semibold text-[48px] sm:text-[58px] lg:text-[64px] leading-[1.15] text-[#111d27] tracking-[-2px]">
              Your Professional
            </h1>
            <span className="font-instrument italic font-normal text-[48px] sm:text-[58px] lg:text-[64px] leading-[1.15] text-[#111d27] tracking-[-1.5px] -mt-1">
              Interior Design Studio
            </span>
            <p className="font-schibsted font-normal text-[17px] sm:text-[19px] leading-[1.6] text-[#393945]/70 text-center max-w-[560px] mt-6">
              From rough sketch to photorealistic render in minutes. Nooi Studio combines precise 2D planning with immersive 3D visualization.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/authpage/signup"
              className="bg-[#004643] text-white px-[28px] py-[14px] rounded-full flex items-center gap-[10px] hover:bg-[#003330] transition-all shadow-lg"
            >
              <span className="text-[16px] font-medium">Open Studio</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L8 3M13 8L8 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <button className="flex items-center gap-[10px] bg-white border border-[#e2eaf0] px-[24px] py-[14px] rounded-full text-[#003230] text-[15px] font-medium hover:bg-gray-50 transition-all shadow-sm">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="#003230" strokeWidth="1.5"/>
                <path d="M8 7L13 10L8 13V7Z" fill="#003230"/>
              </svg>
              Watch Workflow
            </button>
          </div>

          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-[1000px] rounded-[24px] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.15)] border border-[#e2eaf0] mt-4"
          >
            <Image
              width={1000} height={600}
              src="/assets/design-studio-hero.png"
              alt="Design Studio"
              className="w-full h-auto object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* FROM CONCEPT TO REALITY */}
      <section className="py-[96px] px-4 bg-white">
        <div className="max-w-[1240px] mx-auto">

          {/* Header */}
          <div className="text-center mb-[80px]">
            <p className="text-[13px] font-medium text-[#004643] tracking-widest uppercase mb-3">
              Premium Workflow
            </p>
            <h2 className="text-[42px] sm:text-[52px] font-bold text-[#111d27] leading-[1.2] mb-4 font-schibsted tracking-[-1.5px]">
              From Concept to Reality
            </h2>
            <p className="text-[18px] text-[#555f6d] max-w-[580px] mx-auto leading-[1.65]">
              Our unified platform handles every stage of the design process, ensuring your vision is preserved from the first line to the final render.
            </p>
          </div>

          {/* Phase 01 */}
          <div className="flex flex-col lg:flex-row items-center gap-[60px] lg:gap-[80px] mb-[100px]">

            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1 w-full max-w-[540px]"
            >
              <div className="relative rounded-[32px] overflow-hidden aspect-[4/3] shadow-[0_24px_60px_rgba(0,0,0,0.10)]">
                <Image
                  fill
                  sizes="(max-width: 1024px) 100vw, 540px"
                  src="/assets/design-studio-2d.png"
                  alt="2D Planning"
                  className="object-cover"
                />
                {/* Badge — bottom left, overlapping outside */}
                <div className="absolute bottom-[-20px] left-6 bg-white rounded-[14px] px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.10)] flex items-center gap-3 z-10">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 15L15 3M15 3H7M15 3V11" stroke="#004643" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-[#111d27]">Auto-Dimension</span>
                    <span className="text-[11px] text-[#9ca3af]">Precise to 1mm</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1 max-w-[480px] pt-6"
            >
              <div className="inline-flex items-center bg-[#f3f4f6] border border-[#e5e7eb] rounded-full px-[14px] py-[6px] mb-5">
                <span className="text-[13px] font-medium text-[#6b7280]">Phase 01</span>
              </div>
              <h3 className="text-[36px] font-semibold text-[#111d27] leading-[1.2] mb-4 font-schibsted tracking-[-1px]">
                Precision 2D Planning
              </h3>
              <p className="text-[16px] text-[#4b5863] leading-[1.65] mb-8">
                Start with an intelligent 2D canvas. Import existing blueprints or sketch freely. Our smart wall detection automatically closes loops and suggests room types.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  "Import PDF/CAD files instantly",
                  "Smart snapping & auto-alignment",
                  "Real-time area calculation",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[15px] text-[#4b5863]">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
                      <circle cx="10" cy="10" r="9" stroke="#004643" strokeWidth="1.5"/>
                      <path d="M6 10L8.5 12.5L14 7" stroke="#004643" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <button className="bg-[#004643] text-white pl-[24px] pr-[8px] py-[8px] rounded-full flex items-center gap-[16px] hover:bg-[#003330] transition-colors font-medium text-[15px]">
                Explore 2D Tools
                <div className="bg-white/20 p-[10px] rounded-full flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7H12M12 7L7 2M12 7L7 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>
            </motion.div>
          </div>

          {/* Phase 02 */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-[60px] lg:gap-[80px]">

            {/* Image — floating badge outside top-right */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1 w-full max-w-[540px] relative"
            >
              <div className="absolute -top-5 right-6 z-10 bg-white rounded-[14px] px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.10)] flex items-center gap-3">
                <div className="w-9 h-9 bg-[#e8f5ee] rounded-[10px] flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 2v2M9 14v2M2 9H4M14 9h2M4.22 4.22l1.42 1.42M12.36 12.36l1.42 1.42M4.22 13.78l1.42-1.42M12.36 5.64l1.42-1.42" stroke="#004643" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="9" cy="9" r="3" stroke="#004643" strokeWidth="1.5"/>
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-[#111d27]">AI Lighting</span>
                  <span className="text-[11px] text-[#9ca3af]">Auto-generated ambiance</span>
                </div>
              </div>
              <div className="relative rounded-[32px] overflow-hidden aspect-[4/3] shadow-[0_24px_60px_rgba(0,0,0,0.10)]">
                <Image
                  fill
                  sizes="(max-width: 1024px) 100vw, 540px"
                  src="/assets/design-studio-3d.png"
                  alt="3D Visualization"
                  className="object-cover"
                />
              </div>
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1 max-w-[480px]"
            >
              <div className="inline-flex items-center bg-[#f3f4f6] border border-[#e5e7eb] rounded-full px-[14px] py-[6px] mb-5">
                <span className="text-[13px] font-medium text-[#6b7280]">Phase 02</span>
              </div>
              <h3 className="text-[36px] font-semibold text-[#111d27] leading-[1.2] mb-4 font-schibsted tracking-[-1px]">
                Immersive 3D Visualization
              </h3>
              <p className="text-[16px] text-[#4b5863] leading-[1.65] mb-8">
                Switch to 3D with a single click. Walk through your design in real-time. Apply textures, change lighting, and see how sunlight interacts with your space throughout the day.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  "One-click 2D to 3D conversion",
                  "4K Photorealistic Rendering",
                  "VR Headset Compatible",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[15px] text-[#4b5863]">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
                      <circle cx="10" cy="10" r="9" stroke="#004643" strokeWidth="1.5"/>
                      <path d="M6 10L8.5 12.5L14 7" stroke="#004643" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <button className="bg-[#004643] text-white pl-[24px] pr-[8px] py-[8px] rounded-full flex items-center gap-[16px] hover:bg-[#003330] transition-colors font-medium text-[15px]">
                Explore 3D Engine
                <div className="bg-white/20 p-[10px] rounded-full flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7H12M12 7L7 2M12 7L7 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* AI ASSISTANT */}
      <section className="py-[96px] px-4 bg-[#f8fafc]">
        <div className="max-w-[1240px] mx-auto">
          <div
            className="rounded-[32px] p-[40px] sm:p-[56px] flex flex-col lg:flex-row gap-[56px] overflow-hidden relative"
            style={{ background: "linear-gradient(135deg, #0d4a3f 0%, #0a2e28 50%, #061e1a 100%)" }}
          >
            {/* Left */}
            <div className="flex-1 max-w-[500px]">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-[14px] py-[7px] mb-6">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="white" strokeWidth="1.2" strokeOpacity="0.6"/>
                  <path d="M4.5 7C4.5 5.62 5.62 4.5 7 4.5s2.5 1.12 2.5 2.5S8.38 9.5 7 9.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.8"/>
                  <circle cx="7" cy="7" r="1" fill="white" fillOpacity="0.8"/>
                </svg>
                <span className="text-[13px] text-white/80 font-medium">Nooi AI Assistant</span>
              </div>
              <h3 className="text-[36px] sm:text-[42px] font-bold text-white leading-[1.2] mb-4 font-schibsted">
                Stuck on layout?<br />
                <span className="font-instrument italic font-normal text-[#c8e6a0]">Ask the AI.</span>
              </h3>
              <p className="text-[15px] text-white/60 leading-[1.7] mb-8 max-w-[440px]">
                &quot;Suggest a modern Scandinavian living room layout for this space.&quot; Our AI understands design principles and can populate empty rooms with curated furniture sets in seconds.
              </p>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-[10px] flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="white" strokeWidth="1.3" strokeOpacity="0.7"/>
                      <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="white" strokeWidth="1.3" strokeOpacity="0.7"/>
                      <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="white" strokeWidth="1.3" strokeOpacity="0.7"/>
                      <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="white" strokeWidth="1.3" strokeOpacity="0.7"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-[15px] mb-1">Style Transfer</p>
                    <p className="text-white/50 text-[13px] leading-[1.5]">Upload an inspiration photo and let AI apply the style to your room.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-[10px] flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M3 9h12M9 3v12" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.7"/>
                      <rect x="2" y="2" width="14" height="14" rx="3" stroke="white" strokeWidth="1.3" strokeOpacity="0.5"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-[15px] mb-1">Optimized Layouts</p>
                    <p className="text-white/50 text-[13px] leading-[1.5]">AI suggests furniture arrangements based on flow and usage.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — AI Suggestion Card */}
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-[480px] bg-white/8 backdrop-blur-sm border border-white/10 rounded-[24px] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-[#7b9ab2] rounded-full flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2L9.5 6.5H14L10.5 9L12 13.5L8 11L4 13.5L5.5 9L2 6.5H6.5L8 2Z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" fill="white" fillOpacity="0.3"/>
                    </svg>
                  </div>
                  <span className="text-white font-semibold text-[15px]">Nooi AI Suggestion</span>
                </div>
                <div className="bg-white/10 rounded-[14px] px-4 py-3 mb-4">
                  <p className="text-white/80 text-[13px] leading-[1.6]">
                    Based on your room dimensions (24m²), here are 3 optimal layouts for a home office + guest room hybrid.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: "Layout A: Corner Desk", img: "/assets/layout a.png", selected: true },
                    { label: "Layout B: Center Focus", img: "/assets/layout b.png", selected: false },
                  ].map((layout, i) => (
                    <div key={i} className={`rounded-[12px] overflow-hidden border ${layout.selected ? "border-[#c8e6a0]/60" : "border-white/10"}`}>
                      <div className="aspect-[4/3] relative bg-white/10">
                        <Image fill src={layout.img} alt={layout.label} className="object-cover" />
                      </div>
                      <div className="px-2 py-2 bg-white/5">
                        <p className="text-[11px] text-white/60 text-center">{layout.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full py-3 bg-[#B3C99C] text-[#1a3d20] rounded-[12px] text-[14px] font-bold hover:bg-[#c4d8ad] transition-colors">
                  Apply Layout A
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FURNITURE + EXPORT */}
      <section className="py-[96px] px-4 bg-white">
        <div className="max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6 items-stretch">

          {/* Furniture Library — full bleed background image, text overlay */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-[28px] overflow-hidden min-h-[300px]"
          >
            {/* Background image — contain so full scene always visible */}
            <Image
              fill
              sizes="(max-width: 1024px) 100vw, 70vw"
              src="/assets/furniture collection.png"
              alt="Furniture"
              className="object-contain object-right-bottom scale-110"
              style={{ backgroundColor: "#f0f3ee" }}
            />
            {/* Soft left fade for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#f0f3ee]/95 via-[#f0f3ee]/60 to-transparent" />

            {/* Text — on top of image */}
            <div className="relative z-10 flex flex-col justify-center h-full p-10 max-w-[480px]">
              <h3 className="text-[28px] font-bold text-[#004643] mb-3 font-schibsted tracking-[-0.3px]">
                Unlimited Furniture Library
              </h3>
              <p className="text-[15px] text-[#4b5863] leading-[1.65] mb-8">
                Access over 50,000+ real-world furniture items, textures, and materials. Drag, drop, and customize.
              </p>
              <button className="bg-[#004643] text-white pl-[20px] pr-[6px] py-[6px] rounded-full flex items-center gap-[12px] hover:bg-[#003330] transition-colors font-medium text-[15px] w-fit">
                Browse Catalog
                <div className="bg-white w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7H12M12 7L7 2M12 7L7 12" stroke="#004643" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>
            </div>
          </motion.div>

          {/* Export to Reality — 30% */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-[#0a2e28] rounded-[28px] p-8 flex flex-col min-h-[300px]"
          >
            {/* Icon — circular arrows */}
            <div className="w-10 h-10 bg-[#1e4d38] rounded-[10px] flex items-center justify-center mb-6 self-start">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10a6 6 0 0 1 6-6 6 6 0 0 1 4.24 1.76L16 7.5" stroke="#c8e6a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 10a6 6 0 0 1-6 6 6 6 0 0 1-4.24-1.76L4 12.5" stroke="#c8e6a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.5 7.5H16V5" stroke="#c8e6a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.5 12.5H4V15" stroke="#c8e6a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <h3 className="text-[24px] font-bold text-white mb-3 font-schibsted tracking-[-0.5px]">
              Export to Reality
            </h3>
            <p className="text-[13px] text-white/55 leading-[1.65] mb-auto">
              Generate shopping lists, cut sheets, and contractor blueprints automatically.
            </p>

            <button className="mt-8 w-full py-3.5 bg-[#1a3d2e] hover:bg-[#224d3a] border border-white/10 text-white/75 rounded-full transition-colors font-medium text-[14px]">
              View Sample Output
            </button>
          </motion.div>

        </div>
      </section>

      {/* CTA */}
      <section className="relative py-[100px] px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image fill src="/assets/imgImage13.png" alt="" className="object-cover" />
          <div className="absolute inset-0 bg-[#111D27]/70" />
        </div>
        <div className="relative z-10 max-w-[760px] mx-auto text-center">
          <h2 className="text-[48px] sm:text-[64px] font-bold text-white leading-[1.05] mb-6 tracking-tight font-schibsted">
            Ready to design
            <br />your dream space?
          </h2>
          <p className="text-[16px] sm:text-[18px] text-white/60 max-w-[480px] mx-auto mb-10 leading-[1.65]">
            Join thousands of architects, Interior designers, and homeowners using Nooi Studio today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/authpage/signup"
              className="w-full sm:w-auto bg-[#8bec5c] text-[#142d26] px-9 py-3.5 rounded-full text-[15px] font-bold hover:bg-[#a3f37e] transition-colors"
            >
              Start Free Trial →
            </Link>
            <button className="w-full sm:w-auto bg-white/10 backdrop-blur-md border border-white/20 text-white px-9 py-3.5 rounded-full text-[15px] font-bold hover:bg-white/20 transition-colors">
              Book a Demo
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
              <p className="text-[#6b7280] mb-6 text-[14px] leading-relaxed max-w-[300px]">
                Subscribe to the last weekly and enjoy these styles of Interior design from all our newsletter with worldwide delivery.
              </p>
              <div className="relative max-w-[340px] mb-6">
                <input type="email" placeholder="Enter your email" className="w-full h-[48px] bg-[#f5f7f8] border border-[#e8eaec] rounded-full px-5 outline-none text-[13px] pr-[110px] placeholder:text-[#9ca3af]" />
                <button className="absolute right-1.5 top-1.5 h-[36px] bg-[#004643] text-white px-5 rounded-full text-[12px] font-bold hover:bg-[#003330] transition-colors">Subscribe</button>
              </div>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2 text-[#374151] hover:text-[#004643] cursor-pointer transition-colors group">
                  <Image width={18} height={18} src="/assets/windows.svg" alt="Windows" className="w-[18px] h-[18px] opacity-40 group-hover:opacity-80 transition-opacity" />
                  <span className="text-[12px] font-medium">Get Nooi Windows App</span>
                </div>
                <div className="flex items-center gap-2 text-[#374151] hover:text-[#004643] cursor-pointer transition-colors group">
                  <Image width={18} height={18} src="/assets/apple.svg" alt="Mac" className="w-[18px] h-[18px] opacity-40 group-hover:opacity-80 transition-opacity" />
                  <span className="text-[12px] font-medium">Next Mac App</span>
                </div>
              </div>
            </div>
            {[
              { title: "Product", links: ["Floor Planner", "Interior Design", "Kitchen & Closet Design", "3D Viewer", "Custom Furniture"] },
              { title: "Company", links: ["About us", "Contact us", "Affiliate program", "Careers"] },
              { title: "Resources", links: ["Home Design Ideas", "Tutorial", "Help center", "Nooi app"] },
            ].map((col) => (
              <div key={col.title}>
                <h5 className="text-[14px] font-bold text-[#111D27] mb-5">{col.title}</h5>
                <ul className="space-y-3.5 text-[14px] text-[#6b7280]">
                  {col.links.map((l) => <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors">{l}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-[#f0f0f0] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[#9ca3af] text-[12px]">© 2026 Nooi, Inc. All rights reserved.</p>
            <div className="flex items-center gap-4">
              {[
                { label: "Instagram", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" },
                { label: "LinkedIn", path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
                { label: "Facebook", path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
                { label: "Twitter", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.631L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" },
                { label: "YouTube", path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
              ].map((icon) => (
                <button key={icon.label} aria-label={icon.label} className="w-8 h-8 rounded-full border border-[#e5e7eb] flex items-center justify-center hover:border-[#004643] hover:text-[#004643] text-[#9ca3af] transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d={icon.path} />
                  </svg>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-6">
              <span className="text-[#9ca3af] text-[12px] cursor-pointer hover:text-[#004643] transition-colors">Terms & Conditions</span>
              <span className="text-[#9ca3af] text-[12px] cursor-pointer hover:text-[#004643] transition-colors">Privacy Policy</span>
              <div className="flex items-center gap-1.5 text-[#9ca3af] text-[12px] cursor-pointer hover:text-[#004643] transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                English
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}