import * as React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Gradient } from './gradient';
import { ProductCard } from './product-card';

import type { MockProduct } from '../lib/mock-data';

// Kun oxirigacha qolgan HH:MM:SS (dizayn: qora qutilar, oltin ikki nuqta).
function useEndOfDayCountdown() {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const total = Math.max(0, Math.floor((end.getTime() - now) / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    hh: pad(Math.floor(total / 3600)),
    mm: pad(Math.floor((total % 3600) / 60)),
    ss: pad(total % 60),
  };
}

function Box({ children, gold }: { children: string; gold?: boolean }) {
  return (
    <View
      className="min-w-[30px] items-center rounded-md px-1.5 py-1"
      style={{ backgroundColor: '#0A0A0C' }}
    >
      <Text className="text-sm font-bold" style={{ color: gold ? '#E5C77A' : '#fff' }}>
        {children}
      </Text>
    </View>
  );
}

export function FlashSale({ products }: { products: MockProduct[] }) {
  const cd = useEndOfDayCountdown();
  if (!products.length) return null;

  return (
    <Gradient colors={['#3A0E19', '#531625']} style={{ marginTop: 10, paddingVertical: 18 }}>
      <View className="flex-row items-center justify-between px-4">
        <View className="flex-row items-center gap-2.5">
          <Text className="text-xl" style={{ color: '#E5C77A' }}>
            ⚡
          </Text>
          <View>
            <Text className="font-serif text-[19px] leading-5 text-white">Flash Sale</Text>
            <Text className="mt-0.5 text-[10px]" style={{ color: '#E5C77A' }}>
              Bugun tugaydi · shoshiling
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-1">
          <Box>{cd.hh}</Box>
          <Text className="font-bold" style={{ color: '#E5C77A' }}>
            :
          </Text>
          <Box>{cd.mm}</Box>
          <Text className="font-bold" style={{ color: '#E5C77A' }}>
            :
          </Text>
          <Box gold>{cd.ss}</Box>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 16 }}
      >
        {products.map((p) => (
          <View key={p.id} style={{ width: 156 }}>
            <ProductCard product={p} />
          </View>
        ))}
      </ScrollView>
    </Gradient>
  );
}
