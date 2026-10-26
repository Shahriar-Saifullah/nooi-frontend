/**
 * Admin API client
 * ----------------------------------------------------------------------------
 * The /admin endpoints use the NESTED envelope — { success, data: { ... } } —
 * the same as /projects and unlike /orders and /marketplace, which are flat.
 * requestApi handles both since the http.ts fix, so these can use it directly.
 *
 * Worth knowing when adding endpoints here: the convention is per-route-group,
 * not per-codebase. Check what the controller actually returns.
 */

import { requestApi, type ApiResponse } from "./http";
import { createClient } from "@/utils/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type VendorStatus = "pending" | "approved" | "rejected" | "suspended";
export type QueueTab = VendorStatus | "done" | "all";
export type QueueSort = "oldest" | "newest" | "vendor";

export interface LegalDocument {
  kind: string;
  label: string;
  /** Storage key in a private bucket, not a URL. Signed on demand. */
  path: string;
  uploaded_at: string;
}

export interface QueueVendor {
  id: string;
  business_name: string;
  store_name: string | null;
  business_email: string | null;
  phone: string | null;
  category: string | null;
  city: string | null;
  country: string | null;
  fulfillment_type: string | null;
  status: VendorStatus;
  submitted_at: string | null;
  created_at: string;
  decided_at: string | null;
  rejection_reason: string | null;
  reviewing_by: string | null;
  reviewing_at: string | null;
  reviewing_by_name: string | null;
  decided_by_name: string | null;
  /** The claim is live rather than an abandoned one from an hour ago. */
  review_claim_live: boolean;
  document_count: number;
}

export interface ReviewVendor extends Omit<QueueVendor, "document_count"> {
  description: string | null;
  website: string | null;
  address: string | null;
  tax_id: string | null;
  cr_number: string | null;
  vat_number: string | null;
  logo_url: string | null;
  verified_at: string | null;
  decided_by: string | null;
  payout_connected: boolean;
  legal_documents: LegalDocument[];
}

export interface DuplicateVendor {
  id: string;
  business_name: string;
  city: string | null;
  status: VendorStatus;
  submitted_at: string | null;
}

export interface QueueCounts {
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
  done: number;
  all: number;
}

export interface QueueResponse {
  vendors: QueueVendor[];
  counts: QueueCounts;
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export interface ReviewResponse {
  vendor: ReviewVendor;
  duplicates: DuplicateVendor[];
  viewer_id: string | null;
}

export interface ClaimResponse {
  /** False means someone else holds a live claim — go read-only. */
  acquired: boolean;
  holder: string | null;
  holder_name: string | null;
  claimed_at: string | null;
  is_me: boolean;
}

export interface QueueSummary {
  key: string;
  label: string;
  href: string;
  count: number;
  /** ISO timestamp of the oldest waiting item. */
  oldest: string | null;
  /** False means there is no backend for this queue — render "not built",
   *  never zero. Zero is a claim that nothing is waiting. */
  available: boolean;
}

export interface OldestItem {
  queue: string;
  title: string;
  ref: string;
  href: string;
  since: string | null;
}

export interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string | null;
  actor_email: string | null;
  actor_name: string;
  created_at: string;
}

export interface AdminOverview {
  queues: QueueSummary[];
  total_waiting: number;
  oldest: OldestItem[];
  interventions: AuditEntry[];
  kpis: {
    total_users: number;
    total_vendors: number;
    approved_vendors: number;
    total_orders: number;
  };
  generated_at: string;
}

// ─── Order intervention ──────────────────────────────────────────────────────

export interface OrderSearchRow {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  customer_name: string | null;
  vendors: string[];
  payment_intent_id: string | null;
  currency?: string;
  payment_provider?: string;
  /** Set once an admin approved the order for vendor payment. */
  approved_at?: string | null;
  /** Set when someone has already acted on this order. */
  intervened_at: string | null;
}

export interface OrderIntervention {
  order: any;
  /** Everything already done to this order, newest first. */
  interventions: {
    id: string;
    action: string;
    summary: string | null;
    actor_email: string | null;
    created_at: string;
    metadata: Record<string, any>;
  }[];
  returns: { id: string; status: string; reason: string; order_item_id: string; created_at: string }[];
  /** What each vendor earns on this order and whether it is payable yet. */
  earnings?: OrderEarning[];
  already_refunded_count: number;
  /** Cancelling refunds the customer, so it is super_admin only. The backend
   *  enforces this; the flag just keeps the UI honest about it. */
  viewer_can_cancel: boolean;
}

// ─── Returns and refunds ─────────────────────────────────────────────────────

export interface ReturnRow {
  id: string;
  order_id: string;
  order_item_id: string;
  user_id: string;
  reason: string;
  photo_urls: string[];
  status: "requested" | "refunding" | "refunded" | "declined";
  created_at: string;
  item_title: string;
  item_variant: string | null;
  item_image: string | null;
  item_quantity: number;
  /** Full-item refunds in v1, so this is the item's total. Server-derived —
   *  the client never sends an amount. */
  amount: number;
  vendor_name: string | null;
  order_number: string | null;
  customer_name: string | null;
}

export interface ReturnCounts {
  requested: number;
  done: number;
  all: number;
}

export interface ReturnDetail {
  return: ReturnRow & {
    decided_by_name: string | null;
    decided_at: string | null;
    decision_note: string | null;
    stripe_refund_id: string | null;
  };
  item: any;
  order: any;
  other_returns_on_order: { id: string; status: string; reason: string; created_at: string }[];
  /** False when the order has no payment_intent_id — nothing to refund against. */
  refundable: boolean;
}

// ─── Vendor directory ────────────────────────────────────────────────────────

export type DirectoryTab = "all" | "attention" | "approved" | "suspended";

export interface DirectoryVendor {
  id: string;
  business_name: string;
  store_name: string | null;
  business_email: string | null;
  city: string | null;
  country: string | null;
  category: string | null;
  fulfillment_type: string | null;
  status: string;
  payout_connected: boolean;
  document_count: number;
  storefronts: { id: string; name: string }[];
  commission_rate: number | null;
  /** Gross, before commission. The rate is shown beside it so the two are
   *  never conflated — netting here would answer the payouts screen's
   *  question instead of this one's. */
  gmv_90d: number;
  /** Items not yet delivered, by item_status — goods outstanding, not parcels. */
  open_items: number;
  last_sign_in_at: string | null;
  verified_at: string | null;
  /** Why this vendor needs attention, in words. A bare flag just moves the
   *  question along. */
  issues: string[];
  needs_attention: boolean;
}

export interface DirectoryCounts {
  all: number;
  attention: number;
  approved: number;
  suspended: number;
}

export interface DirectoryResponse {
  vendors: DirectoryVendor[];
  counts: DirectoryCounts;
  gmv_window_days: number;
}

// ─── Audit log ───────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  /** Filter options derived from the data, not a hardcoded list. */
  actors: string[];
  action_groups: string[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

// ─── Team ────────────────────────────────────────────────────────────────────

export type ConsoleRole = "admin" | "super_admin";

export interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  /** active | invited | never signed in — an admin account nobody has ever
   *  used is worth noticing. */
  status: string;
}

export interface PermissionRow {
  label: string;
  admin: boolean;
  super_admin: boolean;
  /** The guard this row describes, so the table can be checked against code. */
  note?: string;
}

export interface TeamResponse {
  members: TeamMember[];
  permissions: PermissionRow[];
  roles: ConsoleRole[];
  viewer_role: string;
}

export interface AdminStats {
  total_users: number;
  total_vendors: number;
  pending_vendors: number;
  approved_vendors: number;
  total_projects: number;
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

/**
 * The dashboard's data. Separate from getAdminStats because the questions
 * differ: stats answers "how are we doing", this answers "what is waiting on
 * me and for how long".
 */
export async function getAdminOverview(): Promise<ApiResponse<AdminOverview>> {
  return requestApi<AdminOverview>({ path: "/admin/overview", method: "GET" });
}

/**
 * Ask for one document and get a short-lived signed URL.
 *
 * The path is never sent — the backend reads it from the vendor's own record.
 * A client that could name the object could sign a URL for any file in the
 * bucket, including another vendor's bank letter.
 */
export async function getVendorDocumentUrl(
  vendorId: string,
  kind: string,
): Promise<ApiResponse<{ url: string; label: string; expires_in: number }>> {
  return requestApi<{ url: string; label: string; expires_in: number }>({
    path: `/admin/vendors/${encodeURIComponent(vendorId)}/documents/${encodeURIComponent(kind)}`,
    method: "GET",
  });
}

export async function searchOrders(
  q?: string,
): Promise<ApiResponse<{ orders: OrderSearchRow[] }>> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  return requestApi<{ orders: OrderSearchRow[] }>({
    path: `/admin/orders?${params.toString()}`,
    method: "GET",
  });
}

export async function getOrderForIntervention(
  id: string,
): Promise<ApiResponse<OrderIntervention>> {
  return requestApi<OrderIntervention>({
    path: `/admin/orders/${encodeURIComponent(id)}`,
    method: "GET",
  });
}

export async function overrideOrderStatus(
  id: string,
  status: string,
  note: string,
): Promise<ApiResponse<{ status: string }>> {
  return requestApi<{ status: string }>({
    path: `/admin/orders/${encodeURIComponent(id)}/override`,
    method: "POST",
    body: { status, note },
  });
}

/**
 * Cancel and refund. Super admin only — the backend returns 403 otherwise.
 * `refunded` is what actually went back, which is the order total minus
 * anything already refunded through a return.
 */
export async function cancelOrderAsAdmin(
  id: string,
  note: string,
): Promise<ApiResponse<{ status: string; refund_id: string | null; refunded: number }>> {
  return requestApi<{ status: string; refund_id: string | null; refunded: number }>({
    path: `/admin/orders/${encodeURIComponent(id)}/cancel`,
    method: "POST",
    body: { note },
  });
}

export async function getReturnsQueue(params: {
  tab?: string;
  search?: string;
  sort?: string;
} = {}): Promise<ApiResponse<{ returns: ReturnRow[]; counts: ReturnCounts }>> {
  const q = new URLSearchParams();
  if (params.tab) q.set("tab", params.tab);
  if (params.search) q.set("search", params.search);
  if (params.sort) q.set("sort", params.sort);
  return requestApi<{ returns: ReturnRow[]; counts: ReturnCounts }>({
    path: `/admin/returns?${q.toString()}`,
    method: "GET",
  });
}

export async function getReturnForReview(id: string): Promise<ApiResponse<ReturnDetail>> {
  return requestApi<ReturnDetail>({
    path: `/admin/returns/${encodeURIComponent(id)}`,
    method: "GET",
  });
}

/**
 * Issue the refund. No amount parameter, deliberately: the backend reads it
 * from the order item. Returns 409 with "already_handled" if someone else
 * decided first — which is information, not failure.
 */
export async function refundReturn(
  id: string,
): Promise<ApiResponse<{ status: string; refund_id: string; amount: number }>> {
  return requestApi<{ status: string; refund_id: string; amount: number }>({
    path: `/admin/returns/${encodeURIComponent(id)}/refund`,
    method: "POST",
    body: {},
  });
}

export async function declineReturn(
  id: string,
  note: string,
): Promise<ApiResponse<{ status: string }>> {
  return requestApi<{ status: string }>({
    path: `/admin/returns/${encodeURIComponent(id)}/decline`,
    method: "POST",
    body: { note },
  });
}

export async function getVendorDirectory(params: {
  tab?: DirectoryTab;
  search?: string;
} = {}): Promise<ApiResponse<DirectoryResponse>> {
  const q = new URLSearchParams();
  if (params.tab) q.set("tab", params.tab);
  if (params.search) q.set("search", params.search);
  return requestApi<DirectoryResponse>({
    path: `/admin/vendors/directory?${q.toString()}`,
    method: "GET",
  });
}

export async function getAuditLog(params: {
  search?: string;
  actor?: string;
  action?: string;
  page?: number;
  limit?: number;
} = {}): Promise<ApiResponse<AuditLogResponse>> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.actor && params.actor !== "all") q.set("actor", params.actor);
  if (params.action && params.action !== "all") q.set("action", params.action);
  q.set("page", String(params.page ?? 1));
  q.set("limit", String(params.limit ?? 50));

  return requestApi<AuditLogResponse>({
    path: `/admin/audit?${q.toString()}`,
    method: "GET",
  });
}

/**
 * Download the audit CSV.
 *
 * Was a plain <a href>, which 401s: the browser sends no Authorization header
 * on a normal navigation, and the Supabase session cookie does not travel to
 * the backend's own domain. So fetch it with the token like every other call,
 * then hand the browser a blob to save.
 *
 * Returns an error string rather than throwing, so the caller can show it
 * inline — a download that fails silently leaves someone waiting for a file
 * that is never coming.
 */
export async function downloadAuditCsv(params: {
  search?: string;
  actor?: string;
  action?: string;
} = {}): Promise<string | null> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.actor && params.actor !== "all") q.set("actor", params.actor);
  if (params.action && params.action !== "all") q.set("action", params.action);

  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  const url = `${base}/admin/audit/export?${q.toString()}`;

  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(url, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return "Your session has expired. Sign in again to export.";
      }
      return "Could not generate the export.";
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `nooi-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Freeing it immediately can cancel the download in Safari.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    return null;
  } catch {
    return "Could not generate the export.";
  }
}

export async function getTeam(): Promise<ApiResponse<TeamResponse>> {
  return requestApi<TeamResponse>({ path: "/admin/team", method: "GET" });
}

/**
 * Invite rather than create: the invitee sets their own password from a
 * one-time link, so an admin credential never travels through chat or email.
 */
export async function inviteTeamMember(
  email: string,
  role: ConsoleRole,
): Promise<ApiResponse<{ email: string; role: ConsoleRole; id: string | null }>> {
  return requestApi<{ email: string; role: ConsoleRole; id: string | null }>({
    path: "/admin/team/invite",
    method: "POST",
    body: { email, role },
  });
}

export async function updateUserRole(
  id: string,
  role: ConsoleRole | "user" | "vendor",
): Promise<ApiResponse<{ profile: any }>> {
  return requestApi<{ profile: any }>({
    path: `/admin/users/${encodeURIComponent(id)}/role`,
    method: "PATCH",
    body: { role },
  });
}

export async function getAdminStats(): Promise<ApiResponse<{ stats: AdminStats }>> {
  return requestApi<{ stats: AdminStats }>({ path: "/admin/stats", method: "GET" });
}

export async function getVendorQueue(params: {
  tab?: QueueTab;
  search?: string;
  category?: string;
  sort?: QueueSort;
  page?: number;
  limit?: number;
} = {}): Promise<ApiResponse<QueueResponse>> {
  const q = new URLSearchParams();
  if (params.tab) q.set("tab", params.tab);
  if (params.search) q.set("search", params.search);
  if (params.category && params.category !== "all") q.set("category", params.category);
  if (params.sort) q.set("sort", params.sort);
  q.set("page", String(params.page ?? 1));
  q.set("limit", String(params.limit ?? 25));

  return requestApi<QueueResponse>({
    path: `/admin/vendors/queue?${q.toString()}`,
    method: "GET",
  });
}

export async function getVendorForReview(id: string): Promise<ApiResponse<ReviewResponse>> {
  return requestApi<ReviewResponse>({
    path: `/admin/vendors/${encodeURIComponent(id)}/review`,
    method: "GET",
  });
}

/**
 * Claim an application. Advisory — it signals to other admins that someone is
 * reading, and nothing more. `takeover` seizes a live claim, which the design
 * offers because someone who stepped away shouldn't block the queue.
 */
export async function claimVendorReview(
  id: string,
  takeover = false,
): Promise<ApiResponse<ClaimResponse>> {
  return requestApi<ClaimResponse>({
    path: `/admin/vendors/${encodeURIComponent(id)}/review/claim`,
    method: "POST",
    body: { takeover },
  });
}

/**
 * Decide an application.
 *
 * Returns 409 with `error: "already_decided"` when another admin got there
 * first — the backend only applies the change while the status is still
 * pending. Callers should surface that rather than treating it as a failure:
 * nothing is wrong, the work was simply already done.
 */
export async function decideVendorApplication(
  id: string,
  status: "approved" | "rejected" | "suspended",
  rejectionReason?: string,
): Promise<ApiResponse<{ final_status: VendorStatus; decided_at: string }>> {
  return requestApi<{ final_status: VendorStatus; decided_at: string }>({
    path: `/admin/vendors/${encodeURIComponent(id)}/decision`,
    method: "POST",
    body: { status, rejection_reason: rejectionReason ?? null },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Whole days an application has been waiting. Drives the ageing labels. */
export function waitingDays(submittedAt: string | null): number {
  if (!submittedAt) return 0;
  const ms = Date.now() - new Date(submittedAt).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/**
 * Ageing band, against the two-business-day response target in the design.
 *
 * `overdue` is deliberately generous at five days rather than two — an amber
 * state that fires on nearly every row stops meaning anything, and the queue
 * needs the red to still carry weight when it appears.
 */
export function waitingBand(days: number): "fresh" | "due" | "overdue" {
  if (days >= 5) return "overdue";
  if (days >= 2) return "due";
  return "fresh";
}
// ─── Payments: approval and vendor payouts ───────────────────────────────────
// Amounts in SAR (major units). The backend keeps the ledger in halalas.

export interface OrderEarning {
  id: string;
  vendor_id: string;
  retailer_id: string | null;
  kind: "sale" | "shipping" | "reversal";
  gross_minor: number;
  commission_rate: number;
  commission_minor: number;
  net_minor: number;
  status: "pending" | "payable" | "in_payout" | "paid" | "reversed";
  payout_id: string | null;
  payable_at: string | null;
  paid_at: string | null;
}

/** Approve an order for vendor payment. Vendors' shares become payable once
 *  their shipment is also delivered. */
export async function approveOrder(id: string): Promise<ApiResponse<{ approved_at: string }>> {
  return requestApi<{ approved_at: string }>({
    path: `/admin/orders/${encodeURIComponent(id)}/approve`,
    method: "POST",
  });
}

export interface PaymentsVendorRow {
  vendor_id: string;
  name: string;
  pending: number;
  payable: number;
  in_payout: number;
  paid: number;
  commission: number;
  account: { holder: string; iban_masked: string; bank_name: string | null; verified: boolean } | null;
  last_payout: { status: string; amount_minor: number; created_at: string } | null;
}

export interface PaymentsOverview {
  currency: string;
  hold_days: number;
  totals: {
    collected: number;
    vat_collected: number;
    commission: number;
    owed_pending: number;
    owed_payable: number;
    in_payout: number;
    paid_out: number;
    orders_awaiting_approval: number;
  };
  vendors: PaymentsVendorRow[];
}

export interface PayoutRow {
  id: string;
  vendor_id: string;
  amount: number;
  currency: string;
  status: "creating" | "queued" | "initiated" | "paid" | "failed" | "canceled" | "returned";
  channel: string | null;
  sequence_number: string;
  provider_payout_id: string | null;
  destination: { name: string; iban: string; city: string };
  earnings_count: number;
  failure_reason: string | null;
  last_error: string | null;
  created_at: string;
  paid_at: string | null;
}

export async function getPaymentsOverview(): Promise<ApiResponse<PaymentsOverview>> {
  return requestApi<PaymentsOverview>({ path: "/admin/payments/overview", method: "GET" });
}

export async function listPayouts(vendorId?: string): Promise<ApiResponse<{ payouts: PayoutRow[] }>> {
  const q = vendorId ? `?vendor_id=${encodeURIComponent(vendorId)}` : "";
  return requestApi<{ payouts: PayoutRow[] }>({ path: `/admin/payouts${q}`, method: "GET" });
}

/** Pay a vendor everything payable. Super admin only. */
export async function createPayout(vendorId: string): Promise<ApiResponse<{ payout: PayoutRow }>> {
  return requestApi<{ payout: PayoutRow }>({ path: "/admin/payouts", method: "POST", body: { vendor_id: vendorId } });
}

export async function refreshPayout(id: string): Promise<ApiResponse<{ payout: PayoutRow }>> {
  return requestApi<{ payout: PayoutRow }>({ path: `/admin/payouts/${encodeURIComponent(id)}/refresh`, method: "POST" });
}

export async function getVendorPayoutAccount(vendorId: string): Promise<ApiResponse<{ account: any | null }>> {
  return requestApi<{ account: any | null }>({ path: `/admin/vendors/${encodeURIComponent(vendorId)}/payout-account`, method: "GET" });
}

/** Mark the vendor's IBAN as checked. `iban` is the one the admin looked at. */
export async function verifyVendorPayoutAccount(vendorId: string, iban: string): Promise<ApiResponse<unknown>> {
  return requestApi<unknown>({
    path: `/admin/vendors/${encodeURIComponent(vendorId)}/payout-account/verify`,
    method: "POST",
    body: { iban },
  });
}

/** Confirm a shipment was delivered (no carrier scan). Makes the vendor's
 *  share payable if the order is approved. `note` says how it was confirmed. */
export async function markShipmentDelivered(orderId: string, shipmentId: string, note: string): Promise<ApiResponse<unknown>> {
  return requestApi<unknown>({
    path: `/admin/orders/${encodeURIComponent(orderId)}/shipments/${encodeURIComponent(shipmentId)}/delivered`,
    method: "POST",
    body: { note },
  });
}


// ─── Operations: listings, cancellations, support, settings ──────────────────

export interface OpsCounts { listings: number; cancellations: number; support: number }
export async function getOpsCounts(): Promise<ApiResponse<OpsCounts>> {
  return requestApi<OpsCounts>({ path: "/admin/ops/counts", method: "GET" });
}

export type ListingStatus = "pending" | "approved" | "rejected" | "deactivated";
export interface ListingRow {
  id: string;
  title: string;
  category: string | null;
  type_id: string | null;
  base_price: number;
  listing_status: ListingStatus;
  review_note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  specs_json: Record<string, unknown> | null;
  retailers: { id: string; name: string; vendor_id: string | null } | null;
  product_variants: { id: string; sku: string; images: string[] | null; stock_quantity: number; price: number }[];
}
export async function listListings(tab: string, search?: string): Promise<ApiResponse<{ listings: ListingRow[]; counts: Record<string, number> }>> {
  const q = new URLSearchParams({ tab });
  if (search) q.set("search", search);
  return requestApi({ path: `/admin/listings?${q.toString()}`, method: "GET" });
}
export type ListingDetail = Omit<ListingRow, "retailers"> & {
  description: string | null;
  lead_time_days: number | null;
  is_returnable: boolean;
  canvas_model_id: string;
  retailers: { id: string; name: string; vendor_id: string | null; commission_rate: number } | null;
};
export async function getListing(id: string): Promise<ApiResponse<{ listing: ListingDetail }>> {
  return requestApi({ path: `/admin/listings/${encodeURIComponent(id)}`, method: "GET" });
}
export async function decideListing(id: string, action: "approve" | "reject" | "deactivate" | "reactivate", note?: string): Promise<ApiResponse<{ listing_status: ListingStatus }>> {
  return requestApi({ path: `/admin/listings/${encodeURIComponent(id)}/decision`, method: "POST", body: { action, note } });
}

export interface CancellationRow {
  id: string;
  order_id: string;
  shipment_id: string | null;
  requester_role: "customer" | "vendor";
  reason: string;
  status: "requested" | "processing" | "approved" | "declined";
  refund_amount: number | null;
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
  orders: { order_number: string; total_amount: number; currency: string; status: string; shipping_address: { fullName?: string } | null } | null;
  order_shipments: { shipment_status: string; retailers: { name: string } | null } | null;
}
export async function listCancellations(tab: string): Promise<ApiResponse<{ requests: CancellationRow[]; open_count: number }>> {
  return requestApi({ path: `/admin/cancellations?tab=${encodeURIComponent(tab)}`, method: "GET" });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- nested order/ticket shape, read loosely by the page
export async function getCancellation(id: string): Promise<ApiResponse<{ request: any; refund_preview: number | null }>> {
  return requestApi({ path: `/admin/cancellations/${encodeURIComponent(id)}`, method: "GET" });
}
export async function approveCancellation(id: string, note?: string): Promise<ApiResponse<{ refunded: number; refund_id: string | null }>> {
  return requestApi({ path: `/admin/cancellations/${encodeURIComponent(id)}/approve`, method: "POST", body: { note } });
}
export async function declineCancellation(id: string, note: string): Promise<ApiResponse<unknown>> {
  return requestApi({ path: `/admin/cancellations/${encodeURIComponent(id)}/decline`, method: "POST", body: { note } });
}

export interface TicketRow {
  id: string;
  number: number;
  subject: string;
  category: string;
  status: "open" | "waiting" | "resolved";
  requester_role: "customer" | "vendor";
  requester_name: string | null;
  order_id: string | null;
  admin_unread: boolean;
  last_message_at: string;
  created_at: string;
  orders: { order_number: string } | null;
}
export interface TicketMessage { id: string; author_role: "customer" | "vendor" | "admin"; body: string; created_at: string }
export async function listSupportTickets(tab: string, search?: string): Promise<ApiResponse<{ tickets: TicketRow[]; counts: Record<string, number> }>> {
  const q = new URLSearchParams({ tab });
  if (search) q.set("search", search);
  return requestApi({ path: `/admin/support?${q.toString()}`, method: "GET" });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- nested order/ticket shape, read loosely by the page
export async function getSupportTicket(id: string): Promise<ApiResponse<{ ticket: any; messages: TicketMessage[]; requester: { name: string | null; role: string | null; email: string | null } }>> {
  return requestApi({ path: `/admin/support/${encodeURIComponent(id)}`, method: "GET" });
}
export async function replySupportTicket(id: string, body: string, status: "waiting" | "resolved"): Promise<ApiResponse<unknown>> {
  return requestApi({ path: `/admin/support/${encodeURIComponent(id)}/reply`, method: "POST", body: { body, status } });
}
export async function setSupportStatus(id: string, status: "open" | "waiting" | "resolved"): Promise<ApiResponse<unknown>> {
  return requestApi({ path: `/admin/support/${encodeURIComponent(id)}/status`, method: "POST", body: { status } });
}

export interface PlatformSettings {
  default_commission_rate: number;
  payout_hold_days: number;
  return_window_days: number;
  min_payout_sar: number;
  support_email: string | null;
  support_phone: string | null;
  legal_name: string | null;
  legal_address: string | null;
  vat_number: string | null;
  cr_number: string | null;
  updated_at?: string | null;
}
export async function getPlatformSettings(): Promise<ApiResponse<{ settings: PlatformSettings; can_edit: boolean }>> {
  return requestApi({ path: "/admin/settings", method: "GET" });
}
export async function updatePlatformSettings(patch: Partial<PlatformSettings>): Promise<ApiResponse<{ settings: PlatformSettings }>> {
  return requestApi({ path: "/admin/settings", method: "PUT", body: patch });
}
export interface PaymentStatus {
  provider: string;
  mode: "live" | "test" | "unset";
  currency: string;
  keys: { secret: boolean; publishable: boolean };
  webhook_secret_set: boolean;
  payout_source_set: boolean;
  payout_purpose: string;
  methods: string[];
  last_webhook: { event_type: string; status: string; created_at: string } | null;
  failed_webhooks_7d: number;
  last_payout: { status: string; created_at: string } | null;
  warnings: string[];
}
export async function getPaymentStatus(): Promise<ApiResponse<PaymentStatus>> {
  return requestApi({ path: "/admin/settings/payments", method: "GET" });
}
export async function getMe(): Promise<ApiResponse<{ id: string; email: string; full_name: string | null; role: string }>> {
  return requestApi({ path: "/admin/me", method: "GET" });
}
export async function updateMe(full_name: string): Promise<ApiResponse<unknown>> {
  return requestApi({ path: "/admin/me", method: "PUT", body: { full_name } });
}
export async function changeMyPassword(current_password: string, new_password: string): Promise<ApiResponse<unknown>> {
  return requestApi({ path: "/admin/me/password", method: "PUT", body: { current_password, new_password } });
}
