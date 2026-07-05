import '../global.css';

import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  useFonts,
} from '@expo-google-fonts/playfair-display';
import NetInfo from '@react-native-community/netinfo';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider, type Persister } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { ActivityIndicator, AppState, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '../src/components/error-boundary';
import { UpdateBanner } from '../src/components/update-banner';
import { storage } from '../src/lib/storage';
import { useSession } from '../src/store/session';
import { Toaster } from '../src/ui/toaster';

// Online holatini NetInfo bilan boshqaramiz — offline'da refetch to'xtaydi,
// internet qaytganda avtomatik refetch bo'ladi (refetchOnReconnect).
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(Boolean(state.isConnected))),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60_000, // 24 soat — offline'da eski keshdan foydalanish uchun
      retry: 2,
      refetchOnReconnect: true,
    },
  },
});

// MMKV asosidagi persister — ilova offline ochilsa ham oxirgi yuklangan
// mahsulot keshi ko'rsatiladi (bo'sh ekran o'rniga). Qo'lda yozildi va har doim
// haqiqiy Promise qaytaradi: createSyncStoragePersister restore paytida
// "promise.then is not a function" ogohlantirishini berardi.
const RQ_CACHE_KEY = 'ecom_rq_cache_v1';
const persister: Persister = {
  persistClient: (client) => {
    try {
      storage.setItem(RQ_CACHE_KEY, JSON.stringify(client));
    } catch {
      // yozib bo'lmasa — jimgina o'tkazamiz (kesh ixtiyoriy)
    }
    return Promise.resolve();
  },
  restoreClient: () => {
    try {
      const cached = storage.getItem(RQ_CACHE_KEY);
      return Promise.resolve(cached ? JSON.parse(cached) : undefined);
    } catch {
      return Promise.resolve(undefined);
    }
  },
  removeClient: () => {
    storage.removeItem(RQ_CACHE_KEY);
    return Promise.resolve();
  },
};

export default function RootLayout() {
  const hydrate = useSession((s) => s.hydrate);
  const loading = useSession((s) => s.loading);
  const isAuthenticated = useSession((s) => s.isAuthenticated);

  // Playfair Display (sarlavha/narx) + Inter (matn) — brend tipografiyasi
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  React.useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Logout'da in-memory keshni tozalaymiz — keyingi foydalanuvchi oldingi
  // buyurtma/loyalty ma'lumotlarini ko'rmasin.
  const prevAuth = React.useRef(isAuthenticated);
  React.useEffect(() => {
    if (prevAuth.current && !isAuthenticated) queryClient.clear();
    prevAuth.current = isAuthenticated;
  }, [isAuthenticated]);

  // Ilova foreground'ga qaytganda stale query'larni yangilash (React Query RN'da
  // buni avtomatik qilmaydi — AppState orqali o'zimiz ulaymiz).
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
    });
    return () => sub.remove();
  }, []);

  if (loading || !fontsLoaded) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}
      >
        <ActivityIndicator size="large" color="#531625" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 24 * 60 * 60_000,
          // Faqat ommaviy katalog keshini diskka yozamiz — shaxsiy ma'lumotlar
          // (orders/loyalty/me/addresses) hech qachon persist qilinmaydi.
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              const key = query.queryKey?.[0];
              return key === 'products' || key === 'product';
            },
          },
        }}
      >
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="product/[slug]" options={{ presentation: 'card' }} />
            <Stack.Screen
              name="auth/login"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="checkout" options={{ presentation: 'card' }} />
          </Stack>
          <UpdateBanner />
          <Toaster />
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}
