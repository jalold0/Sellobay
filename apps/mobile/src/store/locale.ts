import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { type Locale, locales } from '@ecom/i18n';

import { storage } from '../lib/storage';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocale = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'uz',
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'ecom_locale_v1',
      storage: createJSONStorage(() => storage),
    },
  ),
);

export { locales };
export type { Locale };
