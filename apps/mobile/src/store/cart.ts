import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage, STORAGE_KEYS } from '../lib/storage';

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  brand: string;
  slug: string;
  imageSeed: string;
  /** Sotuvchi yuklagan haqiqiy rasm. Bo'lmasa imageSeed ishlatiladi. */
  imageUrl?: string;
  unitPrice: number;
  oldPrice?: number;
  currency: 'UZS';
  quantity: number;
  color?: string;
  size?: string;
  maxQuantity?: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clear: () => void;
  totalQuantity: () => number;
  subtotal: () => number;
}

function makeKey(productId: string, variantId?: string, color?: string, size?: string): string {
  return [productId, variantId ?? '-', color ?? '-', size ?? '-'].join('|');
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
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
              ? {
                  ...i,
                  quantity: Math.max(1, Math.min(qty, i.maxQuantity ?? Number.MAX_SAFE_INTEGER)),
                }
              : i,
          ),
        })),
      clear: () => set({ items: [] }),
      totalQuantity: () => get().items.reduce((s, i) => s + i.quantity, 0),
      subtotal: () => get().items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    }),
    {
      name: STORAGE_KEYS.cart,
      storage: createJSONStorage(() => storage),
    },
  ),
);
