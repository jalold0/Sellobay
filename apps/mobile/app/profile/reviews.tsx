import { useRouter } from 'expo-router';
import { ChevronLeft, Star, ThumbsUp } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { productImage } from '../../src/lib/mock-data';
import { useT } from '../../src/lib/useT';
import { useLocale, type Locale } from '../../src/store/locale';
import { AppImage } from '../../src/ui/app-image';

interface PendingItem {
  seed: string;
  brand: string;
  name: string;
}

interface WrittenReview {
  seed: string;
  name: string;
  rating: number;
  body: string;
  date: string;
  helpful: number;
}

const PENDING: PendingItem[] = [
  { seed: 'nike-air', brand: 'Nike', name: 'Nike Air Max 270' },
  { seed: 'dior-sauvage', brand: 'Dior', name: 'Dior Sauvage EDP 100ml' },
  { seed: 'apple-airpods', brand: 'Apple', name: 'AirPods Pro (2-avlod)' },
];

const WRITTEN: WrittenReview[] = [
  {
    seed: 'zara-coat',
    name: 'Zara Wool Blend Coat',
    rating: 5,
    body: 'Sifati aʼlo darajada, oʻlchami mos keldi. Materiali issiq va yengil. Yetkazib berish ham tez boʻldi.',
    date: '3 kun oldin',
    helpful: 12,
  },
  {
    seed: 'sony-headset',
    name: 'Sony WH-1000XM5',
    rating: 4,
    body: 'Shovqinni pasaytirish juda zoʻr, ovozi toza. Faqat quloqchin biroz qattiqroq boʻlsa yaxshi boʻlardi.',
    date: '2 hafta oldin',
    helpful: 34,
  },
];

const HELPFUL_LABEL: Record<Locale, (n: number) => string> = {
  uz: (n) => `${n} kishi foydali deb topdi`,
  ru: (n) => `${n} чел. сочли полезным`,
  en: (n) => `${n} people found this helpful`,
};

function Stars({ rating }: { rating: number }) {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          color={i <= rating ? '#C9A961' : '#E0DEDA'}
          fill={i <= rating ? '#C9A961' : '#E0DEDA'}
        />
      ))}
    </View>
  );
}

export default function ReviewsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const locale = useLocale((s) => s.locale);

  const helpfulLabel = HELPFUL_LABEL[locale] ?? HELPFUL_LABEL.uz;

  return (
    <View className="bg-paper flex-1" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="bg-muted h-10 w-10 items-center justify-center rounded-full"
        >
          <ChevronLeft size={20} color="#0A0A0C" />
        </Pressable>
        <Text className="text-foreground font-serif text-2xl leading-6">
          {t('profile.nav.reviews')}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Sharh kutmoqda */}
        <Text className="text-foreground px-4 pb-3 pt-2 text-[13px] font-bold">Sharh kutmoqda</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        >
          {PENDING.map((item) => (
            <View
              key={item.seed}
              className="border-border w-[160px] rounded-[16px] border bg-white p-3"
            >
              <View className="flex-row gap-2.5">
                <AppImage
                  source={productImage(item.seed, 160)}
                  className="bg-muted h-12 w-12 rounded-[12px]"
                  contentFit="cover"
                />
                <View className="flex-1">
                  <Text className="text-[10px] font-extrabold uppercase text-neutral-300">
                    {item.brand}
                  </Text>
                  <Text numberOfLines={2} className="text-foreground text-[12px] leading-4">
                    {item.name}
                  </Text>
                </View>
              </View>
              <Pressable className="bg-primary mt-3 h-[38px] flex-row items-center justify-center gap-1.5 rounded-full">
                <Star size={14} color="#E5C77A" fill="#E5C77A" />
                <Text className="text-[12px] font-bold text-white">Sharh yozish</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>

        {/* Yozilgan sharhlar */}
        <Text className="text-foreground px-4 pb-3 pt-6 text-[13px] font-bold">
          Yozilgan sharhlar
        </Text>
        <View className="gap-3 px-4">
          {WRITTEN.map((review) => (
            <View
              key={review.seed}
              className="border-border rounded-[18px] border bg-white p-[14px]"
            >
              <View className="flex-row gap-3">
                <AppImage
                  source={productImage(review.seed, 160)}
                  className="bg-muted h-[46px] w-[46px] rounded-[12px]"
                  contentFit="cover"
                />
                <View className="flex-1">
                  <Text className="text-foreground text-[13px] font-semibold">{review.name}</Text>
                  <View className="mt-1 flex-row items-center justify-between">
                    <Stars rating={review.rating} />
                    <Text className="text-[11px] text-neutral-300">{review.date}</Text>
                  </View>
                </View>
              </View>
              <Text className="mt-[11px] text-[13px] leading-5" style={{ color: '#3a3a40' }}>
                {review.body}
              </Text>
              <View className="border-border mt-[11px] flex-row items-center gap-1.5 border-t pt-[11px]">
                <ThumbsUp size={14} color="#9a9aa2" />
                <Text className="text-[11px] text-neutral-300">{helpfulLabel(review.helpful)}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
