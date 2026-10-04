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