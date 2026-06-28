// Sellobay — OTA update banner
// expo-updates orqali yangi JS bundle borligini tekshiradi va foydalanuvchiga
// "Yangilash" tugmasi taklif qiladi. Faqat EAS build'da ishlaydi, dev/Expo Go'da skip.

import * as Updates from 'expo-updates';
import { ArrowDown, X } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type State = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'dismissed';

export function UpdateBanner() {
  const insets = useSafeAreaInsets();
  const [state, setState] = React.useState<State>('idle');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Dev/Expo Go'da update API ishlamaydi (checkForUpdateAsync dev build'da
    // "not supported" xatosini beradi) — faqat production/preview build'da tekshiramiz.
    if (__DEV__ || !Updates.isEnabled) return;
    let cancelled = false;
    setState('checking');
    Updates.checkForUpdateAsync()
      .then((res) => {
        if (cancelled) return;
        if (res.isAvailable) setState('available');
        else setState('idle');
      })
      .catch((err) => {
        if (cancelled) return;
        setState('error');
        setErrorMsg(err?.message ?? "Yangilanishni tekshirib bo'lmadi");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyUpdate = async () => {
    setState('downloading');
    try {
      await Updates.fetchUpdateAsync();
      setState('ready');
      // Qisqa kechikish — foydalanuvchi "Tayyor!" ko'rsin
      setTimeout(() => {
        void Updates.reloadAsync();
      }, 600);
    } catch (err) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : "Yuklab bo'lmadi");
    }
  };

  if (state === 'idle' || state === 'checking' || state === 'dismissed') return null;

  return (
    <View
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        top: insets.top + 8,
        zIndex: 9999,
        backgroundColor: '#0A0A0C',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#8B0020',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {state === 'downloading' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ArrowDown size={18} color="#fff" strokeWidth={2.5} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
            {state === 'available'
              ? 'Yangilanish mavjud'
              : state === 'downloading'
                ? 'Yuklanmoqda...'
                : state === 'ready'
                  ? 'Tayyor — qayta yuklanmoqda'
                  : 'Xato'}
          </Text>
          <Text style={{ color: '#A7A7AF', fontSize: 11, marginTop: 1 }}>
            {state === 'available'
              ? "Sellobay'ning yangi versiyasini o'rnatasizmi?"
              : state === 'downloading'
                ? 'Bir necha soniyada tugaydi'
                : state === 'ready'
                  ? 'Ilova qayta ishga tushmoqda...'
                  : (errorMsg ?? "Noma'lum xato")}
          </Text>
        </View>

        {state === 'available' ? (
          <>
            <Pressable onPress={() => setState('dismissed')} hitSlop={8} style={{ padding: 4 }}>
              <X size={18} color="#A7A7AF" />
            </Pressable>
            <Pressable
              onPress={applyUpdate}
              style={{
                backgroundColor: '#8B0020',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Yangilash</Text>
            </Pressable>
          </>
        ) : state === 'error' ? (
          <Pressable onPress={() => setState('dismissed')} hitSlop={8} style={{ padding: 4 }}>
            <X size={18} color="#A7A7AF" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
