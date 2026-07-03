import '../global.css';

import NetInfo from '@react-native-community/netinfo';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
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

// MMKV asosidagi sinxron persister — ilova offline ochilsa ham oxirgi
// yuklangan mahsulot/buyurtma keshi ko'rsatiladi (bo'sh ekran o'rniga).
const persister = createSyncStoragePersister({
  storage,
  key: 'ecom_rq_cache_v1',
});

export default function RootLayout() {
  const hydrate = useSession((s) => s.hydrate);
  const loading = useSession((s) => s.loading);
  const isAuthenticated = useSession((s) => s.isAuthenticated);

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

  if (loading) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}
      >
        <ActivityIndicator size="large" color="#6366f1" />
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
