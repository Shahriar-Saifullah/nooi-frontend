"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const PremiumFeatureContainer = ({ img1, img2 }: { img1: string, img2: string }) => {
  return (
    <div className="relative w-full aspect-[640/560] bg-[#f0f4f8]/30 rounded-[32px] overflow-visible border border-[#e2eaf0] shadow-inner group p-4 sm:p-10">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none rounded-[32px]" style={{ backgroundImage: 'linear-gradient(#004643 1px, transparent 1px), linear-gradient(90deg, #004643 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      
      {/* Top Window Card */}
      <motion.div 
        initial={{ x: -60, y: -20, opacity: 0 }}
        whileInView={{ x: 0, y: 0, opacity: 1 }}
        viewport={{ once: true }}
        className="absolute top-[8%] left-[5%] w-[68%] h-[55%] z-10"
      >
        <div className="relative w-full h-full bg-white rounded-[24px] shadow-[0_30px_60px_rgba(0,0,0,0.08)] border border-white/60 p-4 md:p-6 flex items-center">
          <div className="relative w-full h-full flex items-center justify-between gap-4">
            {/* Main Window Image */}
            <div className="relative w-[75%] h-full flex items-center">
              <img src={img1} className="w-full h-auto drop-shadow-xl" alt="Window 1" />
            </div>
            {/* Floating Style Card for Window 1 */}
            <div className="w-[25%] flex items-center">
              <img src="/assets/Furniture 4 3.jpg" className="w-full h-auto rounded-[12px] shadow-lg border border-[#e2eaf0]" alt="Style" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom Window Card */}
      <motion.div 
        initial={{ x: 60, y: 60, opacity: 0 }}
        whileInView={{ x: 0, y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="absolute bottom-[8%] right-[5%] w-[68%] h-[55%] z-0"
      >
        <div className="relative w-full h-full bg-white rounded-[24px] shadow-[0_30px_60px_rgba(0,0,0,0.08)] border border-white/60 p-4 md:p-6 flex items-center">
          <div className="relative w-full h-full flex items-center justify-between gap-4">
            {/* Main Window Image (baked-in Style picker) */}
            <div className="relative w-[75%] h-full flex items-center">
              <img src={img2} className="w-full h-auto drop-shadow-xl" alt="Window 2" />
            </div>
            {/* Secondary Style Card for Window 2 */}
            <div className="w-[25%] flex items-center">
              <img src="/assets/Furniture 4 3.jpg" className="w-full h-auto rounded-[12px] shadow-lg border border-[#e2eaf0]" alt="Style" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};




export default function LandingPage() {
  const [prompt, setPrompt] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [activeFilter, setActiveFilter] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const steps = [
    {
      title: "Start with your space",
      description: "Bring in your own floor plan or sketch it quickly online no complex tools, just a clean starting point.",
      img: "/assets/video-pic-1.png",
      miniTitle: "Upload or Sketch",
      miniDesc: "Turn rough ideas into editable 2D/3D layouts instantly. Our AI cleans up drawings and prepares them for design."
    },
    {
      title: "AI Layout Generation",
      description: "Let our AI analyze your space and suggest optimal furniture layouts and interior styles.",
      img: "/assets/video-pic-2.png",
      miniTitle: "Smart Suggestions",
      miniDesc: "Instantly see multiple design options tailored to your specific room dimensions and needs."
    },
    {
      title: "Realistic 3D Walkthrough",
      description: "Visualize your future home in high-fidelity 3D. Walk through every room and experience the design.",
      img: "/assets/imgImage10.png",
      miniTitle: "Immersive View",
      miniDesc: "High-quality rendering that brings your vision to life with realistic lighting and textures."
    },
    {
      title: "Furniture & Delivery",
      description: "Ready to move in? Order the furniture from your design directly through our integrated partners.",
      img: "/assets/furniture-2-2.png",
      miniTitle: "Seamless Logistics",
      miniDesc: "From screen to doorstep. We handle the ordering and logistics for your selected furniture pieces."
    }
  ];

  return (
    <div className="relative min-h-screen bg-white font-schibsted overflow-x-hidden">

      {/* NAVBAR */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[1240px] h-[72px] z-50">
        <div className="w-full h-full backdrop-blur-[100px] bg-[#f7fbfc]/90 border border-[#e2eaf0] rounded-[22px] flex items-center justify-between pl-[12px] md:pl-[24px] pr-[12px] py-[12px] shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
          {/* Menu */}
          <div className="flex items-center gap-2 md:w-[200px]">
            <button
              className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg hover:bg-black/5"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <div className={`w-6 h-0.5 bg-[#111d27] transition-all ${isMenuOpen ? "rotate-45 translate-y-2" : ""}`} />
              <div className={`w-6 h-0.5 bg-[#111d27] transition-all ${isMenuOpen ? "opacity-0" : ""}`} />
              <div className={`w-6 h-0.5 bg-[#111d27] transition-all ${isMenuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </button>
            <Link href="/" className="flex items-center gap-[9px]">
              <img src="/assets/logo.png" alt="NOOI" className="w-[32px] md:w-[40px] h-auto object-contain" />
              <span className="font-inter font-bold text-[18px] md:text-[20px] text-[#111d27] tracking-tight">NOOI</span>
            </Link>
          </div>

          {/* Nav */}
          <div className="hidden md:flex items-center gap-[11px] flex-1 justify-center">
            <button className="flex items-center gap-[3px] px-[10px] py-[4px] opacity-80 hover:opacity-100 transition-opacity">
              <span className="font-schibsted font-normal text-[#003230] text-[14px]">Products</span>
              <img src="/assets/arrow-down.svg" alt="" className="w-[20px] h-[20px] opacity-60" />
            </button>
            <button className="flex items-center gap-[3px] px-[10px] py-[4px] opacity-80 hover:opacity-100 transition-opacity">
              <span className="font-schibsted font-normal text-[#003230] text-[14px]">Resources</span>
              <img src="/assets/arrow-down.svg" alt="" className="w-[20px] h-[20px] opacity-60" />
            </button>
            <button className="px-[10px] py-[4px] opacity-80 hover:opacity-100 transition-opacity">
              <span className="font-schibsted font-normal text-[#003230] text-[14px]">Pricing</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-[4px] md:gap-[8px] justify-end md:w-[200px]">
            <button className="hidden sm:flex w-[40px] h-[40px] md:w-[46px] md:h-[46px] items-center justify-center hover:bg-black/5 rounded-full transition-colors shrink-0">
              <img src="/assets/container-svg.svg" alt="Help" className="w-full h-full" />
            </button>
            <div className="flex items-center gap-[2px] md:gap-[4px] h-[40px] md:h-[46px] bg-white border border-[#e6e6e8] p-[2px] md:p-[4px] rounded-[10px] md:rounded-[12px] flex-nowrap shrink-0">
              <Link
                href="/authpage/signin"
                className="h-full px-3 md:px-[16px] flex items-center justify-center bg-[#f8f8f8] rounded-[6px] md:rounded-[8px] text-[#272e35] text-[13px] md:text-[16px] font-schibsted font-medium hover:bg-neutral-100 transition-colors whitespace-nowrap"
              >
                Log in
              </Link>
              <Link
                href="/authpage/signup"
                className="h-full px-3 md:px-[16px] flex items-center justify-center bg-[#004643] rounded-[7px] md:rounded-[9px] text-white text-[13px] md:text-[16px] font-schibsted font-medium hover:bg-[#003330] transition-colors shadow-sm whitespace-nowrap"
              >
                Start for free
              </Link>
            </div>
          </div>
        </div>

        {/* Menu */}
        {isMenuOpen && (
          <div className="absolute top-[80px] left-0 w-full bg-[#f7fbfc] border border-[#e2eaf0] rounded-[22px] p-6 shadow-2xl flex flex-col gap-4 md:hidden z-[60] backdrop-blur-xl">
            <button className="flex items-center justify-between p-2 hover:bg-black/5 rounded-lg">
              <span className="font-schibsted text-[16px] text-[#003230]">Products</span>
              <img src="/assets/arrow-down.svg" alt="" className="w-6 h-6 -rotate-90 opacity-40" />
            </button>
            <button className="flex items-center justify-between p-2 hover:bg-black/5 rounded-lg">
              <span className="font-schibsted text-[16px] text-[#003230]">Resources</span>
              <img src="/assets/arrow-down.svg" alt="" className="w-6 h-6 -rotate-90 opacity-40" />
            </button>
            <button className="p-2 text-left hover:bg-black/5 rounded-lg font-schibsted text-[16px] text-[#003230]">
              Pricing
            </button>
          </div>
        )}
      </nav>

      {/* HERO */}
      {/*
        FIX 1: bg changed from #e8edf5 Ã¢â€ â€™ #eef2f7 (lighter, matches Figma)
        FIX 2: title font-size 72px Ã¢â€ â€™ 64px to match Figma proportions
        FIX 3: prompt box shadow softened to match Figma
        FIX 4: badge bg more transparent, border matches Figma
        FIX 5: min-h adjusted to match Figma section height better
      */}
      <section className="relative pt-[152px] pb-[60px] flex flex-col items-center z-10 px-4 min-h-[860px] overflow-hidden bg-[#eef2f7]">
        {/* Background Grid */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1408px] h-[717px] pointer-events-none -z-10 opacity-50">
          <img src="/assets/bg-grid.svg" alt="" className="w-full h-full object-cover" />
        </div>

        <div className="flex flex-col gap-[44px] items-center max-w-[1240px] w-full">
          {/* Ã¢â‚¬â€ */}
          <div className="bg-white/30 border border-[#548381]/20 rounded-full px-[14px] py-[7px] flex items-center gap-[8px] cursor-default backdrop-blur-sm">
            <img src="/assets/stars.svg" alt="" className="w-[14px] h-[14px]" />
            <p className="text-[13px] font-medium tracking-tight flex gap-1">
              <span className="text-[#b0b0b5] font-schibsted font-medium">New:</span>
              <span className="text-[#555f6d] font-schibsted font-medium">Drag & drop workflow builder</span>
            </p>
          </div>

          {/* Title */}
          <div className="flex flex-col items-center gap-0">
            {/* 2: */}
            <h1 className="text-center max-w-[960px] flex flex-col items-center">
              <span className="block font-schibsted font-semibold text-[48px] sm:text-[58px] lg:text-[64px] leading-[1.15] text-[#111d27] tracking-[-2px]">
                Design, Plan, Furniture get
              </span>
              <span className="block font-instrument italic font-normal text-[48px] sm:text-[58px] lg:text-[64px] leading-[1.15] text-[#111d27] tracking-[-1.5px] -mt-1">
                All in One Platform.
              </span>
            </h1>

            {/* subtitle */}
            <p className="font-schibsted font-normal text-[17px] sm:text-[19px] leading-[1.6] text-[#393945]/70 text-center max-w-[580px] mt-7">
              NOOI makes stunning 2D/3D visuals, accurate floor plans, and seamless logistics simple for architects, designers, and developers.
            </p>
          </div>

          {/* Ã¢â‚¬â€ */}
          <div className="bg-white border border-[#d8d9da] rounded-[18px] shadow-[0px_20px_60px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.04)] w-full max-w-[900px] min-h-[172px] pt-[20px] pb-[14px] px-[20px] flex flex-col justify-between">
            <div className="w-full">
              <textarea
                placeholder="Describing your design ideas and see what magic happens"
                className="w-full bg-transparent outline-none resize-none font-schibsted font-normal text-[18px] leading-[1.5] text-[#111d27] placeholder:text-[#a0a0a8] h-[68px]"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            {/* Bottom Bar */}
            <div className="flex items-center justify-between w-full mt-2">
              {/* Attach */}
              <button className="w-[44px] h-[44px] bg-[#f7f8f8] border border-[#d8d9da] rounded-[12px] flex items-center justify-center hover:bg-[#eef0f1] transition-colors">
                <img src="/assets/vector-1.svg" alt="Attach" className="w-[18px] h-[18px] opacity-60" />
              </button>

              <div className="flex items-center gap-[10px]">
                {/* Voice */}
                <button className="w-[32px] h-[32px] flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
                  <img src="/Logo/icon.svg" alt="Voice" className="w-[24px] h-[24px]" />
                </button>

                {/* Now */}
                <button className="bg-[#004643] rounded-[10px] py-[10px] px-7 flex items-center gap-[7px] hover:bg-[#003330] transition-colors shadow-md group">
                  <span className="font-schibsted font-semibold text-white text-[14px] leading-none whitespace-nowrap">
                    Build Now
                  </span>
                  <img src="/assets/icon.svg" alt="" className="w-[16px] h-[16px] brightness-[10] group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT */}
      <section className="py-[50px] lg:py-[60px] px-4 bg-white flex flex-col items-center">
        {/* Header */}
        <div className="max-w-[752px] text-center mb-[60px]">
          <h2 className="text-[48px] font-semibold text-[#272e35] leading-[1.2] mb-[16px] font-schibsted">
            Our Product Features
          </h2>
          <p className="text-[20px] text-[#555f6d] leading-[1.5] font-schibsted">
            From sketch to furniture  delivery, Nooi’s AI tools help you design, visualize, and build dream spaces—effortlessly turning ideas into reality with simplicity.
          </p>
        </div>

        {/* card */}
        <div className="w-full max-w-[1240px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px] mb-[60px]">
          {[
            { name: "Room Planner",      img: "/assets/video-pic-1.png" },
            { name: "AI Home Planner",   img: "/assets/video-pic-2.png" },
            { name: "Kitchen Planner",   img: "/assets/video-pic-1.png" },
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              className="bg-[#f1f5f9] border border-[#e6f0f2] rounded-[16px] p-[24px] flex flex-col transition-all hover:shadow-lg group"
            >
              {/* Image Container */}
              <div className="bg-white border border-[#e6f0f2] rounded-[8.2px] p-[12px] mb-[24px] aspect-[350/255] flex items-center justify-center overflow-hidden">
                <img
                  src={feature.img}
                  alt={feature.name}
                  className="w-full h-auto object-contain"
                />
              </div>
              {/* + */}
              <div className="flex items-center justify-between">
                <h3 className="text-[28px] font-bold text-[#272e35] leading-[1.2] font-scada">
                  {feature.name}
                </h3>
                <button className="w-[46px] h-[46px] bg-[#142d25] rounded-[8px] flex items-center justify-center hover:bg-[#003330] transition-colors shadow-sm shrink-0">
                  <img src="/assets/arrow-outward.svg" alt="Go" className="w-[24px] h-[24px] brightness-[10]" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* All */}
        <button className="bg-[#004643] text-white pl-[24px] pr-[4px] py-[4px] rounded-[16px] flex items-center gap-[16px] hover:bg-[#003330] transition-all shadow-[0px_19px_19px_rgba(0,0,0,0.09)] group">
          <span className="text-[20px] font-schibsted font-normal">View All Design</span>
          <div className="bg-white p-[12px] rounded-[12px] flex items-center justify-center">
            <img src="/assets/arrow-right-02-sharp.svg" alt="" className="w-[24px] h-[24px] -rotate-0" />
          </div>
        </button>
      </section>

      {/* KEY */}
      {/*
        FIX: Each feature row now has a full-width bg panel (#f7fbfc) with border and rounded corners
        FIX: Row layout tightened to match Figma's compact alternating rows
        FIX: Divider styling between sections matches Figma
        FIX: Badge pill uses correct teal border color matching Figma
        FIX: "View All Design" button uses rounded-[10px] not rounded-full
      */}
      <section className="py-[50px] lg:py-[60px] px-4 bg-white">
        <div className="max-w-[1240px] mx-auto">

          {/* header */}
          <div className="max-w-[762px] mx-auto text-center mb-[80px]">
            <h2 className="text-[48px] font-semibold text-[#111d27] leading-[1.2] mb-[16px] font-schibsted">
              Key Features
            </h2>
            <p className="text-[20px] text-[#374551] leading-[1.5] font-schibsted">
              Drag and drop furniture, dÃƒÂ©cor, and finishes. Instantly adjust lighting, colors, and textures with a real-time interface that makes interior design feel truly effortless.
            </p>
          </div>

          {/* 1 */}
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-[113px] mb-[50px] lg:mb-[60px]">
            <div className="flex-1 max-w-[519px]">
              {/* Badge (3055:3792) */}
              <div className="bg-[#f8fafc] border border-[#e2eaf0] rounded-full px-4 py-1.5 w-fit mb-6">
                <p className="text-[14px] font-medium font-inter">
                  <span className="text-[#deb01d]">New: </span>
                  <span className="text-[#6b7780]">Drag & drop workflow builder</span>
                </p>
              </div>
              <h3 className="text-[36px] font-bold text-[#111d27] leading-[1.2] mb-6 font-schibsted">
                AI Floor and Home Planner
              </h3>
              <p className="text-[20px] text-[#4b5863] leading-[1.5] mb-10 font-schibsted">
                Upload an image, sketch from scratch, or let our AI do the heavy lifting. Instantly turn a rough idea into clean, editable floor plans in 2D or 3D. Spend less time drawing, more time designing.
              </p>
              {/* Button (3055:3797) */}
              <button className="bg-[#004643] text-white pl-[16px] pr-[4px] py-[4px] rounded-[16px] flex items-center gap-[16px] hover:bg-[#003330] transition-all shadow-[0px_19px_19px_rgba(0,0,0,0.09)] group">
                <span className="text-[20px] font-schibsted font-normal">View All Design</span>
                <div className="bg-white p-[12px] rounded-[12px] flex items-center justify-center">
                  <img src="/assets/arrow-right-02-sharp.svg" alt="" className="w-[24px] h-[24px] -rotate-0" />
                </div>
              </button>
            </div>
            {/* card */}
            <div className="flex-1 w-full max-w-[608px]">
              <PremiumFeatureContainer 
                img1="/assets/furniture-2-2.png" 
                img2="/assets/furniture-4-2.png" 
              />
            </div>
          </div>

          {/* 2 */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-10 lg:gap-[113px] mb-[50px] lg:mb-[60px]">
            <div className="flex-1 max-w-[519px]">
              <div className="bg-[#f8fafc] border border-[#e2eaf0] rounded-full px-4 py-1.5 w-fit mb-6">
                <p className="text-[14px] font-medium font-inter">
                  <span className="text-[#deb01d]">New: </span>
                  <span className="text-[#6b7780]">Drag & drop workflow builder</span>
                </p>
              </div>
              <h3 className="text-[36px] font-bold text-[#111d27] leading-[1.2] mb-6 font-schibsted">
                Real- Time Interior Design
              </h3>
              <p className="text-[20px] text-[#4b5863] leading-[1.5] mb-10 font-schibsted">
                Upload an image, sketch from scratch, or let our AI do the heavy lifting. Instantly turn a rough idea into clean, editable floor plans in 2D or 3D. Spend less time drawing, more time designing.
              </p>
              <button className="bg-[#004643] text-white pl-[16px] pr-[4px] py-[4px] rounded-[16px] flex items-center gap-[16px] hover:bg-[#003330] transition-all shadow-[0px_19px_19px_rgba(0,0,0,0.09)] group">
                <span className="text-[20px] font-schibsted font-normal">View All Design</span>
                <div className="bg-white p-[12px] rounded-[12px] flex items-center justify-center">
                  <img src="/assets/arrow-right-02-sharp.svg" alt="" className="w-[24px] h-[24px] -rotate-0" />
                </div>
              </button>
            </div>
            <div className="flex-1 w-full max-w-[608px]">
              <PremiumFeatureContainer 
                img1="/assets/furniture-2-2.png" 
                img2="/assets/imgImage10.png" 
              />
            </div>
          </div>

          {/* 3 */}
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-[113px]">
            <div className="flex-1 max-w-[519px]">
              <div className="bg-[#f8fafc] border border-[#e2eaf0] rounded-full px-4 py-1.5 w-fit mb-6">
                <p className="text-[14px] font-medium font-inter">
                  <span className="text-[#deb01d]">New: </span>
                  <span className="text-[#6b7780]">Drag & drop workflow builder</span>
                </p>
              </div>
              <h3 className="text-[36px] font-bold text-[#111d27] leading-[1.2] mb-6 font-schibsted">
                Order from Design
              </h3>
              <p className="text-[20px] text-[#4b5863] leading-[1.5] mb-10 font-schibsted">
                Upload an image, sketch from scratch, or let our AI do the heavy lifting. Instantly turn a rough idea into clean, editable floor plans in 2D or 3D. Spend less time drawing, more time designing.
              </p>
              <button className="bg-[#004643] text-white pl-[16px] pr-[4px] py-[4px] rounded-[16px] flex items-center gap-[16px] hover:bg-[#003330] transition-all shadow-[0px_19px_19px_rgba(0,0,0,0.09)] group">
                <span className="text-[20px] font-schibsted font-normal">View All Design</span>
                <div className="bg-white p-[12px] rounded-[12px] flex items-center justify-center">
                  <img src="/assets/arrow-right-02-sharp.svg" alt="" className="w-[24px] h-[24px] -rotate-0" />
                </div>
              </button>
            </div>
            <div className="flex-1 w-full max-w-[608px]">
              <PremiumFeatureContainer 
                img1="/assets/imgImage1.png" 
                img2="/assets/furniture-4-2.png" 
              />
            </div>
          </div>

        </div>
      </section>

      {/* HOW */} <section className="py-[50px] lg:py-[60px] px-4 bg-white flex flex-col items-center">
        {/* (Outer */}
        <div className="max-w-[700px] text-center mb-16">
          <h2 className="text-[52px] font-bold text-[#111d27] leading-[1.1] mb-5 tracking-tight font-schibsted">
            How it Works
          </h2>
          <p className="text-[20px] text-[#555f6d] leading-[1.5] font-schibsted">
            Automated floor plan generation with AI with Realistic 3D rendering & design visualization.
          </p>
        </div>

        {/* Card */}
        <div className="w-full max-w-[1240px] bg-[#142d26] rounded-[22px] p-[30px] lg:p-[107px_30px_30px_107px] flex flex-col lg:flex-row items-center gap-[60px] lg:gap-[151px]">
          {/* Column */}
          <div className="flex-1 max-w-[464px]">
            {/* nav */}
            <div className="flex items-center border-b border-[#859c80]/30 mb-[82px]">
              {["Step 1", "Step 2", "Step 3", "Step 4"].map((step, i) => (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className={`px-[20px] py-[10px] text-[20px] font-semibold leading-[1.5] transition-all relative whitespace-nowrap shrink-0 border-b-[4px] ${
                    activeStep === i ? "text-[#b3ed97] border-[#8bec5c]" : "text-[#859c80] border-transparent hover:text-white/60"
                  }`}
                >
                  {step}
                </button>
              ))}
            </div>

            {/* Content (1040:5326) */}
            <div className="flex flex-col gap-[15px]">
              <h3 className="text-[36px] font-medium text-white leading-[1.5] font-schibsted">
                {steps[activeStep].title}
              </h3>
              <p className="text-[20px] text-[#7e8c9a] leading-[1.5] font-schibsted mb-[30px]">
                {steps[activeStep].description}
              </p>
              {/* Button (1040:5434) */}
              <button className="bg-[#52644d] text-white pl-[16px] pr-[4px] py-[4px] rounded-[16px] flex items-center gap-[16px] hover:bg-[#455440] transition-all shadow-lg group w-fit">
                <span className="text-[20px] font-schibsted font-normal">View All Step</span>
                <div className="bg-white p-[12px] rounded-[12px] flex items-center justify-center">
                  <img src="/assets/arrow-down-01.svg" alt="" className="w-[24px] h-[24px] -rotate-90" />
                </div>
              </button>
            </div>
          </div>

          {/* Column */}
          <div className="flex-1 w-full max-w-[489px] bg-[#52644d] rounded-[15px] p-[30px] flex flex-col gap-[22px]">
            <h4 className="text-[28px] text-white leading-[32px] font-schibsted">
              {steps[activeStep].miniTitle}
            </h4>
            <div className="aspect-[4096/2730] bg-[#f5f5f5] rounded-[15px] overflow-hidden relative">
              <img
                src={steps[activeStep].img}
                alt={steps[activeStep].miniTitle}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <img src="/assets/vector-1.svg" alt="" className="w-[60px] h-[60px] brightness-[10] opacity-50" />
              </div>
            </div>
            <p className="text-[20px] text-white leading-[1.5] font-schibsted">
              {steps[activeStep].miniDesc}
            </p>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      {/*
        FIX: Active filter pill shadow made stronger (shadow-md + ring) to stand out
        FIX: Filter pill font-size 13px (Figma uses smaller pill labels)
        FIX: Grid gap tightened to gap-4 to match Figma tighter layout
        FIX: Image border-radius 16px (Figma shows slightly tighter radius)
      */}
      <section className="py-[50px] lg:py-[60px] px-4 bg-white">
        <div className="max-w-[1240px] mx-auto">

          {/* Header */}
          <div className="max-w-[680px] mx-auto text-center mb-12">
            <h2 className="text-[38px] sm:text-[48px] lg:text-[52px] font-bold text-[#111D27] leading-[1.1] mb-5 tracking-tight">
              Explore Our Gallery
            </h2>
            <p className="text-[16px] sm:text-[18px] text-[#6b7280] leading-[1.65]">
              Automated floor plan generation with AI with Realistic 3D rendering & design visualization. Automated floor plan generation with AI with Realistic.
            </p>
          </div>

          {/* pills */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-10">
            {["All", "Living Room", "Dining Room", "Bedroom", "Office", "Show more"].map((f, i) => (
              <button
                key={i}
                onClick={() => setActiveFilter(i)}
                className={`px-5 py-2 rounded-full text-[13px] font-semibold transition-all ${
                  activeFilter === i
                    ? "bg-[#004643] text-white shadow-md"
                    : "bg-[#f5f5f5] text-[#555] hover:bg-neutral-100"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { id: 1, name: "Modern Living" },
              { id: 2, name: "Minimalist Kitchen" },
              { id: 3, name: "Classic Dining" },
              { id: 4, name: "Cozy Bedroom" },
              { id: 5, name: "Office Setup" },
              { id: 6, name: "Luxury Lounge" },
            ].map((card) => (
              <motion.div
                key={card.id}
                whileHover={{ y: -4 }}
                className="relative aspect-[4/3] rounded-[16px] overflow-hidden group border border-neutral-100"
              >
                <img
                  src={`/assets/gallery-${card.id}.png`}
                  alt={card.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-4 left-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <p className="text-white text-[16px] font-bold">{card.name}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* WHY */}
      {/*
        FIX: Feature item icons now use #f0f6f5 teal-tinted bg (not plain white), matching Figma
        FIX: Each feature item has a border-b separator instead of hover card (matches Figma list style)
        FIX: Icon square size 48px with teal-tinted bg #edf4f3
        FIX: Right image card aspect ratio adjusted; floating card tightened
      */}
      <section className="py-[90px] lg:py-[110px] px-4 bg-[#f7fbfc]">
        <div className="max-w-[1240px] mx-auto flex flex-col lg:flex-row items-start gap-14 lg:gap-[72px]">

          {/* Left */}
          <div className="flex-1">
            <h2 className="text-[38px] sm:text-[48px] lg:text-[52px] font-bold text-[#111D27] leading-[1.1] mb-12 tracking-tight">
              Why Choose NOOI?
            </h2>
            {/* list */}
            <div className="flex flex-col">
              {[
                { title: "Expert-Level Tools, Beginner-Friendly Interface", desc: "Our algorithms ensure every design is both beautiful and spatially accurate.", icon: "/assets/verified-user.svg" },
                { title: "All-in-One Platform", desc: "Shop directly from your 3D models with real-time inventory and pricing.", icon: "/assets/webhook.svg" },
                { title: "Real-World Integration", desc: "Share designs with clients or teammates and edit in real-time.", icon: "/assets/verified-user.svg" },
                { title: "Accuracy & Speed", desc: "We handle everything from order placement to final delivery.", icon: "/assets/webhook.svg" },
              ].map((item, i, arr) => (
                <div
                  key={i}
                  className={`flex gap-4 py-5 ${i < arr.length - 1 ? "border-b border-[#e4ecee]" : ""}`}
                >
                  {/* Icon */}
                  <div className="w-[48px] h-[48px] bg-[#edf4f3] border border-[#d4e6e3] rounded-[12px] flex items-center justify-center shrink-0 mt-0.5">
                    <img src={item.icon} alt="" className="w-[20px] h-[20px]" style={{ filter: "invert(24%) sepia(80%) saturate(400%) hue-rotate(145deg)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[16px] sm:text-[17px] font-bold text-[#111D27] mb-1.5 leading-snug">{item.title}</h4>
                    <p className="text-[#6b7280] leading-relaxed text-[14px] sm:text-[15px]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ã¢â‚¬â€ */}
          <div className="flex-1 w-full relative">
            <div className="relative w-full aspect-[500/560] rounded-[28px] overflow-hidden border border-[#e4ecee] shadow-md">
              <img src="/assets/feature-image.png" alt="3D Room" className="w-full h-full object-cover" />
            </div>

            {/* balance */}
            <div className="absolute bottom-[5%] left-[4%] right-[4%] bg-white/90 backdrop-blur-xl p-5 rounded-[20px] border border-white/80 shadow-2xl">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-[10px] text-[#9ca3af] font-bold uppercase tracking-[0.12em] mb-1">Total Balance</p>
                  <p className="text-[26px] sm:text-[30px] font-bold text-[#111D27] leading-none">$190,848.00</p>
                </div>
                {/* Bar chart */}
                <div className="flex items-end gap-1.5 h-9">
                  {[35, 65, 45, 90, 60, 80, 50].map((h, i) => (
                    <div
                      key={i}
                      className="w-[9px] bg-[#004643] rounded-t-[3px] hover:bg-[#8bec5c] transition-colors cursor-pointer"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="h-px bg-neutral-100 w-full" />
            </div>
          </div>

        </div>
      </section>

      {/* UNLOCK */}
      {/*
        FIX: "Book a Demo" button changed to rounded-full (matches Figma pill shape)
        FIX: "Start Free Trial" also rounded-full
        FIX: Overlay darkness adjusted to match Figma (75% Ã¢â€ â€™ 70%)
        FIX: Title size adjusted Ã¢â‚¬â€ Figma shows large but not 88px at desktop
      */}
      <section className="relative py-[60px] lg:py-[80px] px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="/assets/imgImage13.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[#111D27]/70" />
        </div>

        <div className="relative z-10 max-w-[860px] mx-auto text-center">
          <h2 className="text-[48px] sm:text-[64px] lg:text-[80px] font-bold text-white leading-[1.05] mb-7 tracking-tight">
            Unlock Your Dream
            <br />
            Home Today!
          </h2>
          <p className="text-[15px] sm:text-[18px] text-white/60 max-w-[580px] mx-auto mb-12 leading-[1.65]">
            Now design, visualize, and build your dream home/rooms with just few clicks. Experience interior design and furniture like never before.
          </p>
          {/* Both */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button className="w-full sm:w-auto bg-[#8bec5c] text-[#142d26] px-9 py-3.5 rounded-full text-[15px] font-bold hover:bg-[#a3f37e] transition-colors shadow-xl shadow-[#8bec5c]/20">
              Start Free Trial
            </button>
            <button className="w-full sm:w-auto bg-white/10 backdrop-blur-md border border-white/20 text-white px-9 py-3.5 rounded-full text-[15px] font-bold hover:bg-white/20 transition-colors">
              Book a Demo
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      {/*
        FIX: pt reduced to 72px (Figma shows tighter top padding)
        FIX: Bottom bar divider uses border-t border-[#f0f0f0] (lighter)
        FIX: Language selector and social icons alignment matched to Figma
        FIX: Subscribe button rounded-full confirmed correct
        FIX: Column gap tightened for better Figma match
      */}
      <footer className="bg-white pt-[72px] lg:pt-[90px] pb-9">
        <div className="max-w-[1240px] mx-auto px-4">

          {/* 4-col grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10 lg:gap-12 mb-14 lg:mb-16">

            {/* Brand column */}
            <div>
              <Link href="/" className="flex items-center gap-[10px] mb-5">
                <img src="/assets/logo.png" alt="NOOI" className="w-[34px] h-auto object-contain" />
                <span className="font-inter font-bold text-[20px] text-neutral-900 tracking-tight">NOOI</span>
              </Link>
              <p className="text-[#6b7280] mb-7 text-[14px] sm:text-[15px] leading-relaxed max-w-[320px]">
                Empowering the next generation of interior designers with AI-driven tools for visionaries.
              </p>

              {/* Email subscribe */}
              <div className="relative max-w-[340px] mb-7">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full h-[48px] bg-[#f5f7f8] border border-[#e8eaec] rounded-full px-5 outline-none focus:border-[#004643]/30 transition-colors text-[13px] pr-[110px] placeholder:text-[#9ca3af]"
                />
                <button className="absolute right-1.5 top-1.5 h-[36px] bg-[#004643] text-white px-5 rounded-full text-[12px] font-bold hover:bg-[#003330] transition-colors">
                  Subscribe
                </button>
              </div>

              {/* Platform icons */}
              <div className="flex items-center gap-4">
                <img src="/assets/windows.svg" alt="Windows" className="w-[18px] h-[18px] opacity-30 hover:opacity-70 transition-opacity cursor-pointer" />
                <img src="/assets/apple.svg" alt="Mac" className="w-[18px] h-[18px] opacity-30 hover:opacity-70 transition-opacity cursor-pointer" />
              </div>
            </div>

            {/* Product */}
            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-5 tracking-tight">Product</h5>
              <ul className="space-y-3.5 text-[14px] text-[#6b7280]">
                {["Room Planner", "AI Home Planner", "Kitchen Planner", "Pricing"].map((l) => (
                  <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors">{l}</li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-5 tracking-tight">Company</h5>
              <ul className="space-y-3.5 text-[14px] text-[#6b7280]">
                {["About Us", "Blog", "Careers", "Privacy"].map((l) => (
                  <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors">{l}</li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-5 tracking-tight">Resources</h5>
              <ul className="space-y-3.5 text-[14px] text-[#6b7280]">
                {["Documentation", "Community", "Support", "Blog"].map((l) => (
                  <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors">{l}</li>
                ))}
              </ul>
            </div>

          </div>

          {/* bar */}
          <div className="pt-6 border-t border-[#f0f0f0] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[#9ca3af] text-[12px]">
              Ã‚Â© 2026 NOOI Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5 text-[#9ca3af] text-[12px] font-medium cursor-pointer hover:text-neutral-700 transition-colors">
                <img src="/assets/language-circle.svg" alt="" className="w-[14px] h-[14px]" />
                <span>English</span>
                <img src="/assets/arrow-down-01.svg" alt="" className="w-3 h-3 opacity-50" />
              </div>
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#f5f5f5] border border-neutral-100 flex items-center justify-center hover:bg-[#004643] group transition-all cursor-pointer">
                  <img src="/assets/group.svg" alt="Social" className="w-3.5 h-3.5 group-hover:brightness-[10] transition-all" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}


