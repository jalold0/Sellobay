// Session — auth holatini boshqarish. Token'lar secureStore'da.

import { create } from 'zustand';

import { API_BASE } from '../lib/api/core';
import { secureStorage, storage, STORAGE_KEYS } from '../lib/storage';

const USER_KEY = 'ecom_user_v1';

// Chiqishda serverga so'rov 12s kutmasin — foydalanuvchi chiqishga urinayapti.
const LOGOUT_TIMEOUT_MS = 4_000;

interface User {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface SessionState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  hydrate: () => Promise<void>;
  signIn: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
  /** `revoke: false` — refresh token allaqachon yaroqsiz (masalan 401 dan keyin). */
  signOut: (opts?: { revoke?: boolean }) => Promise<void>;
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,
  hydrate: async () => {
    try {
      const access = await secureStorage.get(STORAGE_KEYS.accessToken);
      const userRaw = storage.getString(USER_KEY);
      if (access && userRaw) {
        set({ user: JSON.parse(userRaw) as User, isAuthenticated: true, loading: false });
      } else {
        set({ user: null, isAuthenticated: false, loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },
  signIn: async (user, accessToken, refreshToken) => {
    await secureStorage.set(STORAGE_KEYS.accessToken, accessToken);
    await secureStorage.set(STORAGE_KEYS.refreshToken, refreshToken);
    storage.setString(USER_KEY, JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },
  updateUser: (patch) =>
    set((s) => {
      if (!s.user) return s;
      const user = { ...s.user, ...patch };
      storage.setString(USER_KEY, JSON.stringify(user));
      return { user };
    }),
  signOut: async (opts) => {
    const refresh = await secureStorage.get(STORAGE_KEYS.refreshToken);

    // Serverda BEKOR QILISH — mahalliy tozalashdan oldin, token hali qo'lda.
    //
    // Ilgari bu qadam umuman yo'q edi: chiqishda faqat telefondagi nusxa
    // o'chirilardi, refresh token esa bazada 30 kun yaroqli qolardi. Telefon
    // boshqa qo'lga o'tsa yoki zaxiradan olinsa, undan yangi access token
    // olish mumkin edi.
    //
    // Xato bo'lsa ham chiqish DAVOM ETADI — tarmoq yo'qligi foydalanuvchini
    // o'z telefonida ushlab qolish uchun sabab emas.
    if ((opts?.revoke ?? true) && refresh) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), LOGOUT_TIMEOUT_MS);
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ refresh }),
          signal: ctrl.signal,
        });
      } catch {
        // tarmoq/timeout — jim o'tamiz
      } finally {
        clearTimeout(timer);
      }
    }

    await secureStorage.remove(STORAGE_KEYS.accessToken);
    await secureStorage.remove(STORAGE_KEYS.refreshToken);
    storage.delete(USER_KEY);
    set({ user: null, isAuthenticated: false });
  },
}));
