/**
 * Countries Nooi sells and ships to — ISO 3166-1 alpha-2.
 * Same list as the backend's src/services/countries.ts.
 */

export const COUNTRIES: Record<string, { en: string; ar: string }> = {
  SA: { en: "Saudi Arabia", ar: "السعودية" },
  AE: { en: "United Arab Emirates", ar: "الإمارات" },
  KW: { en: "Kuwait", ar: "الكويت" },
  QA: { en: "Qatar", ar: "قطر" },
  BH: { en: "Bahrain", ar: "البحرين" },
  OM: { en: "Oman", ar: "عُمان" },
  JO: { en: "Jordan", ar: "الأردن" },
  EG: { en: "Egypt", ar: "مصر" },
  TR: { en: "Turkey", ar: "تركيا" },
  IT: { en: "Italy", ar: "إيطاليا" },
  CN: { en: "China", ar: "الصين" },
  IN: { en: "India", ar: "الهند" },
  MY: { en: "Malaysia", ar: "ماليزيا" },
  ID: { en: "Indonesia", ar: "إندونيسيا" },
  VN: { en: "Vietnam", ar: "فيتنام" },
  DE: { en: "Germany", ar: "ألمانيا" },
  ES: { en: "Spain", ar: "إسبانيا" },
  PT: { en: "Portugal", ar: "البرتغال" },
  GB: { en: "United Kingdom", ar: "المملكة المتحدة" },
  US: { en: "United States", ar: "الولايات المتحدة" },
  DK: { en: "Denmark", ar: "الدنمارك" },
  BD: { en: "Bangladesh", ar: "بنغلاديش" },
};

/** Where Nooi delivers today — the "ships to" choices. */
export const SHIP_TO_CHOICES = ["SA", "AE", "KW", "QA", "BH", "OM"] as const;

export const GCC = new Set<string>(SHIP_TO_CHOICES);

export function countryName(code: string | null | undefined, lang: "en" | "ar" = "en"): string {
  if (!code) return "";
  return COUNTRIES[code]?.[lang] ?? code;
}

export const isCountry = (c: unknown): c is string => typeof c === "string" && c in COUNTRIES;
