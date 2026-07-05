import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '../lib/storage';

// Ikki xarid rejimi (redizayn asosiy konsepsiyasi):
//  - 'local'  → Sellobay Lokal (O'zbekiston sotuvchilari, uygacha yetkazish)
//  - 'global' → Sellobay Global (Xitoy/Turkiya/Koreya import, so'mda narx)
export type ShopMode = 'local' | 'global';

interface ModeState {
  mode: ShopMode;
  setMode: (mode: ShopMode) => void;
  toggle: () => void;
}

export const useMode = create<ModeState>()(
  persist(
    (set) => ({
      mode: 'local',
      setMode: (mode) => set({ mode }),
      toggle: () => set((s) => ({ mode: s.mode === 'local' ? 'global' : 'local' })),
    }),
    {
      name: 'ecom_mode_v1',
      storage: createJSONStorage(() => storage),
    },
  ),
);
