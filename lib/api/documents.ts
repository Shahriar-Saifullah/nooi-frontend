import { requestApi, type ApiResponse } from "./http";

export interface InvoiceLine {
  title: string;
  sku: string | null;
  vendor: string | null;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  order_number?: string;
  kind: "simplified" | "standard";
  issued_at: string;
  supply_date: string | null;
  seller: { legal_name: string; vat_number: string; cr_number: string | null; address: string | null };
  buyer: { name: string | null; address: string | null };
  lines: InvoiceLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  currency: string;
  qr_tlv: string | null;
}

export interface DocumentOrder {
  id: string;
  order_number: string;
  total_amount: number;
  currency: string;
  created_at: string;
  status: string;
  invoice: Pick<Invoice, "id" | "invoice_number" | "issued_at" | "total" | "currency"> | null;
}

export function getMyDocuments(): Promise<ApiResponse<{ orders: DocumentOrder[] }>> {
  return requestApi<{ orders: DocumentOrder[] }>({ path: "/orders/documents", method: "GET" });
}

/** The order's tax invoice — issued by Nooi on first request. */
export function getOrderInvoice(orderId: string): Promise<ApiResponse<{ invoice: Invoice }>> {
  return requestApi<{ invoice: Invoice }>({ path: `/orders/${encodeURIComponent(orderId)}/invoice`, method: "GET" });
}

/** Fetch, draw and download the invoice PDF. Returns an error message or null. */
export async function downloadInvoice(orderId: string): Promise<string | null> {
  const res = await getOrderInvoice(orderId);
  if (!res.success) return typeof res.error === "string" ? res.error : "Couldn't get the invoice.";
  const { saveInvoicePdf } = await import("@/lib/export/invoicePdf");
  await saveInvoicePdf(res.data.invoice);
  return null;
}
