import { useRouter } from 'expo-router';
import { ChevronLeft, Clock, MapPin, Phone } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppMap, TASHKENT, type LatLng, type MapPoint } from '../src/components/map';
import { pickLocalized } from '../src/lib/format';
import { usePickupPoints } from '../src/lib/hooks';
import { useLocale, type Locale } from '../src/store/locale';

const L: Record<Locale, { title: string; empty: string; hint: string }> = {
  uz: {
    title: 'Topshirish punktlari',
    empty: 'Hozircha topshirish punktlari yo‘q',
    hint: 'Punktni tanlash uchun bosing',
  },
  ru: {
    title: 'Пункты выдачи',
    empty: 'Пунктов выдачи пока нет',
    hint: 'Нажмите на пункт, чтобы показать на карте',
  },
  en: {
    title: 'Pickup points',
    empty: 'No pickup points yet',
    hint: 'Tap a point to show it on the map',
  },
};

export default function PickupPointsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const locale = useLocale((s) => s.locale);
  const tr = L[locale] ?? L.uz;

  const { data: points = [], isLoading } = usePickupPoints();
  const [center, setCenter] = React.useState<LatLng>(TASHKENT);

  const mapPoints: MapPoint[] = React.useMemo(
    () =>
      points.map((p) => ({
        lat: p.latitude,
        lng: p.longitude,
        label: pickLocalized(p.name, locale),
      })),
    [points, locale],
  );

  return (
    <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-3 pb-1">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="active:bg-muted h-10 w-10 items-center justify-center rounded-full"
        >
          <ChevronLeft size={22} color="#0A0A0C" />
        </Pressable>
        <Text className="flex-1 text-center text-base font-semibold">{tr.title}</Text>
        <View className="w-10" />
      </View>

      {/* Xarita — barcha punktlar markerlari */}
      <View className="flex-1">
        <AppMap center={center} points={mapPoints} zoom={6} />
      </View>

      {/* Punktlar ro'yxati (pastki panel) */}
      <View
        className="border-border bg-background border-t"
        style={{ maxHeight: '42%', paddingBottom: insets.bottom }}
      >
        {isLoading ? (
          <View className="items-center py-8">
            <ActivityIndicator color="#531625" />
          </View>
        ) : points.length === 0 ? (
          <View className="items-center px-6 py-8">
            <MapPin size={24} color="#94a3b8" />
            <Text className="text-muted-foreground mt-2 text-center text-sm">{tr.empty}</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 12, gap: 8 }}
          >
            <Text className="text-muted-foreground px-1 pb-1 text-xs">{tr.hint}</Text>
            {points.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setCenter({ lat: p.latitude, lng: p.longitude })}
                className="border-border bg-card active:bg-muted rounded-xl border p-3"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-foreground flex-1 text-sm font-semibold">
                    {pickLocalized(p.name, locale)}
                  </Text>
                  <View className="bg-muted rounded-full px-2 py-0.5">
                    <Text className="text-muted-foreground text-[10px] font-bold">
                      {p.provider}
                    </Text>
                  </View>
                </View>
                <View className="mt-1 flex-row items-start gap-1.5">
                  <MapPin size={13} color="#94a3b8" style={{ marginTop: 1 }} />
                  <Text className="text-muted-foreground flex-1 text-xs">
                    {[p.region, p.city, p.district, p.street, p.building]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                </View>
                {p.workingHours ? (
                  <View className="mt-1 flex-row items-center gap-1.5">
                    <Clock size={13} color="#94a3b8" />
                    <Text className="text-muted-foreground text-xs">{p.workingHours}</Text>
                  </View>
                ) : null}
                {p.phone ? (
                  <View className="mt-1 flex-row items-center gap-1.5">
                    <Phone size={13} color="#94a3b8" />
                    <Text className="text-muted-foreground text-xs">{p.phone}</Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
