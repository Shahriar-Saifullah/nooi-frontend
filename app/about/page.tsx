"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { useAboutTranslations, useLanguage, useHomeTranslations } from "@/lib/i18n/useTranslations";

function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  const t = useHomeTranslations();
  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 text-[#9ca3af] text-[12px] font-medium cursor-pointer hover:text-neutral-700 transition-colors"
    >
      <Image width={14} height={14} src="/assets/language-circle.svg" alt="" className="w-[14px] h-[14px]" />
      <span>{t.footer.language}</span>
      <span className="text-[10px] opacity-60">({language === "en" ? "AR" : "EN"})</span>
    </button>
  );
}

export default function AboutPage() {
  const t = useAboutTranslations();
  const tf = useHomeTranslations(); // for shared footer strings
  const { language } = useLanguage();

  const stats = [
    { value: "50k+", label: t.stats.projects },
    { value: "120+", label: t.stats.countries },
    { value: "2M+",  label: t.stats.delivery },
    { value: "98%",  label: t.stats.satisfaction },
  ];

  const team = [
    { ...t.team.members.alex,   bg: "#E8A87C", img: "/assets/CEO.png",        nameColor: "#004643", roleColor: "#004643" },
    { ...t.team.members.sarah,  bg: "#4A7C6F", img: "/assets/CTO.png",        nameColor: "#004643", roleColor: "#004643" },
    { ...t.team.members.marcus, bg: "#C49A6C", img: "/assets/designHead.png", nameColor: "#004643", roleColor: "#004643" },
  ];

  const features = [
    { icon: "/assets/stars.svg",           title: t.values.items.innovation.title,   desc: t.values.items.innovation.desc },
    { icon: "/assets/design-services.svg", title: t.values.items.userCentric.title,  desc: t.values.items.userCentric.desc },
    { icon: "/assets/verified-user.svg",   title: t.values.items.sustainability.title,desc: t.values.items.sustainability.desc },
  ];

  return (
    <div className="relative min-h-screen bg-white font-schibsted overflow-x-hidden">

      <Navbar />

      {/* HERO */}
      <section className="relative pt-[140px] pb-[80px] px-4 bg-[#eef2f7] flex flex-col items-center">
        <div className="max-w-[1240px] w-full mx-auto flex flex-col items-center gap-[40px]">
          <div className="bg-white border border-[#e2eaf0] rounded-full px-[14px] py-[7px] flex items-center gap-[8px]">
            <div className="w-[7px] h-[7px] rounded-full bg-[#8bec5c]" />
            <span className="font-schibsted font-medium text-[13px] text-[#555f6d]">{t.hero.eyebrow}</span>
          </div>

          <div className="flex flex-col items-center text-center gap-0">
            <h1 className="font-schibsted font-bold text-[56px] sm:text-[64px] lg:text-[72px] leading-[1.08] text-[#004643] text-center" style={{ letterSpacing: "0px" }}>
              {t.hero.headlineLine1}
            </h1>
            <p
              className={`italic font-normal text-[56px] sm:text-[64px] lg:text-[72px] text-[#004643] text-center`}
              style={{
                lineHeight: "72px",
                letterSpacing: "0px",
                fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                fontStyle: "italic",
                fontWeight: 400,
              }}
            >
              {t.hero.headlineLine2}
            </p>
          </div>

          <p className="font-schibsted font-normal text-[17px] sm:text-[19px] leading-[1.65] text-[#555f6d] max-w-[560px] text-center">
            {t.hero.subtext}
          </p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="w-full max-w-[1100px] relative rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.12)]"
            style={{ aspectRatio: "16/7" }}
          >
            <Image fill src="/assets/office.png" alt="Design Innovation Center" className="object-cover" priority />
            <Image fill src="/assets/gradient.png" alt="" className="object-cover" />
            <div className="absolute bottom-[28px] left-[32px] flex flex-col gap-[4px]">
              <span className="text-white/60 text-[11px] font-medium font-schibsted uppercase tracking-[2px]">{t.hero.hqLabel}</span>
              <span className="text-white text-[18px] font-bold font-schibsted leading-tight">{t.hero.hqName}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FROM SKETCH TO SANCTUARY */}
      <section className="py-[80px] px-4 bg-white">
        <div className="max-w-[1240px] mx-auto flex flex-col lg:flex-row gap-[60px] lg:gap-[80px] items-start">
          <div className="w-full lg:w-[540px] shrink-0">
            <h2 className="font-schibsted font-bold text-[36px] sm:text-[42px] lg:text-[48px] leading-[1.1] text-[#004643] mb-8 tracking-[-1px]">
              {language === "ar" ? t.founding.heading : (
                <>
                  From Sketch to{" "}
                  <span style={{ fontFamily: "var(--font-instrument), 'Instrument Serif', Georgia, serif", fontStyle: "italic", fontWeight: 400, letterSpacing: "0.3px", color: "#004643" }}>
                    Sanctuary.
                  </span>
                </>
              )}
            </h2>
            <p className="text-[16px] text-[#555f6d] leading-[1.7] mb-6">{t.founding.body1}</p>
            <p className="text-[16px] text-[#555f6d] leading-[1.7] mb-12">{t.founding.body2}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: "/assets/arrows-output.svg", label: t.founding.missionLabel, desc: t.founding.missionDesc },
                { icon: "/assets/verified-user.svg", label: t.founding.visionLabel,  desc: t.founding.visionDesc },
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

          <div className="flex-1 w-full lg:max-w-[540px] flex gap-[16px] mt-10 lg:mt-[70px]">
            <div className="flex-1 flex flex-col gap-[16px]">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative rounded-[20px] overflow-hidden w-full h-[280px] shadow-lg">
                <Image fill src="/assets/imgImage2.png" alt="" className="object-cover hover:scale-105 transition-transform duration-700" />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="relative rounded-[20px] overflow-hidden w-full h-[200px] shadow-lg">
                <Image fill src="/assets/imgImage6.png" alt="" className="object-cover hover:scale-105 transition-transform duration-700" />
              </motion.div>
            </div>
            <div className="flex-1 flex flex-col gap-[16px]">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="relative rounded-[20px] overflow-hidden w-full h-[220px] shadow-lg">
                <Image fill src="/assets/imgImage3.png" alt="" className="object-cover hover:scale-105 transition-transform duration-700" />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="relative rounded-[20px] overflow-hidden w-full h-[260px] shadow-lg">
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
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex flex-col items-center text-center">
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
            <p className="text-[14px] font-semibold text-[#004643] uppercase tracking-[2.5px] mb-4 font-schibsted">{t.team.eyebrow}</p>
            <h2 className="font-schibsted font-bold text-[40px] sm:text-[48px] lg:text-[56px] leading-[1.1] text-[#111d27] tracking-[-1.5px]">
              {language === "ar" ? t.team.heading : (
                <>Meet the <span className="font-instrument italic font-normal text-[#004643]">Innovators.</span></>
              )}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.15 }} whileHover={{ y: -10 }} className="group rounded-[32px] overflow-hidden bg-white border border-[#e8edf2] shadow-[0_10px_40px_rgba(0,0,0,0.04)] flex flex-col transition-all duration-500 hover:shadow-[0_20px_60px_rgba(0,0,0,0.1)]">
                <div className="relative flex items-end justify-center h-[320px] overflow-hidden" style={{ backgroundColor: member.bg }}>
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-[400px] h-[360px] transform group-hover:scale-105 transition-transform duration-700">
                    <Image fill src={member.img} alt={member.name} className="object-cover object-top" />
                  </div>
                </div>
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

      {/* VALUES */}
      <section className="py-[80px] lg:py-[100px] px-4 bg-white">
        <div className="max-w-[1240px] mx-auto">
          <div className="text-center mb-[60px]">
            <h2 className="font-schibsted font-semibold text-[40px] sm:text-[48px] leading-[1.15] text-[#111d27] tracking-[-1.5px] mb-4">{t.values.heading}</h2>
            <p className="text-[18px] text-[#555f6d] max-w-[600px] mx-auto leading-[1.65]">{t.values.subtext}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} className="bg-[#f8fafc] rounded-[24px] border border-[#e8edf2] p-[32px] flex flex-col gap-5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-shadow">
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
            {t.cta.heading}
          </h2>
          <p className="text-[17px] text-white/60 max-w-[520px] leading-[1.65]">{t.cta.subtext}</p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link href="/authpage/signup" className="bg-[#8bec5c] text-[#142d26] px-8 py-4 rounded-full text-[15px] font-bold hover:bg-[#a3f37e] transition-colors shadow-xl shadow-[#8bec5c]/20 whitespace-nowrap flex items-center gap-3">
              {t.cta.getFree}
              <div className="bg-[#142d26]/20 rounded-full w-6 h-6 flex items-center justify-center">
                <Image width={14} height={14} src="/assets/arrow-right-02-sharp.svg" alt="" className={`w-[14px] h-[14px]`} />
              </div>
            </Link>
            <button className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-full text-[15px] font-bold hover:bg-white/20 transition-colors whitespace-nowrap">
              {t.cta.demo}
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
              <p className="text-[#6b7280] mb-7 text-[14px] sm:text-[15px] leading-relaxed max-w-[320px]">{tf.footer.tagline}</p>
              <div className="relative max-w-[340px] mb-7">
                <input type="email" placeholder={tf.footer.emailPlaceholder} className="w-full h-[48px] bg-white border border-[#e8eaec] rounded-full px-5 outline-none focus:border-[#004643]/30 transition-colors text-[13px] pr-[110px] placeholder:text-[#9ca3af]" />
                <button className="absolute right-1.5 top-1.5 h-[36px] bg-[#004643] text-white px-5 rounded-full text-[12px] font-bold hover:bg-[#003330] transition-colors">{tf.footer.subscribe}</button>
              </div>
              <div className="flex items-center gap-4">
                <Image width={18} height={18} src="/assets/windows.svg" alt="Windows" className="w-[18px] h-[18px] opacity-30 hover:opacity-70 transition-opacity cursor-pointer" />
                <Image width={18} height={18} src="/assets/apple.svg" alt="Mac" className="w-[18px] h-[18px] opacity-30 hover:opacity-70 transition-opacity cursor-pointer" />
              </div>
            </div>
            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-5 tracking-tight">{tf.footer.productHeading}</h5>
              <ul className="space-y-3.5 text-[14px] text-[#6b7280]">
                {[tf.footer.productLinks.roomPlanner, tf.footer.productLinks.aiHomePlanner, tf.footer.productLinks.kitchenPlanner, tf.footer.productLinks.pricing].map((l) => (
                  <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors">{l}</li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-5 tracking-tight">{tf.footer.companyHeading}</h5>
              <ul className="space-y-3.5 text-[14px] text-[#6b7280]">
                {[tf.footer.companyLinks.aboutUs, tf.footer.companyLinks.blog, tf.footer.companyLinks.careers, tf.footer.companyLinks.privacy].map((l) => (
                  <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors">{l}</li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-[14px] font-bold text-[#111D27] mb-5 tracking-tight">{tf.footer.resourcesHeading}</h5>
              <ul className="space-y-3.5 text-[14px] text-[#6b7280]">
                {[tf.footer.resourcesLinks.documentation, tf.footer.resourcesLinks.community, tf.footer.resourcesLinks.support, tf.footer.resourcesLinks.blog].map((l) => (
                  <li key={l} className="hover:text-[#004643] cursor-pointer transition-colors">{l}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-[#f0f0f0] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[#9ca3af] text-[12px]">{tf.footer.legal}</p>
            <div className="flex items-center gap-6">
              <LanguageToggle />
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