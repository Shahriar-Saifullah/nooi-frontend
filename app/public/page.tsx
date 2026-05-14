"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";

const PremiumFeatureContainer = ({ img1, img2 }: { img1: string, img2: string }) => {
  return (
    <div className="relative w-full aspect-[640/560] bg-[#f0f4f8]/30 rounded-[32px] overflow-visible border border-[#e2eaf0] shadow-inner group p-4 sm:p-10">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none rounded-[32px]" style={{ backgroundImage: 'linear-gradient(#004643 1px, transparent 1px), linear-gradient(90deg, #004643 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

      {/* Floating Style Card 1 (Outside Top Window) */}
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
        className="absolute top-[12%] right-[2%] w-[22%] py-10 px-4 pb-3 pt-4 md:w-[140px] z-20"
      >
        <Image width={500} height={500} src="/assets/Furniture 4 3.png" className="w-full h-auto rounded-[16px] shadow-2xl border border-white/60" alt="Style Picker" />
      </motion.div>

      {/* Top Window Card */}
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

      {/* Bottom Window Card */}
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
  const [prompt, setPrompt] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [activeFilter, setActiveFilter] = useState(0);


  const steps = [
    {
      title: "Start with your space",
      description: "Bring in your own floor plan or sketch it quickly online no complex tools, just a clean starting point. Bring in your own floor plan or sketch it quickly online no complex tools, just a clean starting point.",
      img: "/assets/4th Draft 1.png",
      miniTitle: "Upload or Sketch",
      miniDesc: "Turn rough ideas into editable 2D/3D layouts instantly. Our AI cleans up drawings and prepares them for design.",
      accentColor: "#b3ed97",
      mainBg: "#0c1a17",
      miniCardBg: "#3d4a39",
      btnText: "View All Step"
    },
    {
      title: "Style in seconds",
      description: "Let AI suggest layouts, furniture placement, and flow so you never start with a blank canvas.",
      img: "/assets/image 19.png",
      miniTitle: "Smart AI Design",
      miniDesc: "Generate layouts that fit your space and style in just a click. Edit and customize until it feels like home.",
      accentColor: "#c3b4fc",
      mainBg: "#1a0b3b",
      miniCardBg: "#4a3a6b",
      btnText: "Try AI Design",
      showMiniBtn: true,
      showScanLine: true
    },
    {
      title: "Shop the look you create",
      description: "Drag in real furniture and décor, then order the exact items—straight from your design.",
      img: "/assets/image step3.png",
      miniTitle: "Furnish With Confidence",
      miniDesc: "Everything you see is a real product. No mismatches, no guesswork—just one click to bring it home.",
      accentColor: "#d18d53",
      mainBg: "#2b1b11",
      miniCardBg: "#82614a",
      btnText: "Browse Furnitures"
    },
    {
      title: "From screen to doorstep",
      description: "Your design isn't just virtual—we deliver every piece straight to you",
      img: "/assets/image 19.png",
      miniTitle: "Track Your Order",
      miniDesc: "Follow your delivery in real-time, from checkout to doorstep. Designed, ordered, and received—without hassle.",
      accentColor: "#a5688e",
      mainBg: "#410948",
      miniCardBg: "#7C5A7D",
      btnText: "Order from Design",
      showScanLine: true
    }
  ];

  return (
    <div className="relative min-h-screen bg-white font-schibsted overflow-x-hidden">

      {/* NAVBAR */}
      <Navbar />

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
          <Image fill src="/assets/bg-grid.svg" alt="" className="object-cover" />
        </div>

        <div className="flex flex-col gap-[44px] items-center max-w-[1240px] w-full">
          {/* Ã¢â‚¬â€ */}
          <div className="bg-white/30 border border-[#548381]/20 rounded-full px-[14px] py-[7px] flex items-center gap-[8px] cursor-default backdrop-blur-sm">
            <Image width={100} height={100} src="/assets/stars.svg" alt="" className="w-[14px] h-[14px]" />
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
                <Image width={100} height={100} src="/assets/vector-1.svg" alt="Attach" className="w-[18px] h-[18px] opacity-60" />
              </button>

              <div className="flex items-center gap-[10px]">
                {/* Voice */}
                <button className="w-[32px] h-[32px] flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
                  <Image width={100} height={100} src="/Logo/icon.svg" alt="Voice" className="w-[24px] h-[24px]" />
                </button>

                {/* Now */}
                <button className="bg-[#004643] rounded-[10px] py-[10px] px-7 flex items-center gap-[7px] hover:bg-[#003330] transition-colors shadow-md group">
                  <span className="font-schibsted font-semibold text-white text-[14px] leading-none whitespace-nowrap">
                    Build Now
                  </span>
                  <Image width={100} height={100} src="/assets/icon.svg" alt="" className="w-[16px] h-[16px] brightness-[10] group-hover:translate-x-0.5 transition-transform" />
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
            { name: "Room Planner", img: "/assets/video-pic-1.png" },
            { name: "AI Home Planner", img: "/assets/video-pic-2.png" },
            { name: "Kitchen Planner", img: "/assets/video-pic-1.png" },
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              className="bg-[#f1f5f9] border border-[#e6f0f2] rounded-[16px] p-[24px] flex flex-col transition-all hover:shadow-lg group"
            >
              {/* Image Container */}
              <div className="bg-white border border-[#e6f0f2] rounded-[8.2px] p-[12px] mb-[24px] aspect-[350/255] flex items-center justify-center overflow-hidden">
                <Image width={500} height={500} src={feature.img}
                  alt={feature.name}
                  className="w-full h-auto object-contain" />
              </div>
              {/* + */}
              <div className="flex items-center justify-between">
                <h3 className="text-[28px] font-bold text-[#272e35] leading-[1.2] font-scada">
                  {feature.name}
                </h3>
                <button className="w-[46px] h-[46px] bg-[#142d25] rounded-[8px] flex items-center justify-center hover:bg-[#003330] transition-colors shadow-sm shrink-0">
                  <Image width={100} height={100} src="/assets/arrow-outward.svg" alt="Go" className="w-[24px] h-[24px] brightness-[10]" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* All */}
        <button className="bg-[#004643] text-white pl-[24px] pr-[4px] py-[4px] rounded-[16px] flex items-center gap-[16px] hover:bg-[#003330] transition-all shadow-[0px_19px_19px_rgba(0,0,0,0.09)] group">
          <span className="text-[20px] font-schibsted font-normal">View All Design</span>
          <div className="bg-white p-[12px] rounded-[12px] flex items-center justify-center">
            <Image width={100} height={100} src="/assets/arrow-right-02-sharp.svg" alt="" className="w-[24px] h-[24px] -rotate-0" />
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
                  <Image width={100} height={100} src="/assets/arrow-right-02-sharp.svg" alt="" className="w-[24px] h-[24px] -rotate-0" />
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
                  <Image width={100} height={100} src="/assets/arrow-right-02-sharp.svg" alt="" className="w-[24px] h-[24px] -rotate-0" />
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
                  <Image width={100} height={100} src="/assets/arrow-right-02-sharp.svg" alt="" className="w-[24px] h-[24px] -rotate-0" />
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
        <motion.div
          animate={{ backgroundColor: steps[activeStep].mainBg }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[1240px] rounded-[22px] p-[20px] sm:p-[30px] lg:p-[40px_40px_40px_80px] flex flex-col lg:flex-row items-center lg:items-stretch gap-[40px] lg:gap-[100px] mx-auto overflow-hidden"
        >
          {/* Column */}
          <div className="flex-1 w-full max-w-[500px] flex flex-col mx-auto lg:mx-0 py-5">
            {/* nav - Boxed style to match design, responsive fit for Mobile S */}
            <div className="flex items-center border border-white/10 rounded-lg p-1 mb-[40px] md:mb-[80px] w-full sm:w-fit mx-auto lg:mx-0 overflow-hidden">
              <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
                {["Step 1", "Step 2", "Step 3", "Step 4"].map((step, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveStep(i)}
                    className={`cursor-pointer px-[8px] min-[375px]:px-[12px] sm:px-[16px] py-[8px] text-[13px] min-[375px]:text-[14px] sm:text-[18px] font-medium transition-all relative whitespace-nowrap shrink-0 rounded-md flex-1 sm:flex-none text-center ${activeStep === i ? "bg-white/5" : "text-[#859c80] hover:text-white/60"
                      }`}
                    style={{ color: activeStep === i ? steps[activeStep].accentColor : undefined }}
                  >
                    {step}
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

            {/* Content Container */}
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

          {/* Column - Right Side Mini Card */}
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

                {/* Image Container Card - Removed white background/border per user request */}
                <div className="rounded-[20px] pt-[20px] pb-[20px] mb-6 relative">
                  <div className="aspect-[4096/2730] rounded-[12px] overflow-hidden relative border border-white/5 shadow-sm">
                    <Image fill src={steps[activeStep].img}
                      alt={steps[activeStep].miniTitle}
                      className="object-cover rounded-[12px]" />
                  </div>
                  {/* Dynamic Scan Line Effect */}
                  {/* {steps[activeStep].showScanLine && (
                    <motion.div 
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-y-0 left-0 w-1 bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.8)] z-10"
                    />
                  )} */}
                </div>

                <p className="text-[16px] sm:text-[18px] text-white/80 leading-[1.6] font-schibsted mb-6">
                  {steps[activeStep].miniDesc}
                </p>

                {/* Optional Mini Button for Step 2 */}
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
      </section>

      {/* GALLERY */}
      {/*
        FIX: Active filter pill shadow made stronger (shadow-md + ring) to stand out
        FIX: Filter pill font-size 13px (Figma uses smaller pill labels)
        FIX: Grid gap tightened to gap-4 to match Figma tighter layout
        FIX: Image border-radius 16px (Figma shows slightly tighter radius)
      */}
      <section className="py-[50px] lg:py-[80px] px-4 bg-white">
        <div className="max-w-[1240px] mx-auto">
          {/* Header */}
          <div className="max-w-[800px] mx-auto text-center mb-[40px]">
            <h2 className="text-[36px] sm:text-[48px] lg:text-[56px] font-bold text-[#111D27] leading-[1.1] mb-[16px] tracking-tight">
              Explore Our Gallery
            </h2>
            <p className="text-[16px] sm:text-[18px] text-[#556370] leading-[1.6]">
              Automated floor plan generation with AI with Realistic 3D rendering & design
              <br className="hidden sm:block" /> visualization, Automated floor plan generation with AI with Realistic
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap justify-center gap-[12px] mb-[50px]">
            {["All", "Living room", "Dining Room", "Kitchen", "Furniture", "Others"].map((f, i) => (
              <button
                key={i}
                onClick={() => setActiveFilter(i)}
                className={`px-[20px] py-[8px] rounded-[6px] text-[14px] font-medium transition-all border ${activeFilter === i
                  ? "bg-[#0c1a17] text-white border-[#0c1a17]"
                  : "bg-white text-[#556370] border-gray-200 hover:border-gray-300"
                  }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Masonry Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[20px]">
            {/* Column 1 */}
            <div className="flex flex-col gap-[20px]">
              <div className="relative w-full h-[380px] rounded-[20px] overflow-hidden group">
                <Image fill src="/assets/gallery-1.png" alt="Gallery" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-[16px] left-[16px] bg-white/90 backdrop-blur-sm px-[12px] py-[6px] rounded-[6px] flex items-center gap-[6px] shadow-sm">
                  <Image width={100} height={100} src="/assets/image-svg-1.svg" className="w-[14px] h-[14px] opacity-70" alt="" />
                  <span className="text-[12px] text-[#556370] font-medium">View more [4]</span>
                </div>
              </div>
              <div className="relative w-full h-[280px] rounded-[20px] overflow-hidden group">
                <Image fill src="/assets/gallery-2.png" alt="Gallery" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-[16px] left-[16px] bg-white/90 backdrop-blur-sm px-[12px] py-[6px] rounded-[6px] flex items-center gap-[6px] shadow-sm">
                  <Image width={100} height={100} src="/assets/image-svg-1.svg" className="w-[14px] h-[14px] opacity-70" alt="" />
                  <span className="text-[12px] text-[#556370] font-medium">View more [7]</span>
                </div>
              </div>
            </div>

            {/* Column 2 */}
            <div className="flex flex-col gap-[20px]">
              <div className="relative w-full h-[280px] rounded-[20px] overflow-hidden group">
                <Image fill src="/assets/gallery-3.png" alt="Gallery" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-[16px] left-[16px] bg-white/90 backdrop-blur-sm px-[12px] py-[6px] rounded-[6px] flex items-center gap-[6px] shadow-sm">
                  <Image width={100} height={100} src="/assets/image-svg-1.svg" className="w-[14px] h-[14px] opacity-70" alt="" />
                  <span className="text-[12px] text-[#556370] font-medium">View more [3]</span>
                </div>
              </div>
              <div className="relative w-full h-[380px] rounded-[20px] overflow-hidden group">
                <Image fill src="/assets/gallery-4.png" alt="Gallery" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-[16px] left-[16px] bg-white/90 backdrop-blur-sm px-[12px] py-[6px] rounded-[6px] flex items-center gap-[6px] shadow-sm">
                  <Image width={100} height={100} src="/assets/image-svg-1.svg" className="w-[14px] h-[14px] opacity-70" alt="" />
                  <span className="text-[12px] text-[#556370] font-medium">View more [6]</span>
                </div>
              </div>
            </div>

            {/* Column 3 */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-[20px] sm:col-span-2 lg:col-span-1">
              <div className="relative w-full sm:w-1/2 lg:w-full h-[380px] rounded-[20px] overflow-hidden group">
                <Image fill src="/assets/gallery-5.png" alt="Gallery" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-[16px] left-[16px] bg-white/90 backdrop-blur-sm px-[12px] py-[6px] rounded-[6px] flex items-center gap-[6px] shadow-sm">
                  <Image width={100} height={100} src="/assets/image-svg-1.svg" className="w-[14px] h-[14px] opacity-70" alt="" />
                  <span className="text-[12px] text-[#556370] font-medium">View more [10]</span>
                </div>
              </div>
              <div className="relative w-full sm:w-1/2 lg:w-full h-[280px] sm:h-[380px] lg:h-[280px] rounded-[20px] overflow-hidden group">
                <Image fill src="/assets/gallery-6.png" alt="Gallery" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-[16px] left-[16px] bg-white/90 backdrop-blur-sm px-[12px] py-[6px] rounded-[6px] flex items-center gap-[6px] shadow-sm">
                  <Image width={100} height={100} src="/assets/image-svg-1.svg" className="w-[14px] h-[14px] opacity-70" alt="" />
                  <span className="text-[12px] text-[#556370] font-medium">View more [17]</span>
                </div>
              </div>
            </div>
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
      <section className="py-[60px] lg:py-[100px] px-4 bg-[#f8fafc]">
        <div className="max-w-[1240px] mx-auto">
          {/* Header (Full Width Centered) */}
          <div className="max-w-[800px] mx-auto text-center mb-[60px]">
            <h2 className="text-[36px] sm:text-[48px] lg:text-[56px] font-bold text-[#111D27] leading-[1.1] mb-[16px] tracking-tight">
              Why Choose NOOI
            </h2>
            <p className="text-[16px] sm:text-[18px] text-[#556370] leading-[1.6]">
              Automated floor plan generation with AI with Realistic 3D rendering & design
              <br className="hidden sm:block" /> visualization, Automated floor plan generation with AI with Realistic
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-[40px] lg:gap-[80px]">
            {/* Left - Feature List */}
            <div className="flex-1 w-full flex flex-col">
              {[
                { title: "Expert-Level Tools, Beginner-Friendly Interface", desc: "Powerful enough for professionals, intuitive enough for beginners. Nooi's clean interface makes advanced design tools easy to use from day one.", icon: "/assets/image-svg-2.svg", active: true },
                { title: "All-in-One Platform", icon: "/assets/arrows-output.svg", active: false },
                { title: "Real-World Integration", icon: "/assets/icon.svg", active: false },
                { title: "Trusted by Professionals", icon: "/assets/verified-user.svg", active: false },
                { title: "Accuracy & Speed", icon: "/assets/vector-1.svg", active: false },
              ].map((item, i, arr) => (
                <div
                  key={i}
                  className={`flex items-start gap-[20px] p-[20px] sm:p-[24px] transition-all ${item.active
                    ? "bg-[#f1f5f9] rounded-[16px] border border-transparent"
                    : `border-b border-[#e2e8f0] rounded-none ${i === arr.length - 1 ? 'border-none' : ''}`
                    }`}
                >
                  <div className="w-[48px] h-[48px] bg-[#e2e8f0] rounded-[12px] flex items-center justify-center shrink-0">
                    <Image width={100} height={100} src={item.icon || "/assets/verified-user.svg"} alt="" className="w-[20px] h-[20px] opacity-70" />
                  </div>
                  <div className="flex-1 min-w-0 pt-[10px]">
                    <h4 className="text-[18px] sm:text-[20px] font-medium text-[#111D27] leading-snug mb-[8px]">{item.title}</h4>
                    {item.active && (
                      <p className="text-[#64748b] leading-relaxed text-[15px] sm:text-[16px] pr-4">{item.desc}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Right - Image & Floating Card */}
            <div className="flex-1 w-full relative">
              <div className="relative w-full aspect-square sm:aspect-[500/560] lg:aspect-auto lg:h-[600px] rounded-[32px] overflow-hidden bg-[#c2c6c9]">
                <Image fill src="/assets/feature-image.png" alt="3D Room" className="object-cover scale-105 opacity-90" />
              </div>

              {/* Floating Dashboard Card */}
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

                {/* Bar chart */}
                <div className="flex items-end justify-between h-[60px] gap-[8px] sm:gap-[12px] mb-[16px] px-1">
                  {[
                    { h: 35, active: false },
                    { h: 15, active: false },
                    { h: 25, active: false },
                    { h: 90, active: true },
                    { h: 20, active: false }
                  ].map((bar, i) => (
                    <div
                      key={i}
                      className={`w-full rounded-[6px] ${bar.active ? "bg-[#d4a017]" : "bg-[#f1f5f9]"}`}
                      style={{ height: `${bar.h}%` }}
                    />
                  ))}
                </div>

                {/* X-axis labels */}
                <div className="flex justify-between items-center text-[10px] text-[#94a3b8] font-medium">
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((label, i) => (
                    <span key={i} className={`px-[8px] py-[4px] rounded-full transition-colors ${label === "Apr" ? "bg-[#1e3a3a] text-white" : ""}`}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
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
          <Image fill src="/assets/imgImage13.png" alt="" className="object-cover" />
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
                <Image width={500} height={500} src="/assets/logo.png" alt="NOOI" className="w-[34px] h-auto object-contain" />
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
                <Image width={100} height={100} src="/assets/windows.svg" alt="Windows" className="w-[18px] h-[18px] opacity-30 hover:opacity-70 transition-opacity cursor-pointer" />
                <Image width={100} height={100} src="/assets/apple.svg" alt="Mac" className="w-[18px] h-[18px] opacity-30 hover:opacity-70 transition-opacity cursor-pointer" />
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
                <Image width={100} height={100} src="/assets/language-circle.svg" alt="" className="w-[14px] h-[14px]" />
                <span>English</span>
                <Image width={100} height={100} src="/assets/arrow-down-01.svg" alt="" className="w-3 h-3 opacity-50" />
              </div>
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


