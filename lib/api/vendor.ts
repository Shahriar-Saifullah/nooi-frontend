import { requestApi, type ApiResponse } from "./http";
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
  payload: VendorStoreProfile
): Promise<ApiResponse<VendorStep2Response>> {
  return requestApi<VendorStep2Response, VendorStoreProfile>({
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
  payload: VendorLegalDocs
): Promise<ApiResponse<VendorStep3Response>> {
  return requestApi<VendorStep3Response, VendorLegalDocs>({
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
  documentType: string
): Promise<ApiResponse<VendorUploadResponse>> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);

    const res = await fetch("/api/vendor/upload", {
      method: "POST",
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
