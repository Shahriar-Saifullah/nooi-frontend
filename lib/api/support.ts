import { requestApi, type ApiResponse } from "./http";

/**
 * Support tickets — customer and vendor side (backend /support, nested
 * { success, data } envelope).
 */

export type TicketStatus = "open" | "waiting" | "resolved";
export const SUPPORT_CATEGORIES = [
  { key: "order", label: "An order" },
  { key: "payment", label: "Payment or refund" },
  { key: "return", label: "Return" },
  { key: "listing", label: "My listings" },
  { key: "payout", label: "Payouts" },
  { key: "account", label: "My account" },
  { key: "general", label: "Something else" },
] as const;

export interface MyTicket {
  id: string;
  number: number;
  subject: string;
  category: string;
  status: TicketStatus;
  order_id: string | null;
  requester_unread: boolean;
  last_message_at: string;
  created_at: string;
}
export interface SupportMessage { id: string; author_role: "customer" | "vendor" | "admin"; body: string; created_at: string }

export function listMyTickets(): Promise<ApiResponse<{ tickets: MyTicket[] }>> {
  return requestApi({ path: "/support/tickets", method: "GET" });
}
export function createTicket(input: { subject: string; category: string; body: string; order_id?: string | null }): Promise<ApiResponse<{ ticket: { id: string; number: number } }>> {
  return requestApi({ path: "/support/tickets", method: "POST", body: input });
}
export function getMyTicket(id: string): Promise<ApiResponse<{ ticket: MyTicket & { orders: { order_number: string } | null }; messages: SupportMessage[] }>> {
  return requestApi({ path: `/support/tickets/${encodeURIComponent(id)}`, method: "GET" });
}
export function replyToTicket(id: string, body: string): Promise<ApiResponse<unknown>> {
  return requestApi({ path: `/support/tickets/${encodeURIComponent(id)}/messages`, method: "POST", body: { body } });
}
