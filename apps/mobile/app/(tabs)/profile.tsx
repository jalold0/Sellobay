import { Link, useRouter } from 'expo-router';
import {
  Bell,
  ChevronRight,
  CreditCard,
  Gift,
  Heart,
  HelpCircle,
  LogIn,
  LogOut,
  MapPin,
  Package,
  Settings,
  Star,
  User,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { initials } from '../../src/lib/format';
import { useSession } from '../../src/store/session';
import { Button } from '../../src/ui/button';

const SECTIONS: Array<{
  title: string;
  items: Array<{ icon: typeof User; label: string; href?: string; badge?: string }>;
}> = [
  {
    title: 'Mening hisobim',
    items: [
      { icon: Package, label: 'Buyurtmalarim', href: '/orders' },
      { icon: Heart, label: 'Sevimlilar', href: '/(tabs)/wishlist' },
      { icon: MapPin, label: 'Manzillar', href: '/profile/addresses' },
      { icon: CreditCard, label: "To'lov usullari", href: '/profile/payment' },
    ],
  },
  {
    title: 'Aktivlik',
    items: [
      { icon: Gift, label: 'Sodiqlik dasturi', href: '/profile/loyalty', badge: 'Gold' },
      { icon: Star, label: 'Mening sharhlarim', href: '/profile/reviews' },
      { icon: Bell, label: 'Bildirishnomalar', href: '/profile/notifications' },
    ],
  },
  {
    title: 'Yordam',
    items: [
      { icon: HelpCircle, label: "Qo'llab-quvvatlash", href: '/help' },
      { icon: Settings, label: 'Sozlamalar', href: '/profile/settings' },
    ],
  },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated, signOut } = useSession();
  const name = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '';

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerStyle={{ paddingBottom: 40, paddingTop: insets.top }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile hero */}
      <View className="bg-primary px-4 pb-6 pt-4">
        {isAuthenticated && user ? (
          <View className="flex-row items-center gap-3">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
              <Text className="text-primary text-lg font-bold">{initials(name)}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-white">{name || 'Foydalanuvchi'}</Text>
              <Text className="text-xs text-white/70">{user.phone ?? user.email}</Text>
            </View>
          </View>
        ) : (
          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-white/15">
                <User size={22} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-white">Mehmon</Text>
                <Text className="text-xs text-white/70">
                  Hisobga kiring — buyurtma berish uchun
                </Text>
              </View>
            </View>
            <Button
              variant="secondary"
              onPress={() => router.push('/auth/login')}
              leftIcon={<LogIn size={16} color="#0A0A0C" />}
              fullWidth
            >
              Kirish yoki ro&apos;yxatdan o&apos;tish
            </Button>
          </View>
        )}
      </View>

      {/* Quick stats */}
      {isAuthenticated ? (
        <View className="border-border bg-card mx-4 -mt-4 flex-row gap-2 rounded-2xl border p-3 shadow-sm">
          <Stat label="Buyurtma" value="12" />
          <View className="bg-border w-px" />
          <Stat label="Ball" value="1 240" />
          <View className="bg-border w-px" />
          <Stat label="Daraja" value="Gold" />
        </View>
      ) : null}

      {/* Sections */}
      <View className="mt-6 gap-6 px-4">
        {SECTIONS.map((section) => (
          <View key={section.title}>
            <Text className="text-muted-foreground mb-2 px-2 text-[10px] font-bold uppercase tracking-widest">
              {section.title}
            </Text>
            <View className="border-border bg-card overflow-hidden rounded-2xl border">
              {section.items.map((it, i) => {
                const Icon = it.icon;
                return (
                  <Link key={it.label} href={(it.href ?? '/') as never} asChild>
                    <Pressable
                      className={`active:bg-muted flex-row items-center gap-3 px-4 py-3.5 ${
                        i < section.items.length - 1 ? 'border-border border-b' : ''
                      }`}
                    >
                      <View className="bg-muted h-9 w-9 items-center justify-center rounded-full">
                        <Icon size={16} color="#0A0A0C" />
                      </View>
                      <Text className="text-foreground flex-1 text-sm font-medium">{it.label}</Text>
                      {it.badge ? (
                        <View className="rounded-full bg-amber-100 px-2 py-0.5">
                          <Text className="text-[10px] font-bold text-amber-700">{it.badge}</Text>
                        </View>
                      ) : null}
                      <ChevronRight size={14} color="#94a3b8" />
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          </View>
        ))}

        {isAuthenticated ? (
          <Pressable
            onPress={async () => {
              await signOut();
            }}
            className="border-border bg-card active:bg-muted flex-row items-center justify-center gap-2 rounded-2xl border py-3"
          >
            <LogOut size={16} color="#ef4444" />
            <Text className="text-danger text-sm font-semibold">Chiqish</Text>
          </Pressable>
        ) : null}

        <Text className="text-muted-foreground text-center text-[10px]">v1.0 · 2026 Sellobay</Text>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-foreground text-base font-bold">{value}</Text>
      <Text className="text-muted-foreground text-[10px]">{label}</Text>
    </View>
  );
}
