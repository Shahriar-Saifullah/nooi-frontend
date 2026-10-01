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
  description: string;
}

export interface UploadedFile {
  name: string;
  size?: number;
  url?: string;
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
  accountData: VendorAccountData;
  storeProfile: VendorStoreProfile;
  legalDocs: VendorLegalDocs;
  payoutDetails: VendorPayoutDetails;

  setStep: (step: number) => void;
  setEmailVerified: (verified: boolean) => void;
  setStripeConnected: (connected: boolean) => void;
  setSubmittedAt: (date: string | null) => void;
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
      accountData: initialAccountData,
      storeProfile: initialStoreProfile,
      legalDocs: initialLegalDocs,
      payoutDetails: initialPayoutDetails,

      setStep: (step) => set({ step }),
      setEmailVerified: (emailVerified) => set({ emailVerified }),
      setStripeConnected: (stripeConnected) => set({ stripeConnected }),
      setSubmittedAt: (submittedAt) => set({ submittedAt }),

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
          };
        }),

      setStoreProfile: (data) =>
        set((state) => ({
          storeProfile: { ...state.storeProfile, ...data },
        })),

      setLegalDocs: (data) =>
        set((state) => ({
          legalDocs: { ...state.legalDocs, ...data },
        })),

      setPayoutDetails: (data) =>
        set((state) => ({
          payoutDetails: { ...state.payoutDetails, ...data },
        })),

      resetVendorState: () => {
        if (typeof window !== "undefined" && window.sessionStorage) {
          try {
            sessionStorage.removeItem("vendor-onboarding-store");
          } catch {}
        }
        set({
          step: 1,
          emailVerified: false,
          stripeConnected: false,
          submittedAt: null,
          accountData: initialAccountData,
          storeProfile: initialStoreProfile,
          legalDocs: initialLegalDocs,
          payoutDetails: initialPayoutDetails,
        });
      },
    }),
    {
      name: "vendor-onboarding-store",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
    }
  )
);
