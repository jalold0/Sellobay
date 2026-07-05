import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, ShieldCheck } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { productImage } from '../../src/lib/mock-data';
import { toast } from '../../src/store/toast';
import { AppImage } from '../../src/ui/app-image';

type ReturnStatus = 'approved' | 'done';

interface ReturnRequest {
  seed: string;
  brand: string;
  name: string;
  status: ReturnStatus;
  reason: string;
  date: string;
  amount: string;
}

const REQUESTS: ReturnRequest[] = [
  {
    seed: 'adidas-ub',
    brand: 'Adidas',
    name: 'Adidas Ultraboost 22',
    status: 'approved',
    reason: "O'lcham mos kelmadi",
    date: '2 kun oldin',
    amount: "1 890 000 so'm",
  },
  {
    seed: 'mac-ruby',
    brand: 'MAC',
    name: 'MAC Ruby Woo',
    status: 'done',
    reason: 'Fikrimdan qaytdim',
    date: '1 hafta oldin',
    amount: "290 000 so'm",
  },
];

const STATUS_LABEL: Record<ReturnStatus, string> = {
  approved: 'Tasdiqlangan',
  done: 'Yakunlangan',
};

const STATUS_STYLE: Record<ReturnStatus, { bg: string; color: string }> = {
  approved: { bg: '#EDF7F1', color: '#1F8A5B' },
  done: { bg: '#F1F1F3', color: '#9a9aa2' },
};

export default function ReturnsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View className="bg-paper flex-1" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="bg-muted h-10 w-10 items-center justify-center rounded-full"
        >
          <ChevronLeft size={20} color="#0A0A0C" />
        </Pressable>
        <Text className="text-foreground font-serif text-2xl leading-6">Qaytarishlar</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
      >
        {/* Info block */}
        <View className="bg-muted mt-2 flex-row items-center gap-[11px] rounded-2xl p-[14px]">
          <ShieldCheck size={22} color="#531625" />
          <Text className="flex-1 text-[12px] leading-4" style={{ color: '#3a3a40' }}>
            Yetkazilgan mahsulotlarni 14 kun ichida bepul qaytarish mumkin
          </Text>
        </View>

        {/* CTA */}
        <Pressable
          onPress={() => toast({ title: 'Tez orada' })}
          className="bg-primary mt-4 h-[52px] flex-row items-center justify-center gap-2 rounded-full"
        >
          <Plus size={20} color="#FFFFFF" />
          <Text className="text-[15px] font-bold text-white">Yangi qaytarish soʻrovi</Text>
        </Pressable>

        {/* So'rovlar tarixi */}
        <Text className="text-foreground pb-3 pt-6 text-[13px] font-bold">Soʻrovlar tarixi</Text>
        <View className="gap-3">
          {REQUESTS.map((req) => {
            const badge = STATUS_STYLE[req.status];
            return (
              <View
                key={req.seed}
                className="border-border rounded-[18px] border bg-white p-[14px]"
              >
                <View className="flex-row gap-3">
                  <AppImage
                    source={productImage(req.seed, 160)}
                    className="bg-muted h-14 w-14 rounded-[12px]"
                    contentFit="cover"
                  />
                  <View className="flex-1">
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1">
                        <Text className="text-[10px] font-extrabold uppercase text-neutral-300">
                          {req.brand}
                        </Text>
                        <Text
                          numberOfLines={2}
                          className="text-foreground text-[13px] font-semibold"
                        >
                          {req.name}
                        </Text>
                      </View>
                      <View
                        className="rounded-full px-2.5 py-1"
                        style={{ backgroundColor: badge.bg }}
                      >
                        <Text className="text-[11px] font-semibold" style={{ color: badge.color }}>
                          {STATUS_LABEL[req.status]}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-muted-foreground mt-1.5 text-[12px]">
                      Sabab: {req.reason}
                    </Text>
                  </View>
                </View>
                <View className="border-border mt-[11px] flex-row items-center justify-between border-t pt-[11px]">
                  <Text className="text-[11px] text-neutral-300">{req.date}</Text>
                  <Text className="text-foreground text-[13px] font-bold">{req.amount}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
