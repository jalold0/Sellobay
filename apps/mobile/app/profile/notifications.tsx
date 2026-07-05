import { useRouter } from 'expo-router';
import { Bell, ChevronLeft, Gift, Star, Truck } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '../../src/lib/useT';

type NotifType = 'order' | 'promo' | 'coin' | 'system';

interface NotifItem {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

const TYPE_TINT: Record<NotifType, string> = {
  order: '#FBF2F4',
  promo: '#FAEEDA',
  coin: '#FDF3F5',
  system: '#E6F1FB',
};

const TYPE_ICON: Record<NotifType, React.ComponentType<{ size?: number; color?: string }>> = {
  order: Truck,
  promo: Gift,
  coin: Star,
  system: Bell,
};

const NOTIFICATIONS: NotifItem[] = [
  {
    id: '1',
    type: 'order',
    title: "Buyurtma yo'lda",
    body: "#ECM-2481 bojxonadan o'tmoqda",
    time: '2 soat oldin',
    unread: true,
  },
  {
    id: '2',
    type: 'promo',
    title: 'Flash Sale boshlandi',
    body: 'Tanlangan mahsulotlarga 30% gacha chegirma',
    time: '5 soat oldin',
    unread: true,
  },
  {
    id: '3',
    type: 'coin',
    title: "+149 Sello Coin qo'shildi",
    body: 'Nike Air Max 270 xaridi uchun',
    time: '1 kun oldin',
    unread: true,
  },
  {
    id: '4',
    type: 'order',
    title: 'Buyurtma yetkazildi',
    body: '#ECM-2470 muvaffaqiyatli yetkazildi',
    time: '3 kun oldin',
    unread: false,
  },
  {
    id: '5',
    type: 'system',
    title: 'Xavfsizlik ogohlantirishi',
    body: 'Yangi qurilmadan hisobingizga kirildi',
    time: '1 hafta oldin',
    unread: false,
  },
];

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const [items, setItems] = React.useState<NotifItem[]>(NOTIFICATIONS);

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const hasUnread = items.some((n) => n.unread);

  return (
    <View className="bg-paper flex-1" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="bg-muted h-10 w-10 items-center justify-center rounded-full"
        >
          <ChevronLeft size={20} color="#0A0A0C" />
        </Pressable>
        <Text className="text-foreground flex-1 font-serif text-2xl leading-6">
          {t('profile.settingsPage.notificationsTitle')}
        </Text>
        {hasUnread ? (
          <Pressable onPress={markAllRead} hitSlop={8}>
            <Text className="text-primary text-xs font-semibold">Barchasi o'qildi</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 10 }}
      >
        {items.map((n) => {
          const Icon = TYPE_ICON[n.type];
          return (
            <View
              key={n.id}
              className="flex-row gap-3 rounded-2xl border border-[#EEEEF0] p-[13px]"
              style={{ backgroundColor: n.unread ? '#FDFBFB' : '#FFFFFF' }}
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-[12px]"
                style={{ backgroundColor: TYPE_TINT[n.type] }}
              >
                <Icon size={18} color="#531625" />
              </View>
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-foreground text-[13px] font-bold">{n.title}</Text>
                  {n.unread ? (
                    <View
                      className="rounded-full"
                      style={{ width: 7, height: 7, backgroundColor: '#762237' }}
                    />
                  ) : null}
                </View>
                <Text className="text-muted-foreground text-[12px]" numberOfLines={2}>
                  {n.body}
                </Text>
                <Text className="mt-1 text-[11px]" style={{ color: '#b0b0b6' }}>
                  {n.time}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
