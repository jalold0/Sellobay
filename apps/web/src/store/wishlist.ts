'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface WishlistState {
  ids: string[];
  toggle: (productId: string) => void;
  remove: (productId: string) => void;
  has: (productId: string) => boolean;
  clear: () => void;
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set((s) => ({
          ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id],
        })),
      remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
      has: (id) => get().ids.includes(id),
      clear: () => set({ ids: [] }),
    }),
    {
      name: 'ecom_wishlist_v1',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
