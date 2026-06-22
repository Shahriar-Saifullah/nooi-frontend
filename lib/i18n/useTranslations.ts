"use client";

import { useLanguageStore } from "@/lib/store";
import { homeTranslations, aboutTranslations, marketplaceTranslations, homePlannerTranslations, designStudioTranslations } from "./translations";

// Small accessor hook — components call useHomeTranslations() and read
// t.hero.headlineLine1 etc., already resolved to the active language string.
// This intentionally stays simple (no key-path string parsing, no ICU
// message format) since the dictionary is still small; revisit if it grows
// enough to need a more general-purpose i18n library.

type DeepResolve<T> = T extends { en: string; ar: string }
  ? string
  : { [K in keyof T]: DeepResolve<T[K]> };

function resolve<T>(node: T, lang: "en" | "ar"): DeepResolve<T> {
  if (node && typeof node === "object" && "en" in node && "ar" in node) {
    return (node as any)[lang];
  }
  if (node && typeof node === "object") {
    const result: any = {};
    for (const key in node) {
      result[key] = resolve((node as any)[key], lang);
    }
    return result;
  }
  return node as any;
}

export function useHomeTranslations() {
  const language = useLanguageStore((s) => s.language);
  return resolve(homeTranslations, language);
}

export function useAboutTranslations() {
  const language = useLanguageStore((s) => s.language);
  return resolve(aboutTranslations, language);
}

export function useMarketplaceTranslations() {
  const language = useLanguageStore((s) => s.language);
  return resolve(marketplaceTranslations, language);
}

export function useHomePlannerTranslations() {
  const language = useLanguageStore((s) => s.language);
  return resolve(homePlannerTranslations, language);
}

export function useDesignStudioTranslations() {
  const language = useLanguageStore((s) => s.language);
  return resolve(designStudioTranslations, language);
}

export function useLanguage() {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const toggleLanguage = useLanguageStore((s) => s.toggleLanguage);
  return { language, setLanguage, toggleLanguage, isRtl: language === "ar" };
}