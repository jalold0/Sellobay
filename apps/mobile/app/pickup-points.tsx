import { useRouter } from 'expo-router';
import { ChevronLeft, Info } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LeafletMap, TASHKENT, type LatLng } from '../src/components/leaflet-map';
import { getCurrentLocation } from '../src/lib/geo';
import { useLocale, type Locale } from '../src/store/locale';

const L: Record<Locale, { title: string; note: string }> = {
  uz: {
    title: 'Topshirish punktlari',
    note: 'Tez orada topshirish punktlari qo‘shiladi. Hozircha uyga yetkazib berishdan foydalaning.',
  },
  ru: {
    title: 'Пункты выдачи',
    note: 'Пункты выдачи появятся скоро. Пока воспользуйтесь доставкой на дом.',
  },
  en: {
    title: 'Pickup points',
    note: 'Pickup points are coming soon. For now, please use home delivery.',
  },
};

export default function PickupPointsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const locale = useLocale((s) => s.locale);
  const tr = L[locale] ?? L.uz;

  const [center, setCenter] = React.useState<LatLng>(TASHKENT);

  React.useEffect(() => {
    let active = true;
    void getCurrentLocation().then((loc) => {
      if (active && loc) setCenter(loc);
    });
    return () => {
      active = false;
    };
  }, []);

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

      <View className="flex-1">
        <LeafletMap center={center} zoom={12} />
      </View>

      <View
        className="border-border bg-background flex-row items-start gap-2 border-t px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Info size={16} color="#8B0020" style={{ marginTop: 1 }} />
        <Text className="text-muted-foreground flex-1 text-xs leading-4">{tr.note}</Text>
      </View>
    </View>
  );
}
