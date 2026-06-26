// Session — auth holatini boshqarish. Token'lar secureStore'da.

import { create } from 'zustand';

import { secureStorage, storage, STORAGE_KEYS } from '../lib/storage';

const USER_KEY = 'ecom_user_v1';

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
  signOut: () => Promise<void>;
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
  signOut: async () => {
    await secureStorage.remove(STORAGE_KEYS.accessToken);
    await secureStorage.remove(STORAGE_KEYS.refreshToken);
    storage.delete(USER_KEY);
    set({ user: null, isAuthenticated: false });
  },
}));
