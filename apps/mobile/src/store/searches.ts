// Oxirgi qidiruvlar — MMKV'da saqlanadi (zustand persist).
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '../lib/storage';

const MAX = 8;

interface SearchesState {
  recent: string[];
  add: (q: string) => void;
  remove: (q: string) => void;
  clear: () => void;
}

export const useSearches = create<SearchesState>()(
  persist(
    (set) => ({
      recent: [],
      add: (q) => {
        const term = q.trim();
        if (!term) return;
        set((s) => ({
          recent: [term, ...s.recent.filter((x) => x.toLowerCase() !== term.toLowerCase())].slice(
            0,
            MAX,
          ),
        }));
      },
      remove: (q) => set((s) => ({ recent: s.recent.filter((x) => x !== q) })),
      clear: () => set({ recent: [] }),
    }),
    {
      name: 'ecom_searches_v1',
      storage: createJSONStorage(() => storage),
    },
  ),
);
