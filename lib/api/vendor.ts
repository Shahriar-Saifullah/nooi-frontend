import { requestApi, requestJson, type ApiResponse } from "./http";
import { createClient } from "@/utils/supabase/client";
import type {
  VendorAccountData,
  VendorStoreProfile,
  VendorLegalDocs,
  UploadedFile,
} from "@/lib/store/vendor.store";

export interface VendorSignupResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    business_name: string;
    role: string;
    onboarding_step: number;
  };
  message?: string;
}

export interface VendorStep2Response {
  storeName: string;
  fulfillmentType: string;
  city: string;
  description: string;
  step: number;
}

export interface VendorStep3Response {
  commercialRegistrationNumber: string;
  vatNumber: string;
  commercialRegistrationCertificate: UploadedFile | null;
  vatRegistrationCertificate: UploadedFile | null;
  authorisedSignatoryId: UploadedFile | null;
  step: number;
}

export interface VendorUploadResponse {
  documentType: string;
  name: string;
  size: number;
  url: string;
}

export type VendorStoreProfilePayload = VendorStoreProfile & {
  workEmail?: string;
  businessName?: string;
};

export type VendorLegalDocsPayload = VendorLegalDocs & {
  workEmail?: string;
  businessName?: string;
};

/**
 * Submit Step 1 Vendor Signup
 */
export async function signUpVendor(
  payload: VendorAccountData
): Promise<ApiResponse<VendorSignupResponse>> {
  return requestApi<VendorSignupResponse, VendorAccountData>({
    baseUrl: "",
    path: "/api/vendor/signup",
    method: "POST",
    body: payload,
  });
}

/**
 * Submit Step 2 Vendor Store Profile
 */
export async function saveVendorStoreProfile(
  payload: VendorStoreProfilePayload
): Promise<ApiResponse<VendorStep2Response>> {
  return requestApi<VendorStep2Response, VendorStoreProfilePayload>({
    baseUrl: "",
    path: "/api/vendor/onboarding/step2",
    method: "POST",
    body: payload,
  });
}

/**
 * Submit Step 3 Vendor Legal Documents
 */
export async function saveVendorLegalDocs(
  payload: VendorLegalDocsPayload
): Promise<ApiResponse<VendorStep3Response>> {
  return requestApi<VendorStep3Response, VendorLegalDocsPayload>({
    baseUrl: "",
    path: "/api/vendor/onboarding/step3",
    method: "POST",
    body: payload,
  });
}

/**
 * Upload Vendor Legal Document (File)
 */
export async function uploadVendorDocument(
  file: File,
  documentType: string,
  workEmail?: string
): Promise<ApiResponse<VendorUploadResponse>> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);
    if (workEmail) {
      formData.append("workEmail", workEmail);
    }

    const headers: Record<string, string> = {};
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
    } catch {}

    const res = await fetch("/api/vendor/upload", {
      method: "POST",
      headers,
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || "File upload failed",
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "File upload network error",
    };
  }
}

export interface VendorProfileStatusResponse {
  vendor: {
    id: string;
    business_name: string;
    store_name: string | null;
    business_email: string | null;
    phone: string | null;
    category: string | null;
    city: string | null;
    country: string | null;
    fulfillment_type: string | null;
    status: "pending" | "approved" | "rejected" | "suspended" | "draft";
    submitted_at: string | null;
    created_at: string;
    decided_at: string | null;
    verified_at: string | null;
    rejection_reason: string | null;
    description: string | null;
    website: string | null;
    address: string | null;
    tax_id: string | null;
    cr_number: string | null;
    vat_number: string | null;
    payout_connected: boolean;
    legal_documents: Array<{ kind: string; label: string; path: string; uploaded_at: string }>;
  };
}

/**
 * Fetch current vendor status from database
 */
export async function getVendorStatus(hints?: {
  workEmail?: string;
  businessName?: string;
}): Promise<ApiResponse<VendorProfileStatusResponse>> {
  return requestApi<VendorProfileStatusResponse, typeof hints>({
    baseUrl: "",
    path: "/api/vendor/status",
    method: "POST",
    body: hints,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Vendor Shipments / Orders (Express Backend)
// ─────────────────────────────────────────────────────────────────────────────

export interface VendorShipmentItem {
  id: string;
  title: string;
  color?: string | null;
  sku?: string | null;
  image?: string | null;
  quantity: number;
  item_status: string;
}

export interface VendorDeliverTo {
  name: string;
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface VendorShipment {
  id: string;
  order_number: string;
  placed_at: string;
  shipment_status: string;
  carrier_code: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  estimated_delivery: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  exception_code: string | null;
  exception_note: string | null;
  deliver_to: VendorDeliverTo;
  items: VendorShipmentItem[];
  item_count: number;
  value: number;
}

export interface VendorOrdersData {
  shipments: VendorShipment[];
  counts: {
    to_fulfil: number;
    shipped: number;
    delivered: number;
    all: number;
  };
  carriers: string[];
}

export interface VendorOrdersResponse {
  success: boolean;
  data: VendorOrdersData;
  error?: string;
}

export interface VendorDispatchResponse {
  success: boolean;
  data: {
    id: string;
    shipment_status: string;
    carrier_code: string;
    tracking_number: string;
    tracking_url: string;
    order_id: string;
    retailer_id: string;
  };
  message?: string;
  error?: string;
}

/**
 * Fetch vendor shipments and orders from Express backend
 * GET /vendor/orders?tab=to_fulfil | shipped | delivered | all
 */
export async function getVendorOrders(
  tab: "to_fulfil" | "shipped" | "delivered" | "all" = "all"
): Promise<ApiResponse<VendorOrdersData>> {
  try {
    const res = await requestJson<VendorOrdersResponse>({
      path: `/vendor/orders?tab=${encodeURIComponent(tab)}`,
      method: "GET",
    });
    if (!res.success) {
      return { success: false, error: res.error || "Failed to fetch vendor orders" };
    }
    return { success: true, data: res.data };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Network error loading vendor orders",
    };
  }
}

/**
 * Dispatch a vendor shipment with carrier and tracking number
 * POST /vendor/orders/:shipmentId/dispatch { carrier_code, tracking_number }
 */
export async function dispatchVendorShipment(
  shipmentId: string,
  payload: { carrier_code: string; tracking_number: string }
): Promise<ApiResponse<VendorDispatchResponse["data"]>> {
  try {
    const res = await requestJson<VendorDispatchResponse, typeof payload>({
      path: `/vendor/orders/${encodeURIComponent(shipmentId)}/dispatch`,
      method: "POST",
      body: payload,
    });
    if (!res.success) {
      return { success: false, error: res.error || "Failed to dispatch shipment" };
    }
    return { success: true, data: res.data, message: res.message };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to dispatch shipment",
    };
  }
}

/**
 * Update vendor shipment status
 * POST /vendor/orders/:shipmentId/status { status, note? }
 */
export async function updateVendorShipmentStatus(
  shipmentId: string,
  payload: { status: string; note?: string }
): Promise<ApiResponse<any>> {
  try {
    const res = await requestJson<{ success: boolean; data?: any; error?: string }, typeof payload>({
      path: `/vendor/orders/${encodeURIComponent(shipmentId)}/status`,
      method: "POST",
      body: payload,
    });
    if (!res.success) {
      return { success: false, error: res.error || "Failed to update shipment status" };
    }
    return { success: true, data: res.data };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to update shipment status",
    };
  }
}

/**
 * Fetch a single vendor shipment by ID
 * GET /vendor/orders/:shipmentId
 */
export async function getVendorShipmentById(
  shipmentId: string
): Promise<ApiResponse<any>> {
  try {
    const res = await requestJson<{ success: boolean; data: any; error?: string }>({
      path: `/vendor/orders/${encodeURIComponent(shipmentId)}`,
      method: "GET",
    });
    if (!res.success) {
      return { success: false, error: res.error || "Failed to fetch shipment details" };
    }
    return { success: true, data: res.data };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to fetch shipment details",
    };
  }
}

/**
 * Advance a factory order's pre-dispatch production_stage.
 * Valid stages: "materials" | "production" | "qc" | "ready"
 * POST /api/vendor/orders/:shipmentId/stage { stage }
 *
 * This hits the Next.js route handler (same origin), not the Express
 * backend, so baseUrl is left empty to prevent NEXT_PUBLIC_API_URL
 * from being prepended.
 */
export async function updateVendorOrderStage(
  shipmentId: string,
  stage: "materials" | "production" | "qc" | "ready"
): Promise<ApiResponse<{ shipmentId: string; orderId: string; production_stage: string }>> {
  try {
    const res = await requestJson<
      {
        success: boolean;
        data?: { shipmentId: string; orderId: string; production_stage: string };
        error?: string;
        message?: string;
      },
      { stage: string }
    >({
      baseUrl: "",
      path: `/api/vendor/orders/${encodeURIComponent(shipmentId)}/stage`,
      method: "POST",
      body: { stage },
    });
    if (!res.success) {
      return { success: false, error: res.error || "Failed to update production stage" };
    }
    return { success: true, data: res.data! };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to update production stage",
    };
  }
}
