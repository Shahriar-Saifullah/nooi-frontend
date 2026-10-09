import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface VendorAccountData {
  fullName: string;
  workEmail: string;
  businessName: string;
  password?: string;
}

export type FulfillmentType = "Retailer" | "Factory" | "Hybrid" | "Dropshipper";

export interface VendorStoreProfile {
  storeName: string;
  fulfillmentType: FulfillmentType | "";
  city: string;
  phone: string;
  description: string;
}

export interface UploadedFile {
  name: string;
  size?: number;
  url?: string;
  path?: string;
  uploaded_at?: string;
}

export interface VendorLegalDocs {
  commercialRegistrationNumber: string;
  vatNumber: string;
  commercialRegistrationCertificate: UploadedFile | null;
  vatRegistrationCertificate: UploadedFile | null;
  authorisedSignatoryId: UploadedFile | null;
}

export interface VendorPayoutDetails {
  bankName: string;
  iban: string;
  accountHolderName: string;
}

export interface VendorState {
  step: number; // 1: account signup, 1.5: verify email, 2: store profile, 3: legal docs, 4: payout, 5: review
  emailVerified: boolean;
  stripeConnected: boolean;
  submittedAt: string | null;
  lastSavedAt: string | null;
  applicationStatus: "draft" | "submitted" | "action_needed" | "rejected" | "approved";
  reopenedFields: string[];
  reviewNote: string;
  reviewDate: string;
  accountData: VendorAccountData;
  storeProfile: VendorStoreProfile;
  legalDocs: VendorLegalDocs;
  payoutDetails: VendorPayoutDetails;

  setStep: (step: number) => void;
  setEmailVerified: (verified: boolean) => void;
  setStripeConnected: (connected: boolean) => void;
  setSubmittedAt: (date: string | null) => void;
  setLastSavedAt: (date: string | null) => void;
  setApplicationStatus: (status: "draft" | "submitted" | "action_needed" | "rejected" | "approved") => void;
  setReopenedFields: (fields: string[]) => void;
  setReviewNote: (note: string) => void;
  setAccountData: (data: Partial<VendorAccountData>) => void;
  setStoreProfile: (data: Partial<VendorStoreProfile>) => void;
  setLegalDocs: (data: Partial<VendorLegalDocs>) => void;
  setPayoutDetails: (data: Partial<VendorPayoutDetails>) => void;
  resetVendorState: () => void;
}

const initialAccountData: VendorAccountData = {
  fullName: "",
  workEmail: "",
  businessName: "",
  password: "",
};

const initialStoreProfile: VendorStoreProfile = {
  storeName: "",
  fulfillmentType: "Factory",
  city: "",
  phone: "",
  description: "",
};

const initialLegalDocs: VendorLegalDocs = {
  commercialRegistrationNumber: "",
  vatNumber: "",
  commercialRegistrationCertificate: null,
  vatRegistrationCertificate: null,
  authorisedSignatoryId: null,
};

const initialPayoutDetails: VendorPayoutDetails = {
  bankName: "",
  iban: "",
  accountHolderName: "",
};

export const useVendorStore = create<VendorState>()(
  persist(
    (set) => ({
      step: 1,
      emailVerified: false,
      stripeConnected: false,
      submittedAt: null,
      lastSavedAt: null,
      applicationStatus: "draft",
      reopenedFields: [],
      reviewNote: "",
      reviewDate: "27 Sep 2026",
      accountData: initialAccountData,
      storeProfile: initialStoreProfile,
      legalDocs: initialLegalDocs,
      payoutDetails: initialPayoutDetails,

      setStep: (step) =>
        set({
          step,
          lastSavedAt: new Date().toISOString(),
        }),
      setEmailVerified: (emailVerified) => set({ emailVerified }),
      setStripeConnected: (stripeConnected) => set({ stripeConnected }),
      setSubmittedAt: (submittedAt) => set({ submittedAt, lastSavedAt: new Date().toISOString() }),
      setLastSavedAt: (lastSavedAt) => set({ lastSavedAt }),
      setApplicationStatus: (applicationStatus) => set({ applicationStatus }),
      setReopenedFields: (reopenedFields) => set({ reopenedFields }),
      setReviewNote: (reviewNote) => set({ reviewNote }),

      setAccountData: (data) =>
        set((state) => {
          const nextAccount = { ...state.accountData, ...data };
          // Sync storeName with businessName if storeName hasn't been modified separately
          const storeName =
            data.businessName && !state.storeProfile.storeName
              ? data.businessName
              : state.storeProfile.storeName;

          return {
            accountData: nextAccount,
            storeProfile: { ...state.storeProfile, storeName },
            lastSavedAt: new Date().toISOString(),
          };
        }),

      setStoreProfile: (data) =>
        set((state) => ({
          storeProfile: { ...state.storeProfile, ...data },
          lastSavedAt: new Date().toISOString(),
        })),

      setLegalDocs: (data) =>
        set((state) => ({
          legalDocs: { ...state.legalDocs, ...data },
          lastSavedAt: new Date().toISOString(),
        })),

      setPayoutDetails: (data) =>
        set((state) => ({
          payoutDetails: { ...state.payoutDetails, ...data },
          lastSavedAt: new Date().toISOString(),
        })),

      resetVendorState: () => {
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("vendor-onboarding-store");
            sessionStorage.removeItem("vendor-onboarding-store");
          } catch {}
        }
        set({
          step: 1,
          emailVerified: false,
          stripeConnected: false,
          submittedAt: null,
          lastSavedAt: null,
          applicationStatus: "draft",
          reopenedFields: [],
          reviewNote: "",
          reviewDate: "27 Sep 2026",
          accountData: initialAccountData,
          storeProfile: initialStoreProfile,
          legalDocs: initialLegalDocs,
          payoutDetails: initialPayoutDetails,
        });
      },
    }),
    {
      name: "vendor-onboarding-store",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);

