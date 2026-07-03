import { Link } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import * as React from 'react';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

// Coupang uslubidagi promo karusel — sahifalanadigan (paging) slaydlar + nuqtalar.
export interface PromoSlide {
  key: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  cta: string;
  href: string;
  bg: string; // slayd foni (brend rangi)
  fg?: string; // matn rangi (default oq)
  ctaBg?: string; // tugma foni (default oq)
  ctaFg?: string; // tugma matni (default slayd foni)
}

export function PromoCarousel({ slides }: { slides: PromoSlide[] }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = React.useState(0);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View>
      <FlatList
        data={slides}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item }) => {
          const fg = item.fg ?? '#ffffff';
          return (
            <View style={{ width }}>
              <View
                style={{ backgroundColor: item.bg }}
                className="mx-4 overflow-hidden rounded-3xl p-5"
              >
                {item.eyebrow ? (
                  <View className="flex-row items-center gap-1 self-start rounded-full bg-white/15 px-2 py-1">
                    <Sparkles size={10} color={fg} />
                    <Text style={{ color: fg }} className="text-[10px] font-medium">
                      {item.eyebrow}
                    </Text>
                  </View>
                ) : null}
                <Text style={{ color: fg }} className="mt-3 text-2xl font-black leading-tight">
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text style={{ color: fg }} className="mt-2 max-w-[80%] text-xs opacity-80">
                    {item.subtitle}
                  </Text>
                ) : null}
                <Link href={item.href as never} asChild>
                  <Pressable
                    style={{ backgroundColor: item.ctaBg ?? '#ffffff' }}
                    className="mt-4 self-start rounded-full px-5 py-2.5 active:opacity-85"
                  >
                    <Text
                      style={{ color: item.ctaFg ?? item.bg }}
                      className="text-sm font-semibold"
                    >
                      {item.cta} →
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          );
        }}
      />
      <View className="mt-3 flex-row justify-center gap-1.5">
        {slides.map((s, i) => (
          <View
            key={s.key}
            className={
              i === index
                ? 'bg-primary h-1.5 w-4 rounded-full'
                : 'bg-border h-1.5 w-1.5 rounded-full'
            }
          />
        ))}
      </View>
    </View>
  );
}
