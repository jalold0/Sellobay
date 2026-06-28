import { Link, useRouter, type Href } from 'expo-router';
import {
  Bell,
  ChevronRight,
  CreditCard,
  Gift,
  Globe,
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

import { fetchLoyalty, fetchOrders } from '../../src/lib/api';
import { formatNumber, initials } from '../../src/lib/format';
import { currentTier } from '../../src/lib/loyalty';
import { useT } from '../../src/lib/useT';
import { useLocale, locales, type Locale } from '../../src/store/locale';
import { useSession } from '../../src/store/session';
import { Button } from '../../src/ui/button';

const LANG_LABEL: Record<Locale, string> = { uz: 'Til', ru: 'Язык', en: 'Language' };

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const { locale, setLocale } = useLocale();
  const { user, isAuthenticated, signOut } = useSession();
  const name = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '';

  // Real statistika — login bo'lsa DB'dan (buyurtmalar soni, coin balansi, daraja)
  const [stats, setStats] = React.useState<{
    orders: number | null;
    coins: number | null;
    tier: string | null;
  }>({ orders: null, coins: null, tier: null });

  React.useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setStats({ orders: null, coins: null, tier: null });
      return;
    }
    void Promise.all([fetchOrders(), fetchLoyalty()]).then(([orders, loyalty]) => {
      if (!active) return;
      setStats({
        orders: orders?.length ?? null,
        coins: loyalty?.coins ?? null,
        tier: loyalty ? currentTier(loyalty.spentSom).label : null,
      });
    });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const SECTIONS: Array<{
    title: string;
    items: Array<{ icon: typeof User; label: string; href?: string; badge?: string }>;
  }> = [
    {
      title: t('profile.nav.personal'),
      items: [
        { icon: Package, label: t('profile.nav.orders'), href: '/orders' },
        { icon: Heart, label: t('profile.nav.wishlist'), href: '/(tabs)/wishlist' },
        { icon: MapPin, label: t('profile.nav.addresses'), href: '/profile/addresses' },
        { icon: CreditCard, label: t('profile.nav.payment'), href: '/profile/payment' },
      ],
    },
    {
      title: t('profile.nav.loyalty'),
      items: [
        {
          icon: Gift,
          label: t('profile.nav.loyalty'),
          href: '/profile/loyalty',
          badge: stats.tier ?? undefined,
        },
        { icon: Star, label: t('profile.nav.reviews'), href: '/profile/reviews' },
        {
          icon: Bell,
          label: t('profile.settingsPage.notificationsTitle'),
          href: '/profile/notifications',
        },
      ],
    },
    {
      title: t('common.help'),
      items: [
        { icon: HelpCircle, label: t('nav.support247'), href: '/help' },
        { icon: Settings, label: t('profile.nav.settings'), href: '/profile/settings' },
      ],
    },
  ];

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerStyle={{ paddingBottom: 40, paddingTop: insets.top }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile hero */}
      <View className="bg-primary px-4 pb-6 pt-4">
        {isAuthenticated && user ? (
          <Pressable
            onPress={() => router.push('/profile/edit' as Href)}
            className="flex-row items-center gap-3 active:opacity-80"
          >
            <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
              <Text className="text-primary text-lg font-bold">{initials(name)}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-white">
                {name || t('profile.userFallback')}
              </Text>
              <Text className="text-xs text-white/70">{user.phone ?? user.email}</Text>
            </View>
            <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
        ) : (
          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-white/15">
                <User size={22} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-white">{t('nav.user')}</Text>
                <Text className="text-xs text-white/70">{t('auth.noAccount')}</Text>
              </View>
            </View>
            <Button
              variant="secondary"
              onPress={() => router.push('/auth/login')}
              leftIcon={<LogIn size={16} color="#0A0A0C" />}
              fullWidth
            >
              {t('nav.login')} / {t('nav.register')}
            </Button>
          </View>
        )}
      </View>

      {/* Quick stats */}
      {isAuthenticated ? (
        <View className="border-border bg-card mx-4 -mt-4 flex-row gap-2 rounded-2xl border p-3 shadow-sm">
          <Stat
            label={t('nav.orders')}
            value={stats.orders === null ? '—' : String(stats.orders)}
          />
          <View className="bg-border w-px" />
          <Stat
            label={t('loyalty.coin')}
            value={stats.coins === null ? '—' : formatNumber(stats.coins)}
          />
          <View className="bg-border w-px" />
          <Stat label={t('loyalty.currentTier')} value={stats.tier ?? '—'} />
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

        {/* Language switcher */}
        <View className="border-border bg-card overflow-hidden rounded-2xl border">
          <View className="flex-row items-center gap-3 px-4 py-3">
            <View className="bg-muted h-9 w-9 items-center justify-center rounded-full">
              <Globe size={16} color="#0A0A0C" />
            </View>
            <Text className="text-foreground flex-1 text-sm font-medium">{LANG_LABEL[locale]}</Text>
            <View className="flex-row gap-1">
              {locales.map((l) => (
                <Pressable
                  key={l}
                  onPress={() => setLocale(l)}
                  className={`rounded-full px-2.5 py-1 ${locale === l ? 'bg-primary' : 'bg-muted'}`}
                >
                  <Text
                    className={`text-[11px] font-bold ${locale === l ? 'text-white' : 'text-muted-foreground'}`}
                  >
                    {l.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {isAuthenticated ? (
          <Pressable
            onPress={async () => {
              await signOut();
            }}
            className="border-border bg-card active:bg-muted flex-row items-center justify-center gap-2 rounded-2xl border py-3"
          >
            <LogOut size={16} color="#ef4444" />
            <Text className="text-danger text-sm font-semibold">{t('profile.signOut')}</Text>
          </Pressable>
        ) : null}

        <Text className="text-muted-foreground text-center text-[10px]">
          v1.0 · 2026 {t('common.appName')}
        </Text>
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
