import { useRouter } from 'expo-router';
import { ArrowRight, Sparkles } from 'lucide-react-native';
import * as React from 'react';
import { FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';

import { haptics } from '../lib/haptics';
import { heroSlides } from '../lib/storefront';

import { Gradient } from './gradient';

// Avtomatik aylanuvchi hero karusel (3 slayd, 4.5s). Swipe ham ishlaydi.
export function HeroBanner() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardW = width - 32; // 16px chetlar
  const listRef = React.useRef<FlatList>(null);
  const [idx, setIdx] = React.useState(0);
  const idxRef = React.useRef(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      const next = (idxRef.current + 1) % heroSlides.length;
      idxRef.current = next;
      setIdx(next);
      listRef.current?.scrollToOffset({ offset: next * cardW, animated: true });
    }, 4500);
    return () => clearInterval(timer);
  }, [cardW]);

  return (
    <View className="bg-white pb-1 pt-3.5">
      <FlatList
        ref={listRef}
        data={heroSlides}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardW}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16 }}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / cardW);
          idxRef.current = i;
          setIdx(i);
        }}
        renderItem={({ item }) => (
          <Gradient
            colors={item.colors}
            style={{
              width: cardW,
              minHeight: 172,
              borderRadius: 24,
              padding: 22,
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                position: 'absolute',
                right: -30,
                top: -30,
                width: 150,
                height: 150,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            />
            <View className="flex-row items-center gap-1.5 self-start rounded-full bg-white/[0.16] px-2.5 py-1.5">
              <Sparkles size={11} color={item.fg} fill={item.fg} />
              <Text className="text-[10px] font-bold tracking-[0.1em]" style={{ color: item.fg }}>
                {item.eyebrow}
              </Text>
            </View>
            <Text
              className="mt-3 font-serif text-2xl leading-7"
              style={{ color: item.fg, maxWidth: '80%' }}
            >
              {item.title}
            </Text>
            <Text
              className="mt-1.5 text-xs"
              style={{ color: item.fg, opacity: 0.82, maxWidth: '78%' }}
            >
              {item.subtitle}
            </Text>
            <Pressable
              onPress={() => {
                haptics.select();
                router.push(item.href as never);
              }}
              className="mt-4 flex-row items-center gap-1.5 self-start rounded-full px-4 py-2.5"
              style={{ backgroundColor: item.ctaBg }}
            >
              <Text className="text-[13px] font-semibold" style={{ color: item.ctaFg }}>
                {item.cta}
              </Text>
              <ArrowRight size={14} color={item.ctaFg} />
            </Pressable>
          </Gradient>
        )}
      />
      <View className="mt-3 flex-row justify-center gap-1.5">
        {heroSlides.map((_, i) => (
          <View
            key={i}
            className="h-1.5 rounded-full"
            style={{
              width: i === idx ? 18 : 6,
              backgroundColor: i === idx ? '#531625' : '#d8d0cc',
            }}
          />
        ))}
      </View>
    </View>
  );
}
