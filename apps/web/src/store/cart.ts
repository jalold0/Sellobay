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
  /** Haqiqiy rasm URL (DB'dan). Bo'lmasa imageSeed placeholder. */
  imageUrl?: string;
  unitPrice: number;
  oldPrice?: number;
  currency: 'UZS';
  quantity: number;
  // Variant snapshot
  color?: string;
  size?: string;
  // Inventory snapshot
  maxQuantity?: number;
  /**
   * Global (Xitoydan) tovarmi. Savatni guruhlash uchun — lokal va global tovar
   * alohida buyurtma qilinadi (turli muddat va yetkazish). UI ishorasi; haqiqat
   * serverda (`orders-server` MIXED_CART).
   */
  isGlobal?: boolean;
}

/**
 * Qo'llanilgan promokod. Chegirma SERVERDA hisoblangan qiymat
 * (/api/promo/validate) — klientda o'ylab chiqarilmaydi. Bu yerda saqlanadi,
 * chunki savatdan checkout'ga o'tganda kod yo'qolib ketmasligi kerak:
 * ilgari u faqat cart-view'ning lokal state'ida turardi va checkout
 * promokod haqida umuman bilmasdi — mijoz chegirmali summani ko'rib,
 * to'liq narxda to'lardi.
 */
export interface AppliedPromo {
  code: string;
  /** Serverning oldindan hisobi (so'm). Yakuniy summa buyurtmada qayta hisoblanadi. */
  discount: number;
  type: string;
}

interface CartState {
  items: CartItem[];
  appliedPromo: AppliedPromo | null;
  setPromo: (promo: AppliedPromo) => void;
  clearPromo: () => void;
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
      appliedPromo: null,
      setPromo: (promo) => set({ appliedPromo: promo }),
      clearPromo: () => set({ appliedPromo: null }),
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
              ? {
                  ...i,
                  quantity: Math.max(1, Math.min(qty, i.maxQuantity ?? Number.MAX_SAFE_INTEGER)),
                }
              : i,
          ),
        })),
      increment: (id) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id
              ? {
                  ...i,
                  quantity: Math.min(i.quantity + 1, i.maxQuantity ?? Number.MAX_SAFE_INTEGER),
                }
              : i,
          ),
        })),
      decrement: (id) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i,
          ),
        })),
      clear: () => set({ items: [], appliedPromo: null }),
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
