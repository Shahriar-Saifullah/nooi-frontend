/**
 * Listing extras — lib/listings/extras.ts
 * ============================================================================
 * What a vendor adds to a listing beyond title/price/photos (client feedback,
 * round 1):
 *
 *   categories    every shop group it should appear under (a storage bench is
 *                 Seating AND Storage). The main category decides its 3D type;
 *                 the rest are extra places shoppers find it.
 *   certificates  quality / safety / origin certificates (SASO, ISO, FSC …)
 *   patents       registered designs or patents
 *   origin        made in Saudi Arabia, or imported (and from where)
 *   ships_to      the countries it can be delivered to
 *
 * Pure: the vendor form, the listings API route and the tests share it, so
 * what the form allows and what the server stores can't drift apart.
 */

import { COUNTRIES, isCountry } from "./countries";

/** Marketplace chips — furniture_types.shop_group values. */
export const SHOP_GROUPS = [
  "Seating", "Tables", "Storage", "Beds", "Lighting", "Decor", "Outdoor", "Bath", "Kitchen",
] as const;
export type ShopGroup = (typeof SHOP_GROUPS)[number];

/** The vendor form's main-category dropdown → its shop group. */
export const VENDOR_CATEGORY_GROUP: Record<string, ShopGroup> = {
  sofas: "Seating",
  chairs: "Seating",
  tables: "Tables",
  storage: "Storage",
  rugs: "Decor",
  "décor accents": "Decor",
  decor: "Decor",
};

export function groupOfVendorCategory(cat: string | null | undefined): ShopGroup | null {
  const k = String(cat ?? "").toLowerCase().trim();
  for (const [key, g] of Object.entries(VENDOR_CATEGORY_GROUP)) if (k.includes(key)) return g;
  return null;
}

export interface Certificate {
  name: string;
  issuer?: string;
  number?: string;
  url?: string;
  /** YYYY-MM-DD */
  expires?: string;
  /** Form-only: upload in progress. Never stored. */
  uploading?: boolean;
}

export interface Patent {
  number: string;
  country?: string;
  title?: string;
  url?: string;
}

export type Origin = "saudi" | "international";

export interface ListingExtras {
  categories: string[];
  certificates: Certificate[];
  patents: Patent[];
  origin: Origin;
  origin_country: string;
  ships_to: string[];
}

export const EMPTY_EXTRAS: ListingExtras = {
  categories: [],
  certificates: [],
  patents: [],
  origin: "saudi",
  origin_country: "SA",
  ships_to: ["SA"],
};

export const MAX_CERTIFICATES = 10;
export const MAX_PATENTS = 5;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const httpsUrl = (v: unknown) => {
  const s = str(v, 600);
  return /^https:\/\/[^\s]+$/i.test(s) ? s : "";
};
const isoDate = (v: unknown) => {
  const s = str(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : "";
};
const drop = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null)) as T;

/** Main category's group first, then the extras, known groups only, no repeats. */
export function cleanCategories(mainCategory: string | null | undefined, extra: unknown): string[] {
  const out: string[] = [];
  const main = groupOfVendorCategory(mainCategory);
  if (main) out.push(main);
  if (Array.isArray(extra)) {
    for (const g of extra) {
      if (typeof g === "string" && (SHOP_GROUPS as readonly string[]).includes(g) && !out.includes(g)) out.push(g);
    }
  }
  return out;
}

export function cleanCertificates(raw: unknown): Certificate[] {
  if (!Array.isArray(raw)) return [];
  const out: Certificate[] = [];
  for (const r of raw) {
    const c = (r ?? {}) as Record<string, unknown>;
    const name = str(c.name, 80);
    if (!name) continue;
    out.push(drop({ name, issuer: str(c.issuer, 80), number: str(c.number, 60), url: httpsUrl(c.url), expires: isoDate(c.expires) }));
    if (out.length >= MAX_CERTIFICATES) break;
  }
  return out;
}

export function cleanPatents(raw: unknown): Patent[] {
  if (!Array.isArray(raw)) return [];
  const out: Patent[] = [];
  for (const r of raw) {
    const p = (r ?? {}) as Record<string, unknown>;
    const number = str(p.number, 60);
    if (!number) continue;
    const country = str(p.country, 2).toUpperCase();
    out.push(drop({ number, country: isCountry(country) ? country : "", title: str(p.title, 120), url: httpsUrl(p.url) }));
    if (out.length >= MAX_PATENTS) break;
  }
  return out;
}

export function cleanOrigin(origin: unknown, country: unknown): { origin: Origin; origin_country: string } {
  if (origin === "international") {
    const c = str(country, 2).toUpperCase();
    return { origin: "international", origin_country: isCountry(c) && c !== "SA" ? c : "" };
  }
  return { origin: "saudi", origin_country: "SA" };
}

/** Known country codes, Saudi Arabia when none are given. */
export function cleanShipsTo(raw: unknown): string[] {
  const out = Array.isArray(raw)
    ? [...new Set(raw.map(c => String(c ?? "").trim().toUpperCase()).filter(c => c in COUNTRIES))]
    : [];
  return out.length ? out : ["SA"];
}

/** Everything at once — what the listings route stores. */
export function cleanExtras(mainCategory: string | null | undefined, raw: unknown) {
  const b = (raw ?? {}) as Record<string, unknown>;
  return {
    categories: cleanCategories(mainCategory, b.categories),
    certificates: cleanCertificates(b.certificates),
    patents: cleanPatents(b.patents),
    ...cleanOrigin(b.origin, b.origin_country),
    ships_to: cleanShipsTo(b.ships_to),
  };
}

/** Form-side checks with messages a vendor can act on; null when fine. */
export function extrasProblem(x: ListingExtras): string | null {
  if (x.origin === "international" && !x.origin_country) return "Choose the country it's made in.";
  if (!x.ships_to.length) return "Choose at least one country it ships to.";
  const half = x.certificates.find(c => !c.name.trim() && (c.url || c.number));
  if (half) return "Give every certificate a name.";
  if (x.certificates.some(c => c.uploading)) return "Wait for the certificate upload to finish.";
  const halfP = x.patents.find(p => !p.number.trim() && (p.title || p.url));
  if (halfP) return "Give every patent its number.";
  return null;
}

