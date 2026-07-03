// Yaqinda ko'rilgan mahsulotlar — MMKV'da saqlanadi (zustand persist).
// To'liq snapshot saqlaymiz, shunda bosh sahifa rail'i qayta so'rovsiz chizadi.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { type MockProduct } from '../lib/mock-data';
import { storage } from '../lib/storage';

const MAX = 20;

interface RecentlyViewedState {
  items: MockProduct[];
  add: (product: MockProduct) => void;
  clear: () => void;
}

export const useRecentlyViewed = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      items: [],
      add: (product) =>
        set((s) => ({
          items: [product, ...s.items.filter((p) => p.id !== product.id)].slice(0, MAX),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'ecom_recently_viewed_v1',
      storage: createJSONStorage(() => storage),
    },
  ),
);
