"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export default function AboutPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const stats = [
    { value: "50k+", label: "Projects Served" },
    { value: "120+", label: "Countries Served" },
    { value: "2M+", label: "Active Delivery" },
    { value: "98%", label: "Client Satisfaction" },
  ];

  const team = [
    {
      name: "Alex Throne",
      role: "Co-Founder & CEO",
      desc: "Former architect turned tech entrepreneur. Passionate about solving the fragmentation in design workflows",
      bg: "#E8A87C",
      img: "/assets/CEO.png",
      nameColor: "#004643",
      roleColor: "#004643",
    },
    {
      name: "Sarah Jenkins",
      role: "Chief Technology Officer",
      desc: "AI specialist with a background in 3D rendering engines. Leads our engineering team to push boundaries.",
      bg: "#4A7C6F",
      img: "/assets/CTO.png",
      nameColor: "#004643",
      roleColor: "#004643",
    },
    {
      name: "Marcus Chen",
      role: "Head of Design",
      desc: "Award-winning interior designer. Ensures our platform serves the creative needs of realprofessionals.",
      bg: "#C49A6C",
      img: "/assets/designHead.png",
      nameColor: "#004643",
      roleColor: "#004643",
    },
  ];

  const features = [
    {
      icon: "/assets/stars.svg",
      title: "Innovation First",
      desc: "We push the boundaries of what AI can do for interior design—constantly iterating, improving, and building tools that didn't exist before.",
    },
    {
      icon: "/assets/design-services.svg",
      title: "User-Centric Design",
      desc: "Every feature is built around real user needs. We listen, learn, and design products that feel natural and effortless to use.",
    },
    {
      icon: "/assets/verified-user.svg",
      title: "Sustainability",
      desc: "We believe great design and responsible choices go hand in hand—partnering with brands committed to a greener future.",
    },
  ];

  return (
    <div className="relative min-h-screen bg-white font-schibsted overflow-x-hidden">

      {/* NAVBAR */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[1240px] h-[72px] z-50">
        <div className="w-full h-full backdrop-blur-[100px] bg-[#f7fbfc]/90 border border-[#e2eaf0] rounded-[22px] flex items-center justify-between pl-[16px] md:pl-[24px] pr-[12px] py-[12px] shadow-[0_4px_30px_rgba(0,0,0,0.03)] gap-4">
          <div className="flex items-center shrink-0">
            <Link href="/public" className="flex items-center gap-[9px]">
              <Image width={40} height={40} src="/assets/logo.png" alt="NOOI" className="w-[32px] md:w-[40px] h-auto object-contain" />
              <span className="font-inter font-bold text-[18px] md:text-[20px] text-[#111d27] tracking-tight">NOOI</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-[11px] flex-1 justify-center whitespace-nowrap">
            <button className="flex items-center gap-[3px] px-[10px] py-[4px] opacity-80 hover:opacity-100 transition-opacity">
              <span className="font-schibsted font-normal text-[#003230] text-[14px]">Products</span>
              <Image width={20} height={20} src="/assets/arrow-down.svg" alt="" className="w-[20px] h-[20px] opacity-60" />
            </button>
            <Link href="/marketplace" className="px-[10px] py-[4px] opacity-80 hover:opacity-100 transition-opacity">
              <span className="font-schibsted font-normal text-[#003230] text-[14px]">Marketplace</span>
            </Link>
            <button className="flex items-center gap-[3px] px-[10px] py-[4px] opacity-80 hover:opacity-100 transition-opacity">
              <span className="font-schibsted font-normal text-[#003230] text-[14px]">Resources</span>
              <Image width={20} height={20} src="/assets/arrow-down.svg" alt="" className="w-[20px] h-[20px] opacity-60" />
            </button>
            <button className="px-[10px] py-[4px] opacity-80 hover:opacity-100 transition-opacity">
              <span className="font-schibsted font-normal text-[#003230] text-[14px]">Pricing</span>
            </button>
          </div>

          <div className="flex items-center gap-[8px] justify-end shrink-0">
            <button className="relative hidden lg:flex w-[46px] h-[46px] items-center justify-center hover:bg-black/5 rounded-full transition-colors shrink-0">
              <Image fill src="/assets/container-svg.svg" alt="Help" className="" />
            </button>
            <div className="flex items-center gap-[2px] md:gap-[4px] h-[40px] md:h-[46px] bg-white border border-[#e6e6e8] p-[2px] md:p-[4px] rounded-[10px] md:rounded-[12px] flex-nowrap shrink-0">
              <Link href="/authpage/signin" className="h-full px-4 md:px-[16px] flex items-center justify-center bg-[#f8f8f8] rounded-[6px] md:rounded-[8px] text-[#272e35] text-[13px] md:text-[16px] font-schibsted font-medium hover:bg-neutral-100 transition-colors whitespace-nowrap">
                Log in
              </Link>
              <Link href="/authpage/signup" className="hidden md:flex h-full px-3 md:px-[16px] items-center justify-center bg-[#004643] rounded-[7px] md:rounded-[9px] text-white text-[13px] md:text-[16px] font-schibsted font-medium hover:bg-[#003330] transition-colors shadow-sm whitespace-nowrap">
                Start for free
              </Link>
            </div>
            <button className="md:hidden w-[40px] h-[40px] flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg hover:bg-black/5 ml-1" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <div className={`w-6 h-0.5 bg-[#111d27] transition-all ${isMenuOpen ? "rotate-45 translate-y-2" : ""}`} />
              <div className={`w-6 h-0.5 bg-[#111d27] transition-all ${isMenuOpen ? "opacity-0" : ""}`} />
              <div className={`w-6 h-0.5 bg-[#111d27] transition-all ${isMenuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-[80px] left-0 w-full bg-[#f7fbfc] border border-[#e2eaf0] rounded-[22px] p-6 shadow-2xl flex flex-col gap-4 md:hidden z-[60] backdrop-blur-xl"
            >
              <button className="flex items-center justify-between p-2 hover:bg-black/5 rounded-lg">
                <span className="font-schibsted text-[16px] text-[#003230] font-medium">Products</span>
              </button>
              <Link href="/marketplace" className="flex items-center justify-between p-2 hover:bg-black/5 rounded-lg" onClick={() => setIsMenuOpen(false)}>
                <span className="font-schibsted text-[16px] text-[#003230] font-medium">Marketplace</span>
              </Link>
              <button className="flex items-center justify-between p-2 hover:bg-black/5 rounded-lg">
                <span className="font-schibsted text-[16px] text-[#003230] font-medium">Resources</span>
              </button>
              <button className="p-2 text-left hover:bg-black/5 rounded-lg font-schibsted text-[16px] text-[#003230] font-medium">Pricing</button>
              <div className="h-px w-full bg-black/5 my-2" />
              <Link href="/authpage/signup" className="w-full py-3 flex items-center justify-center bg-[#004643] rounded-[10px] text-white text-[16px] font-schibsted font-medium hover:bg-[#003330] transition-colors shadow-sm" onClick={() => setIsMenuOpen(false)}>
                Start for free
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* HERO */}
      <section className="relative pt-[140px] pb-[80px] px-4 bg-[#eef2f7] flex flex-col items-center">
        <div className="max-w-[1240px] w-full mx-auto flex flex-col items-center gap-[40px]">

          {/* Eyebrow pill */}
          <div className="bg-white border border-[#e2eaf0] rounded-full px-[14px] py-[7px] flex items-center gap-[8px]">
            <div className="w-[7px] h-[7px] rounded-full bg-[#8bec5c]" />
            <span className="font-schibsted font-medium text-[13px] text-[#555f6d]">Our Story</span>
          </div>

          {/* Heading */}
          <div className="flex flex-col items-center text-center gap-0">
            <h1 className="font-schibsted font-bold text-[56px] sm:text-[64px] lg:text-[72px] leading-[1.08] text-[#004643] text-center" style={{ letterSpacing: "0px" }}>
              Redefining Interior
            </h1>
            <p
              className="italic font-normal text-[56px] sm:text-[64px] lg:text-[72px] text-[#004643] text-center"
              style={{
                lineHeight: "72px",
                letterSpacing: "0px",
                fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                fontStyle: "italic",
                fontWeight: 400,
              }}
            >
              Design &amp; Logistics.
            </p>
          </div>

          {/* Subtitle */}
          <p className="font-schibsted font-normal text-[17px] sm:text-[19px] leading-[1.65] text-[#555f6d] max-w-[560px] text-center">
            We bridge the gap between imagination and reality. Nooi is the all-in-one platform connecting architects, designers, and developers with seamless execution tools.
          </p>

          {/* Hero Image Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="w-full max-w-[1100px] relative rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.12)]"
            style={{ aspectRatio: "16/7" }}
          >
            {/* Office photo */}
            <Image
              fill
              src="/assets/office.png"
              alt="Design Innovation Center"
              className="object-cover"
              priority
            />
            {/* Gradient overlay from Figma */}
            <Image
              fill
              src="/assets/gradient.png"
              alt=""
              className="object-cover"
            />
            {/* Bottom-left label */}
            <div className="absolute bottom-[28px] left-[32px] flex flex-col gap-[4px]">
              <span className="text-white/60 text-[11px] font-medium font-schibsted uppercase tracking-[2px]">Our HQ</span>
              <span className="text-white text-[18px] font-bold font-schibsted leading-tight">Design Innovation Center</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FROM SKETCH TO SANCTUARY */}
      <section className="py-[80px] px-4 bg-white">
        <div className="max-w-[1240px] mx-auto flex flex-col lg:flex-row gap-[60px] lg:gap-[80px] items-start">

          {/* Left */}
          <div className="w-full lg:w-[540px] shrink-0">
            <h2 className="font-schibsted font-bold text-[36px] sm:text-[42px] lg:text-[48px] leading-[1.1] text-[#004643] mb-8 tracking-[-1px]">
              From Sketch to{" "}
              <span 
                style={{ 
                  fontFamily: "var(--font-instrument), 'Instrument Serif', Georgia, serif", 
                  fontStyle: "italic",
                  fontWeight: 400,
                  letterSpacing: "0.3px",
                  color: "#004643"
                }}
              >
                Sanctuary.
              </span>
            </h2>
            <p className="text-[16px] text-[#555f6d] leading-[1.7] mb-6">
              Founded in 2020, Nooi started with a simple question: Why is the distance between a beautiful rendering and a finished room so vast? We noticed that designers spent more time wrestling with logistics than creating beauty.
            </p>
            <p className="text-[16px] text-[#555f6d] leading-[1.7] mb-12">
              Our platform empowers creators to move from rough sketch to fully furnished reality—with precision tools and AI-powered logistics every step of the way.
            </p>

            {/* Two icon items side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: "/assets/arrows-output.svg", label: "Our Mission", desc: "A world where any space can be transformed from a digital dream to physical reality in days, not months." },
                { icon: "/assets/verified-user.svg", label: "Our Vision", desc: "To become the global infrastructure for interior design, bridging the gap between imagination and execution." },
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-3 p-5 border border-[#e8edf2] rounded-[20px] bg-[#fafcfc] hover:shadow-md transition-shadow">
                  <div className="w-[44px] h-[44px] bg-[#eef6f5] border border-[#d0e8e6] rounded-[14px] flex items-center justify-center shrink-0">
                    <Image width={22} height={22} src={item.icon} alt="" className="w-[22px] h-[22px] opacity-80" />
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-[#111d27] mb-1 font-schibsted">{item.label}</p>
                    <p className="text-[14px] text-[#6b7780] leading-[1.6]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — staggered 2-col layout matching Figma */}
          <div className="flex-1 w-full lg:max-w-[540px] flex gap-[16px] mt-10 lg:mt-[70px]">
            
            {/* Left column: tall top, short bottom */}
            <div className="flex-1 flex flex-col gap-[16px]">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative rounded-[20px] overflow-hidden w-full h-[280px] shadow-lg"
              >
                <Image fill src="/assets/imgImage2.png" alt="" className="object-cover hover:scale-105 transition-transform duration-700" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="relative rounded-[20px] overflow-hidden w-full h-[200px] shadow-lg"
              >
                <Image fill src="/assets/imgImage6.png" alt="" className="object-cover hover:scale-105 transition-transform duration-700" />
              </motion.div>
            </div>

            {/* Right column: short top, tall bottom */}
            <div className="flex-1 flex flex-col gap-[16px]">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="relative rounded-[20px] overflow-hidden w-full h-[220px] shadow-lg"
              >
                <Image fill src="/assets/imgImage3.png" alt="" className="object-cover hover:scale-105 transition-transform duration-700" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="relative rounded-[20px] overflow-hidden w-full h-[260px] shadow-lg"
              >
                <Image fill src="/assets/imgImage8.png" alt="" className="object-cover hover:scale-105 transition-transform duration-700" />
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="bg-[#004643] py-[60px] lg:py-[80px] px-4">
        <div className="max-w-[1240px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <p className="text-[48px] sm:text-[60px] font-bold text-white leading-none font-schibsted tracking-[-1.5px] mb-3">{stat.value}</p>
              <p className="text-[14px] text-white/50 font-schibsted uppercase tracking-[1px]">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* MEET THE INNOVATORS */}
      <section className="py-[50px] lg:py-[50px] px-4 bg-[#F5F7FA] overflow-hidden">
        <div className="max-w-[1240px] mx-auto">
          <div className="flex flex-col items-center text-center mb-[72px]">
            <p className="text-[14px] font-semibold text-[#004643] uppercase tracking-[2.5px] mb-4 font-schibsted">The Team Behind</p>
            <h2 className="font-schibsted font-bold text-[40px] sm:text-[48px] lg:text-[56px] leading-[1.1] text-[#111d27] tracking-[-1.5px]">
              Meet the{" "}
              <span className="font-instrument italic font-normal text-[#004643]">Innovators.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                whileHover={{ y: -10 }}
                className="group rounded-[32px] overflow-hidden bg-white border border-[#e8edf2] shadow-[0_10px_40px_rgba(0,0,0,0.04)] flex flex-col transition-all duration-500 hover:shadow-[0_20px_60px_rgba(0,0,0,0.1)]"
              >
                {/* Avatar area */}
                <div className="relative flex items-end justify-center h-[320px] overflow-hidden" style={{ backgroundColor: member.bg }}>
                  {/* Subtle background pattern/shape could go here */}
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-[400px] h-[360px] transform group-hover:scale-105 transition-transform duration-700">
                    <Image fill src={member.img} alt={member.name} className="object-cover object-top" />
                  </div>
                </div>
                {/* Info */}
                <div className="px-[32px] py-[32px] flex items-center flex-col gap-3 flex-1">
                  <p className="text-[22px] font-bold font-schibsted tracking-tight" style={{ color: member.nameColor }}>{member.name}</p>
                  <p className="text-[13px] font-semibold font-schibsted uppercase tracking-[1.5px]" style={{ color: member.roleColor }}>{member.role}</p>
                  <div className="w-8 h-[2px] bg-[#eef6f5] my-1" />
                  <p className="text-[15px] text-[#6b7780] leading-[1.6] text-center">{member.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* BUILT ON TRUST & PRECISION */}
      <section className="py-[80px] lg:py-[100px] px-4 bg-white">
        <div className="max-w-[1240px] mx-auto">
          <div className="text-center mb-[60px]">
            <h2 className="font-schibsted font-semibold text-[40px] sm:text-[48px] leading-[1.15] text-[#111d27] tracking-[-1.5px] mb-4">
              Built on Trust &amp; Precision
            </h2>
            <p className="text-[18px] text-[#555f6d] max-w-[600px] mx-auto leading-[1.65]">
              Our principles guide every product decision. These are the pillars on which NOOI is built.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="bg-[#f8fafc] rounded-[24px] border border-[#e8edf2] p-[32px] flex flex-col gap-5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-shadow"
              >
                <div className="w-[52px] h-[52px] bg-[#eef6f5] border border-[#d0e8e6] rounded-[16px] flex items-center justify-center">
                  <Image width={24} height={24} src={feat.icon} alt="" className="w-[24px] h-[24px] opacity-80" />
                </div>
                <h3 className="text-[20px] font-bold text-[#111d27] font-schibsted">{feat.title}</h3>
                <p className="text-[15px] text-[#6b7780] leading-[1.7]">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-[80px] lg:py-[100px] px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image fill src="/assets/imgImage13.png" alt="" className="object-cover" />
          <div className="absolute inset-0 bg-[#0f2623]/80" />
        </div>
        <div className="relative z-10 max-w-[760px] mx-auto text-center flex flex-col items-center gap-8">
          <h2 className="font-schibsted font-bold text-[42px] sm:text-[58px] lg:text-[68px] text-white leading-[1.08] tracking-[-2px]">
            Ready to transform<br />your Workflow?
          </h2>
          <p className="text-[17px] text-white/60 max-w-[520px] leading-[1.65]">
            Join thousands of designers and architects already building their dream spaces with NOOI.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/authpage/signup"
              className="bg-[#8bec5c] text-[#142d26] px-8 py-4 rounded-full text-[15px] font-bold hover:bg-[#a3f37e] transition-colors shadow-xl shadow-[#8bec5c]/20 whitespace-nowrap flex items-center gap-3"
            >
              Get For Free
              <div className="bg-[#142d26]/20 rounded-full w-6 h-6 flex items-center justify-center">
                <Image width={14} height={14} src="/assets/arrow-right-02-sharp.svg" alt="" className="w-[14px] h-[14px]" />
              </div>
            </Link>
            <button className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-full text-[15px] font-bold hover:bg-white/20 transition-colors whitespace-nowrap">
              Book a Demo
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#F5F7FA] pt-[72px] lg:pt-[90px] pb-9">
        <div className="max-w-[1240px] mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10 lg:gap-12 mb-14 lg:mb-16">
            <div>
              <Link href="/public" className="flex items-center gap-[10px] mb-5">
                <Image width={34} height={34} src="/assets/logo.png" alt="NOOI" className="w-[34px] h-auto object-contain" />
                <span className="font-inter font-bold text-[20px] text-neutral-900 tracking-tight">NOOI</span>
              </Link>
              <p className="text-[#6b7280] mb-7 text-[14px] sm:text-[15px] leading-relaxed max-w-[320px]">
                Empowering the next generation of interior designers with AI-driven tools for visionaries.
              </p>
              <div className="relative max-w-[340px] mb-7">
                <input type="email" placeholder="Enter your email" className="w-full h-[48px] bg-white border border-[#e8eaec] rounded-full px-5 outline-none focus:border-[#004643]/30 transition-colors text-[13px] pr-[110px] placeholder:text-[#9ca3af]" />
                <button className="absolute right-1.5 top-1.5 h-[36px] bg-[#004643] text-white px-5 rounded-full text-[12px] font-bold hover:bg-[#003330] transition-colors">Subscribe</button>
              </div>
              <div className="flex items-center gap-4">
                <Image width={18} height={18} src="/assets/windows.svg" alt="Windows" className="w-[18px] h-[18px] opacity-30 hover:opacity-70 transition-opacity cursor-pointer" />
                <Image width={18} height={18} src="/assets/apple.svg" alt="Mac" className="w-[18px] h-[18px] opacity-30 hover:opacity-70 transition-opacity cursor-pointer" />
              </div>
            </div>

            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-5 tracking-tight">Product</h5>
              <ul className="space-y-3.5 text-[14px] text-[#6b7280]">
                {["Room Planner", "AI Home Planner", "Kitchen Planner", "Pricing"].map((l) => (
                  <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors">{l}</li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-5 tracking-tight">Company</h5>
              <ul className="space-y-3.5 text-[14px] text-[#6b7280]">
                {["About Us", "Blog", "Careers", "Privacy"].map((l) => (
                  <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors">{l}</li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-5 tracking-tight">Resources</h5>
              <ul className="space-y-3.5 text-[14px] text-[#6b7280]">
                {["Documentation", "Community", "Support", "Blog"].map((l) => (
                  <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors">{l}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-[#f0f0f0] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[#9ca3af] text-[12px]">© 2026 NOOI Inc. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5 text-[#9ca3af] text-[12px] font-medium cursor-pointer hover:text-neutral-700 transition-colors">
                <Image width={14} height={14} src="/assets/language-circle.svg" alt="" className="w-[14px] h-[14px]" />
                <span>English</span>
                <Image width={12} height={12} src="/assets/arrow-down-01.svg" alt="" className="w-3 h-3 opacity-50" />
              </div>
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#f5f5f5] border border-neutral-100 flex items-center justify-center hover:bg-[#004643] group transition-all cursor-pointer">
                  <Image width={14} height={14} src="/assets/group.svg" alt="Social" className="w-3.5 h-3.5 group-hover:brightness-[10] transition-all" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
