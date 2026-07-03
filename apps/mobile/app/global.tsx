import { useRouter } from 'expo-router';
import { ChevronLeft, Plane, Search } from 'lucide-react-native';
import * as React from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { globalProducts, type MockProduct } from '../src/lib/mock-data';
import { useT } from '../src/lib/useT';
import { ProductCard } from '../src/ui/product-card';

// Demo katalog — davlat bo'yicha bo'limlar (haqiqiy sotib olishsiz)
const SECTIONS: Array<{ code: 'CN' | 'TR' | 'KR'; flag: string; title: string }> = [
  { code: 'CN', flag: '🇨🇳', title: 'Xitoydan mashhur' },
  { code: 'TR', flag: '🇹🇷', title: 'Turkiyadan mashhur' },
  { code: 'KR', flag: '🇰🇷', title: 'Koreyadan mashhur' },
];

export default function GlobalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { locale } = useT();

  return (
    <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center gap-2 px-3 py-2.5">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Lokal"
          className="active:bg-muted h-9 w-9 items-center justify-center rounded-full"
          hitSlop={6}
        >
          <ChevronLeft size={22} color="#0A0A0C" />
        </Pressable>
        <Text className="text-foreground text-lg font-black">
          Sellobay <Text className="text-primary">Global</Text>
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Search (demo — global katalog) */}
        <View className="bg-muted mx-4 mt-1 flex-row items-center gap-2 rounded-full px-4 py-3">
          <Search size={16} color="#6B6B73" />
          <Text className="text-muted-foreground text-sm">Global katalogdan qidirish…</Text>
        </View>

        {/* Yetkazish banner */}
        <View className="bg-dark mx-4 mt-3 flex-row items-center justify-between rounded-2xl p-4">
          <View className="flex-1">
            <Text className="text-gold text-[11px] font-bold uppercase tracking-widest">
              Global yetkazish
            </Text>
            <Text className="mt-1 text-sm text-white">10–18 kun · bojxona kiritilgan · so‘mda</Text>
          </View>
          <Plane size={26} color="#C9A961" />
        </View>

        {/* Demo eslatma */}
        <View className="mx-4 mt-3">
          <View className="bg-muted self-start rounded-full px-3 py-1">
            <Text className="text-muted-foreground text-[11px]">
              Demo katalog — namoyish uchun (haqiqiy buyurtmasiz)
            </Text>
          </View>
        </View>

        {/* Davlat bo'limlari */}
        {SECTIONS.map((sec) => {
          const items = globalProducts.filter((p) => p.sourceCountry === sec.code);
          if (items.length === 0) return null;
          return (
            <View key={sec.code} className="mt-6 gap-3">
              <View className="flex-row items-center gap-2 px-4">
                <Text className="text-xl">{sec.flag}</Text>
                <Text className="text-foreground text-lg font-bold">{sec.title}</Text>
              </View>
              <FlatList
                data={items}
                keyExtractor={(p) => p.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 12, gap: 12 }}
                renderItem={({ item }: { item: MockProduct }) => (
                  <View style={{ width: 160 }}>
                    <ProductCard product={item} locale={locale} />
                  </View>
                )}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
