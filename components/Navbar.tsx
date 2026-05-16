"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
    const [productsOpen, setProductsOpen] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-dropdown]')) {
                setProductsOpen(false);
                setAboutOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[1240px] h-[72px] z-50">
            <div className="w-full h-full backdrop-blur-[100px] bg-[#f7fbfc]/90 border border-[#e2eaf0] rounded-[22px] flex items-center justify-between pl-[16px] md:pl-[24px] pr-[12px] py-[12px] shadow-[0_4px_30px_rgba(0,0,0,0.03)] gap-4">

                {/* Logo */}
                <div className="flex items-center shrink-0">
                    <Link href="/" className="flex items-center gap-[9px]">
                        <Image width={100} height={100} src="/assets/logo.png" alt="NOOI" className="w-[32px] md:w-[40px] h-auto object-contain" />
                        <span className="font-inter font-bold text-[18px] md:text-[20px] text-[#111d27] tracking-tight">NOOI</span>
                    </Link>
                </div>

                {/* Nav */}
                <div className="hidden md:flex items-center gap-[11px] flex-1 justify-center whitespace-nowrap">

                    {/* Products dropdown */}
                    <div className="relative" data-dropdown>
                        <button
                            className="flex items-center gap-[3px] px-[10px] py-[4px] opacity-80 hover:opacity-100 transition-opacity"
                            onClick={() => { setProductsOpen(!productsOpen); setAboutOpen(false); }}
                        >
                            <span className="font-schibsted font-normal text-[#003230] text-[14px]">Products</span>
                            <Image
                                width={100} height={100}
                                src="/assets/arrow-down.svg" alt=""
                                className={`w-[20px] h-[20px] opacity-60 transition-transform ${productsOpen ? "rotate-180" : ""}`}
                            />
                        </button>
                        <AnimatePresence>
                            {productsOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 bg-white border border-[#e2eaf0] rounded-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.08)] py-2 min-w-[180px] z-50"
                                >
                                    {[
                                        { label: "Furniture", href: "/marketplace" },
                                        { label: "Home Planner", href: "/homeplanner" },
                                        { label: "Design Studio", href: "/design-studio" },
                                    ].map((item) => (
                                        <Link
                                            key={item.label}
                                            href={item.href}
                                            onClick={() => setProductsOpen(false)}
                                            className="block px-5 py-2.5 text-[14px] text-[#003230] font-schibsted hover:bg-[#f7fbfc] transition-colors"
                                        >
                                            {item.label}
                                        </Link>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* About dropdown */}
                    <div className="relative" data-dropdown>
                        <button
                            className="flex items-center gap-[3px] px-[10px] py-[4px] opacity-80 hover:opacity-100 transition-opacity"
                            onClick={() => { setAboutOpen(!aboutOpen); setProductsOpen(false); }}
                        >
                            <span className="font-schibsted font-normal text-[#003230] text-[14px]">About</span>
                            <Image
                                width={100} height={100}
                                src="/assets/arrow-down.svg" alt=""
                                className={`w-[20px] h-[20px] opacity-60 transition-transform ${aboutOpen ? "rotate-180" : ""}`}
                            />
                        </button>
                        <AnimatePresence>
                            {aboutOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 bg-white border border-[#e2eaf0] rounded-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.08)] py-2 min-w-[180px] z-50"
                                >
                                    {[
                                        { label: "About Us", href: "/about" },
                                        { label: "How it Works", href: "/how-it-works" },
                                    ].map((item) => (
                                        <Link
                                            key={item.label}
                                            href={item.href}
                                            onClick={() => setAboutOpen(false)}
                                            className="block px-5 py-2.5 text-[14px] text-[#003230] font-schibsted hover:bg-[#f7fbfc] transition-colors"
                                        >
                                            {item.label}
                                        </Link>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <button className="px-[10px] py-[4px] opacity-80 hover:opacity-100 transition-opacity">
                        <span className="font-schibsted font-normal text-[#003230] text-[14px]">Pricing</span>
                    </button>
                </div>

                {/* Actions & Hamburger */}
                <div className="flex items-center gap-[8px] justify-end shrink-0">
                    <button className="relative hidden lg:flex w-[46px] h-[46px] items-center justify-center hover:bg-black/5 rounded-full transition-colors shrink-0">
                        <Image fill src="/assets/container-svg.svg" alt="Help" className="" />
                    </button>
                    <div className="flex items-center gap-[2px] md:gap-[4px] h-[40px] md:h-[46px] bg-white border border-[#e6e6e8] p-[2px] md:p-[4px] rounded-[10px] md:rounded-[12px] flex-nowrap shrink-0">
                        <Link
                            href="/authpage/signin"
                            className="h-full px-4 md:px-[16px] flex items-center justify-center bg-[#f8f8f8] rounded-[6px] md:rounded-[8px] text-[#272e35] text-[13px] md:text-[16px] font-schibsted font-medium hover:bg-neutral-100 transition-colors whitespace-nowrap"
                        >
                            Log in
                        </Link>
                        <Link
                            href="/authpage/signup"
                            className="hidden md:flex h-full px-3 md:px-[16px] items-center justify-center bg-[#004643] rounded-[7px] md:rounded-[9px] text-white text-[13px] md:text-[16px] font-schibsted font-medium hover:bg-[#003330] transition-colors shadow-sm whitespace-nowrap"
                        >
                            Start for free
                        </Link>
                    </div>
                    <button
                        className="md:hidden w-[40px] h-[40px] flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg hover:bg-black/5 ml-1"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <div className={`w-6 h-0.5 bg-[#111d27] transition-all ${isMenuOpen ? "rotate-45 translate-y-2" : ""}`} />
                        <div className={`w-6 h-0.5 bg-[#111d27] transition-all ${isMenuOpen ? "opacity-0" : ""}`} />
                        <div className={`w-6 h-0.5 bg-[#111d27] transition-all ${isMenuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
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
                            <Image width={100} height={100} src="/assets/arrow-down.svg" alt="" className="w-6 h-6 -rotate-90 opacity-40" />
                        </button>
                        <button className="flex items-center justify-between p-2 hover:bg-black/5 rounded-lg">
                            <span className="font-schibsted text-[16px] text-[#003230] font-medium">About</span>
                            <Image width={100} height={100} src="/assets/arrow-down.svg" alt="" className="w-6 h-6 -rotate-90 opacity-40" />
                        </button>
                        <button className="p-2 text-left hover:bg-black/5 rounded-lg font-schibsted text-[16px] text-[#003230] font-medium">
                            Pricing
                        </button>
                        <div className="h-px w-full bg-black/5 my-2" />
                        <Link
                            href="/authpage/signup"
                            className="w-full py-3 flex items-center justify-center bg-[#004643] rounded-[10px] text-white text-[16px] font-schibsted font-medium hover:bg-[#003330] transition-colors shadow-sm"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Start for free
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}