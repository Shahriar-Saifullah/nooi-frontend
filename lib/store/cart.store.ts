import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// --- Types ---

export interface CartVariant {
  id: string;
  sku: string;
  color?: string;
  material?: string;
  price: number;
  images?: string[];
  dimensions_cm?: { width: number; height: number; depth: number };
}

export interface CartProduct {
  id: string;
  title: string;
  category: string;
  canvas_model_id?: string;
  retailers?: {
    id: string;
    name: string;
    logo_url?: string;
  };
}

export interface CartItem {
  id: string;
  variant_id: string;
  quantity: number;
  product_variants?: CartVariant & { products?: CartProduct };
  product_data?: {
    title?: string;
    price?: number;
    retailer_name?: string;
    color?: string;
    image?: string;
  };
}

export interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  sessionId: string;
  isSyncing: boolean;

  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  setItems: (items: CartItem[]) => void;
  addItemOptimistic: (item: CartItem) => void;
  removeItemOptimistic: (itemId: string) => void;
  updateQuantityOptimistic: (itemId: string, quantity: number) => void;
  clearCart: () => void;

  totalItems: () => number;
  subtotal: () => number;
  groupedByRetailer: () => Record<string, CartItem[]>;

  setSyncing: (value: boolean) => void;
}

function generateSessionId(): string {
  return "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      sessionId: generateSessionId(),
      isSyncing: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      setItems: (items) => set({ items }),

      addItemOptimistic: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.variant_id === item.variant_id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variant_id === item.variant_id
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),

      removeItemOptimistic: (itemId) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== itemId) })),

      updateQuantityOptimistic: (itemId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.id !== itemId) };
          }
          return {
            items: state.items.map((i) =>
              i.id === itemId ? { ...i, quantity } : i
            ),
          };
        }),

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotal: () =>
        get().items.reduce((sum, item) => {
          const price =
            item.product_variants?.price ??
            item.product_data?.price ??
            0;
          return sum + price * item.quantity;
        }, 0),

      groupedByRetailer: () => {
        const groups: Record<string, CartItem[]> = {};
        for (const item of get().items) {
          const retailerName =
            item.product_variants?.products?.retailers?.name ??
            item.product_data?.retailer_name ??
            "Unknown Retailer";
          if (!groups[retailerName]) groups[retailerName] = [];
          groups[retailerName].push(item);
        }
        return groups;
      },

      setSyncing: (value) => set({ isSyncing: value }),
    }),
    {
      name: "cart-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        sessionId: state.sessionId,
      }),
    }
  )
);
