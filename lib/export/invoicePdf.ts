/**
 * Tax invoice → PDF — lib/export/invoicePdf.ts
 * ============================================================================
 * Saudi invoices have to carry Arabic, and jsPDF's built-in fonts can't draw
 * it. So each page is drawn on a canvas (the browser shapes Arabic properly)
 * and placed into the PDF as an image. Bilingual labels, Nooi as seller, the
 * ZATCA QR code top right.
 *
 * jsPDF and qrcode load on demand — only when someone downloads an invoice.
 */

import type { Invoice } from "@/lib/api/documents";
import { invoicePages, invoiceTotals } from "./invoiceLayout";

const W = 1240;           // A4 at 150 dpi
const H = 1754;
const M = 80;             // margin
const BRAND = "#004643";
const INK = "#1f2421";
const MUTED = "#6b7170";
const LINE = "#e3e3e0";
const BAND = "#eef3ef";

const LATIN = "Helvetica, Arial, sans-serif";
const ARABIC = "'Noto Sans Arabic', 'Geeza Pro', Tahoma, Arial, sans-serif";

const money = (n: number) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const stamp = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" });

function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, o: { size?: number; bold?: boolean; color?: string; align?: CanvasTextAlign; ar?: boolean; max?: number } = {}) {
  g.font = `${o.bold ? "600 " : ""}${o.size ?? 20}px ${o.ar ? ARABIC : LATIN}`;
  g.fillStyle = o.color ?? INK;
  g.textAlign = o.align ?? "left";
  g.direction = o.ar ? "rtl" : "ltr";
  let out = s;
  if (o.max && g.measureText(out).width > o.max) {
    while (out.length > 1 && g.measureText(out + "…").width > o.max) out = out.slice(0, -1);
    out += "…";
  }
  g.fillText(out, x, y);
}

/** English label with its Arabic under it (or beside it, right-aligned). */
function label(g: CanvasRenderingContext2D, en: string, ar: string, x: number, y: number, align: CanvasTextAlign = "left") {
  text(g, en, x, y, { size: 15, color: MUTED, align });
  text(g, ar, x, y + 20, { size: 15, color: MUTED, align, ar: true });
}

/** "VAT no. 3101…" followed by its Arabic label. */
function pair(g: CanvasRenderingContext2D, en: string, ar: string, x: number, y: number) {
  text(g, en, x, y, { size: 18 });
  const w = g.measureText(en).width;
  text(g, ar, x + w + 14, y, { size: 15, color: MUTED, ar: true });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const COLS = [
  { en: "#", ar: "م", x: M, w: 40, align: "left" as const },
  { en: "Item", ar: "الصنف", x: M + 50, w: 520, align: "left" as const },
  { en: "Qty", ar: "الكمية", x: M + 690, w: 70, align: "right" as const },
  { en: "Unit price", ar: "سعر الوحدة", x: M + 870, w: 160, align: "right" as const },
  { en: "Total excl. VAT", ar: "الإجمالي بدون الضريبة", x: W - M, w: 180, align: "right" as const },
];

function drawPage(g: CanvasRenderingContext2D, inv: Invoice, qr: HTMLImageElement | null, rows: Invoice["lines"], firstIndex: number, page: number, pages: number, last: boolean) {
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, W, H);

  // Header
  text(g, "Nooi", M, M + 34, { size: 40, bold: true, color: BRAND });
  text(g, "Simplified Tax Invoice", W - M - 190, M + 22, { size: 26, bold: true, align: "right" });
  text(g, "فاتورة ضريبية مبسطة", W - M - 190, M + 56, { size: 24, bold: true, align: "right", ar: true });
  if (qr) g.drawImage(qr, W - M - 170, M - 10, 170, 170);

  // Seller
  let y = M + 110;
  label(g, "Seller", "البائع", M, y);
  text(g, inv.seller.legal_name, M, y + 52, { size: 21, bold: true, max: 640 });
  pair(g, `VAT no. ${inv.seller.vat_number}`, "الرقم الضريبي", M, y + 80);
  if (inv.seller.cr_number) pair(g, `CR no. ${inv.seller.cr_number}`, "السجل التجاري", M, y + 106);
  if (inv.seller.address) text(g, inv.seller.address, M, y + 132, { size: 17, color: MUTED, max: 700 });

  // Meta band
  y = M + 290;
  g.fillStyle = BAND;
  g.fillRect(M, y, W - 2 * M, 96);
  const meta: [string, string, string][] = [
    ["Invoice no.", "رقم الفاتورة", inv.invoice_number],
    ["Issue date", "تاريخ الإصدار", stamp(inv.issued_at)],
    ["Supply date", "تاريخ التوريد", day(inv.supply_date)],
    ["Order", "رقم الطلب", inv.order_number ?? "—"],
  ];
  const colW = (W - 2 * M) / meta.length;
  meta.forEach(([en, ar, v], i) => {
    const x = M + 20 + i * colW;
    text(g, en, x, y + 28, { size: 14, color: MUTED });
    text(g, ar, x + colW - 40, y + 28, { size: 14, color: MUTED, ar: true, align: "right" });
    text(g, v, x, y + 66, { size: 19, bold: true, max: colW - 30 });
  });

  // Buyer
  y = M + 420;
  label(g, "Customer", "العميل", M, y);
  text(g, inv.buyer.name || "—", M, y + 52, { size: 20, bold: true, max: 700 });
  if (inv.buyer.address) text(g, inv.buyer.address, M, y + 80, { size: 17, color: MUTED, max: 900 });

  // Table head
  y = M + 540;
  g.fillStyle = BRAND;
  g.fillRect(M, y, W - 2 * M, 62);
  for (const c of COLS) {
    const x = c.align === "right" ? c.x - 12 : c.x + 12;
    text(g, c.en, x, y + 26, { size: 15, bold: true, color: "#ffffff", align: c.align });
    text(g, c.ar, x, y + 50, { size: 14, color: "#d7e6e3", align: c.align, ar: true });
  }
  y += 62;

  rows.forEach((l, i) => {
    const rowH = 66;
    if (i % 2 === 1) { g.fillStyle = "#fafbfa"; g.fillRect(M, y, W - 2 * M, rowH); }
    text(g, String(firstIndex + i + 1), COLS[0].x + 12, y + 30, { size: 17, color: MUTED });
    text(g, l.title, COLS[1].x + 12, y + 30, { size: 18, max: COLS[1].w + 80 });
    text(g, [l.vendor, l.sku].filter(Boolean).join(" · "), COLS[1].x + 12, y + 54, { size: 14, color: MUTED, max: COLS[1].w + 80 });
    text(g, String(l.quantity), COLS[2].x - 12, y + 30, { size: 18, align: "right" });
    text(g, money(l.unit_price), COLS[3].x - 12, y + 30, { size: 18, align: "right" });
    text(g, money(l.total), COLS[4].x - 12, y + 30, { size: 18, align: "right" });
    g.fillStyle = LINE; g.fillRect(M, y + rowH - 1, W - 2 * M, 1);
    y += rowH;
  });

  if (last) {
    const t = invoiceTotals(inv);
    y += 30;
    const rowsT: [string, string, string, boolean][] = [
      ["Subtotal", "المجموع الفرعي", money(t.subtotal), false],
      ...(t.discount > 0 ? [["Discount", "الخصم", `− ${money(t.discount)}`, false] as [string, string, string, boolean]] : []),
      ["Delivery", "التوصيل", money(t.shipping), false],
      ["Total excl. VAT", "الإجمالي غير شامل الضريبة", money(t.taxable), false],
      [`VAT ${t.vatRate}%`, `ضريبة القيمة المضافة ${t.vatRate}٪`, money(t.vat), false],
      [`Total incl. VAT (${inv.currency})`, "الإجمالي شامل الضريبة", money(t.total), true],
    ];
    const lx = W - M - 560;
    for (const [en, ar, v, strong] of rowsT) {
      if (strong) { g.fillStyle = BAND; g.fillRect(lx - 16, y - 6, 560 + 16, 66); }
      text(g, en, lx, y + 22, { size: strong ? 19 : 17, bold: strong });
      text(g, ar, lx, y + 46, { size: 14, color: MUTED, ar: true });
      text(g, v, W - M - 12, y + 32, { size: strong ? 22 : 18, bold: strong, align: "right" });
      y += strong ? 72 : 58;
    }
  }

  // Footer
  g.fillStyle = LINE; g.fillRect(M, H - M - 50, W - 2 * M, 1);
  text(g, `Amounts in ${inv.currency}. Issued by ${inv.seller.legal_name} as seller of record; the vendors named above made and shipped the goods.`, M, H - M - 18, { size: 14, color: MUTED, max: W - 2 * M - 120 });
  text(g, `${page} / ${pages}`, W - M, H - M - 18, { size: 14, color: MUTED, align: "right" });
}

export async function invoicePdfBlob(inv: Invoice): Promise<Blob> {
  const [{ jsPDF }, QR] = await Promise.all([import("jspdf"), import("qrcode")]);
  let qr: HTMLImageElement | null = null;
  if (inv.qr_tlv) {
    const url = await QR.toDataURL(inv.qr_tlv, { margin: 1, width: 340, errorCorrectionLevel: "M" });
    qr = await loadImage(url);
  }
  if (typeof document !== "undefined" && "fonts" in document) {
    try { await document.fonts.ready; } catch { /* draw anyway */ }
  }

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pages = invoicePages(inv.lines.length);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("This browser can't draw the invoice.");

  pages.forEach((p, i) => {
    drawPage(g, inv, qr, inv.lines.slice(p.from, p.to), p.from, i + 1, pages.length, i === pages.length - 1);
    if (i > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297);
  });
  pdf.setProperties({ title: `Nooi invoice ${inv.invoice_number}`, author: inv.seller.legal_name });
  return pdf.output("blob");
}

export async function saveInvoicePdf(inv: Invoice): Promise<void> {
  const blob = await invoicePdfBlob(inv);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Nooi-invoice-${inv.invoice_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
