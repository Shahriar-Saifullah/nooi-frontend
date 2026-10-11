import { requestApi, type ApiResponse } from "./http";
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

