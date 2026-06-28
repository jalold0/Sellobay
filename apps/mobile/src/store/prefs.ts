// Foydalanuvchi sozlamalari (lokal) — bildirishnoma toggle'lari, haptik.
// MMKV'da saqlanadi (zustand persist). Backend talab qilmaydi.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '../lib/storage';

export interface PrefsState {
  notifEmail: boolean;
  notifSms: boolean;
  notifPush: boolean;
  notifMarketing: boolean;
  haptics: boolean;
  toggle: (key: keyof Omit<PrefsState, 'toggle' | 'set'>) => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      notifEmail: true,
      notifSms: true,
      notifPush: true,
      notifMarketing: false,
      haptics: true,
      toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<PrefsState>),
    }),
    {
      name: 'ecom_prefs_v1',
      storage: createJSONStorage(() => storage),
    },
  ),
);
