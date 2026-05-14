"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Search, ArrowRight, Check, Play, Globe, ChevronDown, Sparkles, Box, Maximize, Smartphone } from "lucide-react";

export default function HomePlannerPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-white font-schibsted overflow-x-hidden antialiased">

      {/* NAVBAR */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[1240px] h-[72px] z-50">
        <div className="w-full h-full backdrop-blur-[100px] bg-[#f7fbfc]/90 border border-[#e2eaf0] rounded-[22px] flex items-center justify-between pl-[16px] md:pl-[24px] pr-[12px] py-[12px] shadow-[0_4px_30px_rgba(0,0,0,0.03)] gap-4">
          <div className="flex items-center shrink-0">
            <Link href="/public" className="flex items-center gap-[9px]">
              <Image width={40} height={40} src="/assets/logo.png" alt="NOOI" className="w-[32px] md:w-[40px] h-auto object-contain" />
              <span className="font-inter font-bold text-[18px] md:text-[20px] text-[#111d27] tracking-tight">NOOI</span>
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-[32px]">
            {["Marketplace", "Home Planner", "Pricing", "About"].map((item) => (
              <Link
                key={item}
                href={item === "Marketplace" ? "/marketplace" : item === "Home Planner" ? "/homeplanner" : "#"}
                className={`text-[15px] font-medium transition-colors hover:text-[#004643] ${
                  item === "Home Planner" ? "text-[#004643] font-bold" : "text-[#555f6d]"
                }`}
              >
                {item}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden sm:flex h-[48px] px-6 items-center justify-center text-[15px] font-bold text-[#111d27] hover:bg-black/5 rounded-full transition-colors">
              Log in
            </button>
            <button className="h-[48px] px-6 bg-[#004643] text-white rounded-full font-bold text-[15px] hover:bg-[#003330] transition-all shadow-[0_10px_20px_rgba(0,70,67,0.1)]">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-[180px] pb-[100px] px-4 overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#8bec5c]/5 blur-[120px] rounded-full -z-10" />
        <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-[#004643]/5 blur-[120px] rounded-full -z-10" />

        <div className="max-w-[1240px] mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#f0f9ff] border border-[#bae6fd] rounded-full mb-8"
          >
            <Sparkles className="w-4 h-4 text-[#0ea5e9]" />
            <span className="text-[13px] font-bold text-[#0ea5e9] uppercase tracking-wider">AI Powered Design Studio</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[44px] sm:text-[64px] lg:text-[80px] font-bold text-[#111d27] leading-[1] mb-4 tracking-[-2px]"
          >
            AI Home Planner
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-[32px] sm:text-[48px] lg:text-[60px] font-instrument italic text-[#004643] leading-[1] mb-8"
          >
            Reimagine your living space.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-[720px] mx-auto text-[18px] md:text-[20px] text-[#555f6d] leading-[1.6] opacity-80 mb-12"
          >
            Create and visualize your perfect floor plan in minutes. From conceptual sketches to detailed 3D renderings, bring your vision to life with our intuitive toolset.
          </motion.p>

          {/* AI Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-[720px] mx-auto bg-white p-2 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-black/[0.03] flex items-center"
          >
            <div className="pl-6 pr-4 flex-1 flex items-center gap-3">
              <Search className="w-5 h-5 text-[#94a3b8]" />
              <input 
                type="text" 
                placeholder="Describe your dream room (e.g. 'Minimalist kitchen with oak islands')" 
                className="w-full h-full bg-transparent outline-none text-[16px] text-[#111d27] placeholder:text-[#94a3b8]"
              />
            </div>
            <button className="h-[52px] px-8 bg-[#004643] text-white rounded-[24px] font-bold text-[15px] hover:bg-[#003330] transition-all flex items-center gap-2">
              Start Design
              <Sparkles className="w-4 h-4 text-[#8bec5c]" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* PLANNING TOOLS SECTION */}
      <section className="py-[120px] px-4 bg-white">
        <div className="max-w-[1240px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[32px] md:text-[44px] font-bold text-[#111d27] mb-4 tracking-tight">Powerful Planning Tools</h2>
            <p className="text-[18px] text-[#555f6d] opacity-70">Everything you need to plan, design, and visualize your dream project.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "2D to 3D Conversion",
                desc: "Upload a blueprint or sketch and watch as our AI converts it into a fully navigable 3D model in seconds.",
                icon: <Box className="w-6 h-6 text-[#2563eb]" />,
                bg: "bg-[#eff6ff]",
                img: "/assets/furnitureCatalog.png"
              },
              {
                title: "Smart Furnishing",
                desc: "Automatically populate your space with curated furniture collections based on your style preferences and budget.",
                icon: <Maximize className="w-6 h-6 text-[#10b981]" />,
                bg: "bg-[#f0fdf4]",
                img: "/assets/Furniture 4 3.png"
              },
              {
                title: "AR Walkthrough",
                desc: "Experience your future home before building. Use augmented reality to walk through your space on any device.",
                icon: <Smartphone className="w-6 h-6 text-[#ea580c]" />,
                bg: "bg-[#fff7ed]",
                img: "/assets/imgImage10.png"
              }
            ].map((tool, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group bg-white rounded-[32px] p-8 border border-black/[0.03] shadow-sm hover:shadow-xl transition-all"
              >
                <div className={`w-12 h-12 ${tool.bg} rounded-2xl flex items-center justify-center mb-6`}>
                  {tool.icon}
                </div>
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

      {/* BLUEPRINT TO REALITY SECTION */}
      <section className="py-[120px] px-4 bg-[#F8FAFC]">
        <div className="max-w-[1240px] mx-auto bg-[#004643] rounded-[48px] overflow-hidden flex flex-col lg:flex-row items-center relative">
          {/* Decorative Glow */}
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#8bec5c]/10 blur-[120px] rounded-full pointer-events-none" />

          {/* Left: Content */}
          <div className="flex-1 p-10 lg:p-20 text-white relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full mb-8">
              <div className="w-1.5 h-1.5 bg-[#8bec5c] rounded-full" />
              <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest">Everything in one place</span>
            </div>
            <h2 className="text-[40px] md:text-[56px] font-bold leading-[1.1] mb-12 tracking-tight">From Blueprint to Reality</h2>
            
            <div className="space-y-10">
              {[
                { step: "01", title: "Design & Visualize", desc: "Create your perfect floor plan with our AI-assisted drafting tools." },
                { step: "02", title: "Select Furniture", desc: "Browse millions of products and place them in your space with one click." },
                { step: "03", title: "Order & Install", desc: "Order your entire room directly from the planner with consolidated delivery." }
              ].map((item, i) => (
                <div key={i} className="flex gap-6">
                  <span className="text-[24px] font-bold text-[#8bec5c] opacity-50">{item.step}</span>
                  <div>
                    <h4 className="text-[20px] font-bold mb-2">{item.title}</h4>
                    <p className="text-white/60 text-[15px] leading-relaxed max-w-[340px]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-16 h-[60px] px-10 bg-white text-[#004643] rounded-full font-bold text-[16px] hover:bg-[#8bec5c] transition-all flex items-center gap-3">
              Start Your Project
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Large Image */}
          <div className="flex-1 w-full h-[600px] lg:h-[800px] relative">
            <Image fill src="/assets/furnitureCatalog.png" alt="Interior" className="object-cover" />
            
            {/* Floating Product Badge */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="absolute top-[25%] right-[10%] bg-white/95 backdrop-blur-md p-4 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white flex items-center gap-4 z-20"
            >
              <div className="w-[60px] h-[60px] bg-[#f8fafc] rounded-[16px] flex items-center justify-center p-2">
                <Image width={60} height={60} src="/assets/seating.png" alt="Sofa" className="w-full h-full object-contain" />
              </div>
              <div className="pr-4">
                <p className="text-[14px] font-bold text-[#111d27] mb-0.5">Modern Sofa</p>
                <p className="text-[12px] text-[#555f6d] opacity-60 mb-2">Artic Furniture</p>
                <div className="flex items-center gap-3">
                  <span className="text-[14px] font-bold text-[#004643]">$1,240.00</span>
                  <button className="text-[11px] font-bold text-[#8bec5c] bg-[#004643] px-3 py-1 rounded-full uppercase tracking-wider">Sourcing</button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* POPULAR LAYOUTS SECTION */}
      <section className="py-[120px] px-4 bg-white">
        <div className="max-w-[1240px] mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
            <div className="text-left">
              <h2 className="text-[32px] md:text-[44px] font-bold text-[#111d27] mb-4 tracking-tight">Popular Layouts</h2>
              <p className="text-[18px] text-[#555f6d] opacity-70">Start with a template from our collection of professional floor plans.</p>
            </div>
            <button className="text-[15px] font-bold text-[#004643] flex items-center gap-2 hover:gap-3 transition-all">
              View all templates <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Urban Studio Apartment", tag: "New", price: "$1,200", img: "/assets/seating.png" },
              { title: "Modern Island Kitchen", tag: "Modern", price: "$850", img: "/assets/lighting.png" },
              { title: "Serene Master Suite", tag: "Bedroom", price: "$1,550", img: "/assets/tables.png" }
            ].map((layout, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group cursor-pointer bg-white rounded-[32px] p-4 border border-black/[0.03] shadow-sm hover:shadow-xl transition-all"
              >
                <div className="relative aspect-[4/3] rounded-[24px] overflow-hidden mb-6">
                  <Image fill src={layout.img} alt={layout.title} className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full">
                    <span className="text-[11px] font-bold text-[#111d27] uppercase tracking-wider">{layout.tag}</span>
                  </div>
                </div>
                <div className="px-2 pb-2">
                  <h4 className="text-[18px] font-bold text-[#111d27] mb-1">{layout.title}</h4>
                  <div className="flex justify-between items-center">
                    <p className="text-[14px] text-[#94a3b8]">Fully Furnished • 3D Ready</p>
                    <span className="text-[16px] font-bold text-[#004643]">{layout.price}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-[100px] md:py-[160px] px-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image fill src="/assets/furnitureCatalog.png" alt="" className="object-cover blur-[4px] brightness-[0.4]" />
        </div>
        
        <div className="max-w-[1240px] mx-auto text-center relative z-10">
          <h2 className="text-[40px] md:text-[64px] font-bold text-white mb-8 tracking-tight">Ready to redesign your space?</h2>
          <p className="max-w-[600px] mx-auto text-white/70 text-[18px] md:text-[20px] mb-12">
            Join thousands of interior designers and homeowners who use our AI to create their perfect environment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button className="h-[64px] px-10 bg-[#8bec5c] text-[#004643] rounded-full font-bold text-[16px] hover:scale-105 transition-all shadow-xl">
              Start Free Trial
            </button>
            <button className="h-[64px] px-10 border-2 border-white/30 text-white rounded-full font-bold text-[16px] hover:bg-white/10 transition-all flex items-center gap-3">
              <Play className="w-4 h-4 fill-white" />
              How it works
            </button>
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
                Subscribe to the nooi weekly and enjoy seven days of interior design news in one newsletter, with worldwide delivery.
              </p>
              <div className="relative max-w-[340px] mb-8">
                <input type="email" placeholder="Enter your email" className="w-full h-[52px] bg-white border border-[#e8eaec] rounded-[10px] px-5 outline-none focus:border-[#004643] transition-colors text-[14px] pr-[110px]" />
                <button className="absolute right-1.5 top-1.5 h-[40px] bg-[#004643] text-white px-6 rounded-[8px] text-[13px] font-bold hover:bg-[#003330] transition-colors">Subscribe</button>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
                  <div className="w-5 h-5 flex items-center justify-center border border-black rounded p-0.5"><Image width={16} height={16} src="/assets/windows.svg" alt="" className="w-full h-full grayscale" /></div>
                  <span className="text-[12px] font-bold">Nooi Windows App</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
                  <div className="w-5 h-5 flex items-center justify-center border border-black rounded p-0.5"><Image width={16} height={16} src="/assets/apple.svg" alt="" className="w-full h-full grayscale" /></div>
                  <span className="text-[12px] font-bold">Nooi Mac App</span>
                </div>
              </div>
            </div>

            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-6 tracking-tight uppercase">Product</h5>
              <ul className="space-y-4 text-[14px] text-[#6b7280] font-schibsted">
                {["Floor planner", "Interior design", "Kitchen & Closet Design", "3D Viewer", "Custom Furniture"].map((l) => (
                  <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors opacity-80">{l}</li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-6 tracking-tight uppercase">Company</h5>
              <ul className="space-y-4 text-[14px] text-[#6b7280] font-schibsted">
                {["About Us", "Contact us", "Affiliate program", "Careers"].map((l) => (
                  <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors opacity-80">{l}</li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-6 tracking-tight uppercase">Resources</h5>
              <ul className="space-y-4 text-[14px] text-[#6b7280] font-schibsted">
                {["Home Design Ideas", "Tutorial", "Help center", "Nooi app"].map((l) => (
                  <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors opacity-80">{l}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#f0f0f0] flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-[#9ca3af] text-[12px] font-schibsted">2026 Nooi, Inc. All Rights Reserved.</p>
            <div className="flex items-center gap-8 text-[12px] text-[#9ca3af] font-schibsted">
              <span className="hover:text-[#111d27] cursor-pointer">Terms & Conditions</span>
              <span className="hover:text-[#111d27] cursor-pointer">Privacy Policy</span>
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
              <div className="flex items-center gap-1.5 text-[#9ca3af] text-[12px] font-bold cursor-pointer hover:text-neutral-700 transition-colors">
                <Globe className="w-4 h-4" />
                <span>English</span>
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
