import { Link, useRouter, type Href } from 'expo-router';
import {
  Bell,
  Box,
  ChevronRight,
  Clock,
  CreditCard,
  Gift,
  Globe,
  HelpCircle,
  LogIn,
  LogOut,
  MapPin,
  Package,
  Settings,
  Star,
  Store,
  Ticket,
  Truck,
  User,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type ApiOrder, fetchLoyalty, fetchOrders, isActiveOrder } from '../../src/lib/api';
import { formatNumber, initials } from '../../src/lib/format';
import { currentTier, nextTier, tierProgressPct } from '../../src/lib/loyalty';
import { useT } from '../../src/lib/useT';
import { locales, type Locale, useLocale } from '../../src/store/locale';
import { useSession } from '../../src/store/session';
import { useWishlist } from '../../src/store/wishlist';
import { Button } from '../../src/ui/button';
import { Gradient } from '../../src/ui/gradient';

const LANG_LABEL: Record<Locale, string> = { uz: 'Til', ru: 'Язык', en: 'Language' };

// Buyurtma holatidan progres bosqichi (0-3)
function orderStep(status: string): number {
  const s = status.toUpperCase();
  if (/(SHIP|TRANSIT|OUT_FOR|DELIVERING)/.test(s)) return 2;
  if (/(PAID|CONFIRM|PROCESS|PACK|ASSEMBL)/.test(s)) return 1;
  return 0;
}
const STEP_LABELS = ['Qabul', "Yig'ildi", "Yo'lda", 'Yetkazish'];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const { locale, setLocale } = useLocale();
  const { user, isAuthenticated, signOut } = useSession();
  const wishCount = useWishlist((s) => s.ids.length);
  const name = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '';

  const [stats, setStats] = React.useState<{
    orders: number | null;
    coins: number | null;
    spentSom: number;
    tier: string | null;
  }>({ orders: null, coins: null, spentSom: 0, tier: null });
  const [activeOrder, setActiveOrder] = React.useState<ApiOrder | null>(null);

  React.useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setStats({ orders: null, coins: null, spentSom: 0, tier: null });
      setActiveOrder(null);
      return;
    }
    void Promise.all([fetchOrders(), fetchLoyalty()]).then(([orders, loyalty]) => {
      if (!active) return;
      setStats({
        orders: orders?.length ?? null,
        coins: loyalty?.coins ?? null,
        spentSom: loyalty?.spentSom ?? 0,
        tier: loyalty ? currentTier(loyalty.spentSom).label : null,
      });
      setActiveOrder(orders?.find((o) => isActiveOrder(o.status)) ?? null);
    });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const nt = nextTier(stats.spentSom);
  const progress = tierProgressPct(stats.spentSom);

  const SECTIONS: Array<{
    title: string;
    items: Array<{ icon: typeof User; label: string; href?: string; badge?: string }>;
  }> = [
    {
      title: t('profile.nav.personal'),
      items: [
        { icon: Package, label: t('profile.nav.orders'), href: '/orders' },
        { icon: Box, label: t('profile.nav.returns'), href: '/profile/returns' },
        { icon: MapPin, label: t('profile.nav.addresses'), href: '/profile/addresses' },
        { icon: CreditCard, label: t('profile.nav.payment'), href: '/profile/payment' },
        {
          icon: Bell,
          label: t('profile.settingsPage.notificationsTitle'),
          href: '/profile/notifications',
        },
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
        { icon: Ticket, label: t('profile.nav.promo'), href: '/profile/promo' },
        { icon: Star, label: t('profile.nav.reviews'), href: '/profile/reviews' },
      ],
    },
    {
      title: t('common.help'),
      items: [
        { icon: Store, label: 'Sotuvchi kabineti', href: '/profile/seller' },
        { icon: HelpCircle, label: t('nav.support247'), href: '/help' },
        { icon: Settings, label: t('profile.nav.settings'), href: '/profile/settings' },
      ],
    },
  ];

  return (
    <ScrollView
      className="bg-paper flex-1"
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero (crimson gradient) */}
      <Gradient
        colors={['#531625', '#3A0E19']}
        style={{ paddingTop: insets.top + 12, paddingBottom: 40, paddingHorizontal: 16 }}
      >
        {isAuthenticated && user ? (
          <Pressable
            onPress={() => router.push('/profile/edit' as Href)}
            className="flex-row items-center gap-3"
          >
            <Gradient
              colors={['#C9A961', '#E5C77A']}
              style={{
                width: 58,
                height: 58,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text className="font-serif-bold text-[22px]" style={{ color: '#3A0E19' }}>
                {initials(name) || 'AK'}
              </Text>
            </Gradient>
            <View className="flex-1">
              <Text className="text-lg font-bold text-white">
                {name || t('profile.userFallback')}
              </Text>
              <Text className="mt-0.5 text-xs text-white/65">{user.phone ?? user.email}</Text>
            </View>
            {stats.tier ? (
              <View className="flex-row items-center gap-1.5 rounded-full bg-white/[0.14] px-2.5 py-1.5">
                <Star size={13} color="#E5C77A" fill="#E5C77A" />
                <Text className="text-[11px] font-bold" style={{ color: '#E5C77A' }}>
                  {stats.tier}
                </Text>
              </View>
            ) : null}
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
      </Gradient>

      {/* Floating stats */}
      {isAuthenticated ? (
        <View
          className="border-border mx-4 -mt-[26px] flex-row rounded-[20px] border bg-white p-4"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 8 },
            elevation: 4,
          }}
        >
          <Stat
            label={t('nav.orders')}
            value={stats.orders === null ? '—' : String(stats.orders)}
          />
          <View className="bg-border w-px" />
          <Stat
            label={t('loyalty.coin')}
            value={stats.coins === null ? '—' : formatNumber(stats.coins)}
            gold
          />
          <View className="bg-border w-px" />
          <Stat label="Sevimli" value={String(wishCount)} />
        </View>
      ) : null}

      <View className="mt-4 gap-4 px-4">
        {/* Order tracking */}
        {isAuthenticated && activeOrder ? (
          <Pressable
            onPress={() => router.push(`/orders/${activeOrder.id}` as Href)}
            className="border-border overflow-hidden rounded-[20px] border bg-white p-4"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5">
                <View
                  className="h-[34px] w-[34px] items-center justify-center rounded-[10px]"
                  style={{ backgroundColor: '#FDF3F5' }}
                >
                  <Truck size={17} color="#531625" />
                </View>
                <View>
                  <Text className="text-foreground text-sm font-bold">Buyurtma yo'lda</Text>
                  <Text className="text-muted-foreground text-[11px]">
                    {activeOrder.number} · {activeOrder.itemCount} ta mahsulot
                  </Text>
                </View>
              </View>
              <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: '#EDF7F1' }}>
                <Text className="text-[10px] font-bold" style={{ color: '#1F8A5B' }}>
                  Yo'lda
                </Text>
              </View>
            </View>
            {/* progress */}
            <StepBar step={orderStep(activeOrder.status)} />
            <View
              className="mt-3.5 flex-row items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ backgroundColor: '#FAF6F4' }}
            >
              <Clock size={15} color="#531625" />
              <Text className="text-[11px] text-neutral-700">Tez orada yetkaziladi</Text>
            </View>
          </Pressable>
        ) : null}

        {/* Loyalty card */}
        <Pressable onPress={() => router.push('/profile/loyalty' as Href)}>
          <Gradient
            colors={['#16161A', '#0A0A0C']}
            style={{ borderRadius: 20, padding: 18, overflow: 'hidden' }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View
                  className="h-[18px] w-[18px] rounded-full"
                  style={{ backgroundColor: '#C9A961' }}
                />
                <Text
                  className="text-[12px] font-bold tracking-[0.12em]"
                  style={{ color: '#E5C77A' }}
                >
                  SELLO COINS
                </Text>
              </View>
              <ChevronRight size={18} color="#9a9aa2" />
            </View>
            <View className="mt-3.5 flex-row items-baseline gap-2">
              <Text className="font-serif-bold text-[32px] text-white">
                {stats.coins === null ? '0' : formatNumber(stats.coins)}
              </Text>
              <Text className="text-xs text-neutral-300">tanga</Text>
            </View>
            <View className="mt-3.5">
              <View className="h-[7px] overflow-hidden rounded-full bg-white/[0.12]">
                <Gradient
                  colors={['#C9A961', '#E5C77A']}
                  direction="horizontal"
                  style={{ width: `${Math.max(6, progress)}%`, height: '100%' }}
                />
              </View>
              <View className="mt-1.5 flex-row justify-between">
                <Text className="text-[10px] text-neutral-300">
                  {stats.tier ?? 'Bronza'} daraja
                </Text>
                <Text className="text-[10px]" style={{ color: '#E5C77A' }}>
                  {nt ? `${nt.label}gacha` : 'Eng yuqori daraja'}
                </Text>
              </View>
            </View>
          </Gradient>
        </Pressable>

        {/* Menu sections */}
        {SECTIONS.map((section) => (
          <View key={section.title}>
            <Text className="mb-2 px-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-300">
              {section.title}
            </Text>
            <View className="border-border overflow-hidden rounded-[18px] border bg-white">
              {section.items.map((it, i) => {
                const Icon = it.icon;
                return (
                  <Link key={it.label} href={(it.href ?? '/') as never} asChild>
                    <Pressable
                      className={`active:bg-muted flex-row items-center gap-3 px-3.5 py-3.5 ${
                        i < section.items.length - 1 ? 'border-border border-b' : ''
                      }`}
                    >
                      <View className="bg-muted h-9 w-9 items-center justify-center rounded-full">
                        <Icon size={17} color="#531625" />
                      </View>
                      <Text className="text-foreground flex-1 text-sm font-medium">{it.label}</Text>
                      {it.badge ? (
                        <View
                          className="rounded-full px-2.5 py-0.5"
                          style={{ backgroundColor: '#FDF3F5' }}
                        >
                          <Text className="text-primary text-[10px] font-bold">{it.badge}</Text>
                        </View>
                      ) : null}
                      <ChevronRight size={15} color="#c9c9d0" />
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          </View>
        ))}

        {/* Become seller */}
        <Pressable onPress={() => router.push('/profile/sell' as Href)}>
          <Gradient
            colors={['#531625', '#762237']}
            style={{
              borderRadius: 18,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 13,
            }}
          >
            <View className="h-[42px] w-[42px] items-center justify-center rounded-full bg-white/15">
              <Store size={20} color="#fff" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold text-white">Sotuvchi bo'ling</Text>
              <Text className="text-xs text-white/75">
                Mahsulotlaringizni millionlab mijozga soting
              </Text>
            </View>
            <ChevronRight size={17} color="rgba(255,255,255,0.7)" />
          </Gradient>
        </Pressable>

        {/* Language */}
        <View className="border-border flex-row items-center gap-3 rounded-[18px] border bg-white px-3.5 py-3">
          <View className="bg-muted h-9 w-9 items-center justify-center rounded-full">
            <Globe size={17} color="#0A0A0C" />
          </View>
          <Text className="text-foreground flex-1 text-sm font-medium">{LANG_LABEL[locale]}</Text>
          <View className="flex-row gap-1.5">
            {locales.map((l) => (
              <Pressable
                key={l}
                onPress={() => setLocale(l)}
                className={`rounded-full px-2.5 py-1.5 ${locale === l ? 'bg-primary' : 'bg-muted'}`}
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

        {isAuthenticated ? (
          <Pressable
            onPress={async () => {
              await signOut();
            }}
            className="border-border active:bg-muted h-[50px] flex-row items-center justify-center gap-2 rounded-2xl border bg-white"
          >
            <LogOut size={18} color="#9a9aa2" />
            <Text className="text-muted-foreground text-sm font-semibold">
              {t('profile.signOut')}
            </Text>
          </Pressable>
        ) : null}

        <Text className="text-center text-[10px] text-neutral-300">Sellobay v2.0 · 2026</Text>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-lg font-bold" style={{ color: gold ? '#C9A961' : '#0A0A0C' }}>
        {value}
      </Text>
      <Text className="text-muted-foreground mt-0.5 text-[10px]">{label}</Text>
    </View>
  );
}

function StepBar({ step }: { step: number }) {
  return (
    <View className="mt-4">
      <View className="flex-row items-center">
        {STEP_LABELS.map((_, i) => {
          const done = i <= step;
          return (
            <React.Fragment key={i}>
              <View
                className="h-6 w-6 items-center justify-center rounded-full"
                style={{ backgroundColor: done ? (i < step ? '#1F8A5B' : '#531625') : '#EAEAEC' }}
              >
                <View
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: done ? '#fff' : '#c9c9d0' }}
                />
              </View>
              {i < STEP_LABELS.length - 1 ? (
                <View
                  className="h-[3px] flex-1"
                  style={{ backgroundColor: i < step ? '#1F8A5B' : '#EAEAEC', marginHorizontal: 3 }}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
      <View className="mt-2 flex-row justify-between">
        {STEP_LABELS.map((l, i) => (
          <Text
            key={l}
            className="text-[9px] font-semibold"
            style={{ color: i < step ? '#1F8A5B' : i === step ? '#531625' : '#9a9aa2' }}
          >
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}
