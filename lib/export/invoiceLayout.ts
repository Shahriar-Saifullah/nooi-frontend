/**
 * Invoice page breaks and totals — pure, so the tests can check them.
 * Used by invoicePdf.ts.
 */

/** Item rows that fit on a page, and on the last page (which also has totals). */
export const ROWS_PER_PAGE = 14;
export const ROWS_WITH_TOTALS = 8;

export function invoicePages(lines: number): { from: number; to: number }[] {
  const pages: { from: number; to: number }[] = [];
  let at = 0;
  while (lines - at > ROWS_WITH_TOTALS) {
    const take = Math.min(ROWS_PER_PAGE, lines - at);
    pages.push({ from: at, to: at + take });
    at += take;
  }
  pages.push({ from: at, to: lines });
  return pages;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function invoiceTotals(inv: { subtotal: number; discount: number; shipping: number; vat_amount: number; total: number; vat_rate: number }) {
  const subtotal = Number(inv.subtotal) || 0;
  const discount = Number(inv.discount) || 0;
  const shipping = Number(inv.shipping) || 0;
  return {
    subtotal,
    discount,
    shipping,
    taxable: r2(subtotal - discount + shipping),
    vat: Number(inv.vat_amount) || 0,
    vatRate: Number(inv.vat_rate) || 15,
    total: Number(inv.total) || 0,
  };
}
