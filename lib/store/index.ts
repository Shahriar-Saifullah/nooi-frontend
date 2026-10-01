/**
 * Barrel export for all Zustand stores.
 * Legacy stores remain in lib/store.ts for backwards compatibility.
 */
export { useCartStore } from "./cart.store";
export type { CartItem, CartProduct, CartVariant, CartStore } from "./cart.store";

export { useVendorStore } from "./vendor.store";
export type {
  VendorAccountData,
  VendorStoreProfile,
  VendorLegalDocs,
  VendorPayoutDetails,
  FulfillmentType,
  UploadedFile,
  VendorState,
} from "./vendor.store";
