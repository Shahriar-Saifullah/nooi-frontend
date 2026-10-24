/**
 * Money on screen — lib/money.ts
 * One formatter for every price, so a currency switch (USD → SAR) is one
 * place rather than a hunt for hard-coded "$".
 */

export const DEFAULT_CURRENCY =
  (process.env.NEXT_PUBLIC_CURRENCY ||
    (process.env.NEXT_PUBLIC_PAYMENT_PROVIDER === "moyasar" ? "SAR" : "USD")).toUpperCase();

const SYMBOLS: Record<string, { en: string; ar: string }> = {
  SAR: { en: "SAR ", ar: "ر.س " },
  USD: { en: "$", ar: "$" },
  AED: { en: "AED ", ar: "د.إ " },
};

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function formatMoney(
  value: number | string | null | undefined,
  currency: string = DEFAULT_CURRENCY,
  arabic = false,
): string {
  const n = Number(value || 0);
  const sym = SYMBOLS[currency.toUpperCase()] ?? { en: `${currency.toUpperCase()} `, ar: `${currency.toUpperCase()} ` };
  const body = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const s = `${n < 0 ? "−" : ""}${arabic ? sym.ar : sym.en}${body}`;
  return arabic ? s.replace(/[0-9]/g, d => AR_DIGITS[+d]) : s;
}
