import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ProductCard } from './product-card';

import type { MockProduct } from '../lib/mock-data';

interface Props {
  title: string;
  subtitle?: string;
  products: MockProduct[];
  actionLabel?: string;
  actionHref?: string;
  cardWidth?: number;
  // Ixtiyoriy: sarlavha oldida emoji/bayroq
  emoji?: string;
}

// Sarlavha + gorizontal mahsulot lentasi (tavsiyalar, xitlar, davlat railllari).
export function ProductRail({
  title,
  subtitle,
  products,
  actionLabel,
  actionHref,
  cardWidth = 150,
  emoji,
}: Props) {
  const router = useRouter();
  if (!products.length) return null;

  return (
    <View className="pt-5">
      <View className="flex-row items-end justify-between px-4">
        <View className="flex-1">
          <Text className="text-foreground font-serif text-[19px] leading-6">
            {emoji ? `${emoji} ` : ''}
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-muted-foreground mt-0.5 text-[11px]">{subtitle}</Text>
          ) : null}
        </View>
        {actionLabel && actionHref ? (
          <Pressable
            onPress={() => router.push(actionHref as never)}
            className="flex-row items-center gap-0.5"
          >
            <Text className="text-primary text-xs font-semibold">{actionLabel}</Text>
            <ChevronRight size={13} color="#531625" />
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 14 }}
      >
        {products.map((p) => (
          <View key={p.id} style={{ width: cardWidth }}>
            <ProductCard product={p} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
