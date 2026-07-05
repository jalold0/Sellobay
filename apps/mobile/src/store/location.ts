import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getCurrentLocation, reverseGeocode } from '../lib/geo';
import { storage } from '../lib/storage';

interface LocationState {
  label: string; // masalan "Toshkent, Yunusobod"
  loading: boolean;
  refresh: () => Promise<void>;
}

// Qurilma joylashuvi (GPS → reverse geocode). Label saqlanadi, keyingi
// ochilishда darrov ko'rinadi; refresh() qayta aniqlaydi.
export const useLocation = create<LocationState>()(
  persist(
    (set) => ({
      label: 'Toshkent',
      loading: false,
      refresh: async () => {
        set({ loading: true });
        const coords = await getCurrentLocation();
        if (!coords) {
          set({ loading: false });
          return;
        }
        const addr = await reverseGeocode(coords.lat, coords.lng);
        const parts = [addr.city ?? addr.region, addr.street].filter(Boolean) as string[];
        set({ label: parts.length ? parts.join(', ') : 'Toshkent', loading: false });
      },
    }),
    {
      name: 'ecom_location_v1',
      storage: createJSONStorage(() => storage),
      partialize: (s) => ({ label: s.label }),
    },
  ),
);
