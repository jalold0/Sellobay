import { Link, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pickLocalized } from '../src/lib/format';
import { haptics } from '../src/lib/haptics';
import { categories, productImage, subcategories } from '../src/lib/mock-data';
import { useT } from '../src/lib/useT';
import { AppImage } from '../src/ui/app-image';
import { cn } from '../src/ui/cn';

// Chap reyk + o'ng grid balansi (Coupang uslubi) — biri katta, biri kichik bo'lmasin.
const RAIL_W = 96;
const H_PAD = 12;
const COLS = 3;

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { t, locale } = useT();
  const [selected, setSelected] = React.useState(0);

  const active = categories[selected]!;
  const subs = subcategories[active.id] ?? [];

  // O'ng panel va rasm o'lchamini aniq hisoblaymiz (flex-1 ambiguity yo'q)
  const panelW = width - RAIL_W;
  // Math.floor — 3 ustun aniq sig'sin (sub-piksel yaxlitlash 2 ustunga tushirmasin)
  const cellW = Math.floor((panelW - H_PAD * 2) / COLS);
  const imgSize = cellW - 12;

  return (
    <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="border-border flex-row items-center gap-2 border-b px-3 py-2.5">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          className="active:bg-muted h-9 w-9 items-center justify-center rounded-full"
          hitSlop={6}
        >
          <ChevronLeft size={22} color="#0A0A0C" />
        </Pressable>
        <Text className="text-foreground text-lg font-bold">{t('categories.title')}</Text>
      </View>

      <View className="flex-1 flex-row">
        {/* Chap reyk — kategoriyalar (tor) */}
        <ScrollView
          className="bg-muted"
          style={{ width: RAIL_W }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 4 }}
        >
          {categories.map((c, i) => {
            const isActive = i === selected;
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  haptics.select();
                  setSelected(i);
                }}
                className={cn(
                  'px-3 py-4',
                  isActive ? 'bg-background border-primary border-l-2' : 'active:bg-background/50',
                )}
              >
                <Text
                  className={cn(
                    'text-[13px] leading-5',
                    isActive ? 'text-primary font-bold' : 'text-foreground font-medium',
                  )}
                >
                  {pickLocalized(c.name, locale)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* O'ng panel — subkategoriyalar (aniq kenglik) */}
        <ScrollView
          style={{ width: panelW }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: H_PAD,
            paddingVertical: 16,
            paddingBottom: 32,
          }}
        >
          <Link href={`/catalog?category=${active.slug}` as never} asChild>
            <Pressable className="mb-3 flex-row items-center justify-between active:opacity-70">
              <Text className="text-foreground text-base font-bold">
                {pickLocalized(active.name, locale)}
              </Text>
              <View className="flex-row items-center gap-0.5">
                <Text className="text-primary text-xs">{t('common.viewAll')}</Text>
                <ChevronRight size={13} color="#8B0020" />
              </View>
            </Pressable>
          </Link>

          <View className="flex-row flex-wrap">
            {subs.map((s) => (
              <Link key={s.imageSeed} href={`/catalog?category=${active.slug}` as never} asChild>
                <Pressable
                  style={{ width: cellW }}
                  className="items-center py-2.5 active:opacity-70"
                >
                  <AppImage
                    source={productImage(s.imageSeed, 200)}
                    style={{ width: imgSize, height: imgSize, borderRadius: 16 }}
                    className="bg-muted"
                    contentFit="cover"
                  />
                  <Text
                    numberOfLines={2}
                    style={{ width: cellW - 4 }}
                    className="text-foreground mt-1.5 text-center text-[11px] leading-4"
                  >
                    {pickLocalized(s.name, locale)}
                  </Text>
                </Pressable>
              </Link>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
