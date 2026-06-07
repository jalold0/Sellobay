// Savatcha state — Zustand + localStorage persist.
// Server uchun tayyor: backend bo'lganda `syncWithServer` ni qo'shamiz.

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string; // pickLocalized natijasi
  brand: string;
  slug: string;
  imageSeed: string;
  unitPrice: number;
  oldPrice?: number;
  currency: 'UZS';
  quantity: number;
  // Variant snapshot
  color?: string;
  size?: string;
  // Inventory snapshot
  maxQuantity?: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  clear: () => void;
  // Selectors
  totalQuantity: () => number;
  subtotal: () => number;
  itemKey: (productId: string, variantId?: string, color?: string, size?: string) => string;
}

// Item ID — productId + variant fingerprint
function makeKey(productId: string, variantId?: string, color?: string, size?: string): string {
  return [productId, variantId ?? '-', color ?? '-', size ?? '-'].join('|');
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      itemKey: (productId, variantId, color, size) => makeKey(productId, variantId, color, size),
      addItem: (input) =>
        set((state) => {
          const id = makeKey(input.productId, input.variantId, input.color, input.size);
          const existing = state.items.find((i) => i.id === id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === id
                  ? {
                      ...i,
                      quantity: Math.min(
                        i.quantity + input.quantity,
                        input.maxQuantity ?? Number.MAX_SAFE_INTEGER,
                      ),
                    }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...input, id }] };
        }),
      removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      updateQuantity: (id, qty) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id
              ? { ...i, quantity: Math.max(1, Math.min(qty, i.maxQuantity ?? Number.MAX_SAFE_INTEGER)) }
              : i,
          ),
        })),
      increment: (id) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id
              ? { ...i, quantity: Math.min(i.quantity + 1, i.maxQuantity ?? Number.MAX_SAFE_INTEGER) }
              : i,
          ),
        })),
      decrement: (id) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i,
          ),
        })),
      clear: () => set({ items: [] }),
      totalQuantity: () => get().items.reduce((s, i) => s + i.quantity, 0),
      subtotal: () => get().items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    }),
    {
      name: 'ecom_cart_v1',
      storage: createJSONStorage(() => localStorage),
      // SSR uchun rehydrate'gacha bo'sh holatda boshlanadi (hydration mismatch'ning oldini olish)
      skipHydration: true,
    },
  ),
);

// Client component'larda useEffect ichida rehydrate qiladigan helper
export function useCartHydration() {
  if (typeof window === 'undefined') return;
  useCart.persist.rehydrate();
}
