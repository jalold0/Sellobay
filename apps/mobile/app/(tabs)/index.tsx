import { Link } from 'expo-router';
import { Bell, Search, ShieldCheck, Sparkles, Truck, Undo2 } from 'lucide-react-native';
import * as React from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProducts } from '../../src/lib/hooks';
import { brands, type MockProduct } from '../../src/lib/mock-data';
import { useT } from '../../src/lib/useT';
import { useRecentlyViewed } from '../../src/store/recently-viewed';
import { AppImage } from '../../src/ui/app-image';
import { Countdown } from '../../src/ui/countdown';
import { ProductCard } from '../../src/ui/product-card';
import { PromoCarousel, type PromoSlide } from '../../src/ui/promo-carousel';
import { QuickLaunch } from '../../src/ui/quick-launch';
import { SectionHeader } from '../../src/ui/section-header';
import { ProductGridSkeleton } from '../../src/ui/skeleton';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOGO = require('../../assets/icon.png');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { t, locale } = useT();
  // Jonli API'dan (Neon DB) — xato bo'lsa mock fallback
  const { data: allProducts = [], isLoading } = useProducts({ sort: 'popularity', limit: 12 });

  const PERKS = [
    { icon: Truck, title: t('hero.trustFast'), sub: t('home.stats.fast24h') },
    { icon: Undo2, title: t('hero.trustReturn'), sub: '' },
    { icon: ShieldCheck, title: t('hero.trustAuthentic'), sub: '' },
    { icon: Sparkles, title: 'Bonus', sub: t('loyalty.coin') },
  ];

  const SLIDES: PromoSlide[] = [
    {
      key: 'hero',
      eyebrow: t('hero.eyebrow'),
      title: t('hero.headlineLine1'),
      subtitle: t('hero.subheadline'),
      cta: t('hero.ctaShop'),
      href: '/catalog',
      bg: '#8B0020',
    },
    {
      key: 'promo',
      eyebrow: t('auth.noAccount'),
      title: t('cart.promoApplied10'),
      subtitle: t('auth.registerSubtitle'),
      cta: t('common.apply'),
      href: '/auth/login',
      bg: '#B30029',
    },
    {
      key: 'loyalty',
      eyebrow: 'SELLO COINS',
      title: '1% cashback',
      subtitle: "Har bir xariddan tanga yig'ing",
      cta: t('common.viewAll'),
      href: '/profile/loyalty',
      bg: '#0A0A0C',
      ctaBg: '#C9A961',
      ctaFg: '#0A0A0C',
    },
  ];
  const featured = allProducts.slice(0, 4);
  const sale = allProducts
    .filter((p: MockProduct) => p.badge === 'SALE' || p.badge === 'TOP')
    .slice(0, 6);

  const recentItems = useRecentlyViewed((s) => s.items);
  // Flash sale — bugun kun oxirigacha (Asia/Tashkent qurilma vaqti)
  const saleEndsAt = React.useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }, []);

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Top bar */}
      <View style={{ paddingTop: insets.top + 8 }} className="bg-background px-4 pb-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <AppImage source={LOGO} style={{ width: 38, height: 38, borderRadius: 10 }} />
            <View>
              <Text className="text-foreground text-lg font-black tracking-tight">Sellobay</Text>
              <Text className="text-muted-foreground text-[10px] uppercase tracking-widest">
                {t('common.marketplace')}
              </Text>
            </View>
          </View>
          <Pressable
            hitSlop={8}
            className="bg-muted h-10 w-10 items-center justify-center rounded-full active:opacity-75"
          >
            <Bell size={18} color="#0A0A0C" />
          </Pressable>
        </View>

        {/* Search */}
        <Link href="/catalog" asChild>
          <Pressable className="bg-muted mt-3 flex-row items-center gap-2 rounded-full px-4 py-3 active:opacity-75">
            <Search size={16} color="#6B6B73" />
            <Text className="text-muted-foreground text-sm">{t('search.submit')}...</Text>
          </Pressable>
        </Link>
      </View>

      {/* Promo karusel */}
      <View className="mt-2">
        <PromoCarousel slides={SLIDES} />
      </View>

      {/* Perks */}
      <View className="mt-4 flex-row gap-2 px-4">
        {PERKS.map((p) => {
          const Icon = p.icon;
          return (
            <View
              key={p.title}
              className="border-border bg-card flex-1 items-center rounded-2xl border p-3"
            >
              <View className="bg-muted h-8 w-8 items-center justify-center rounded-full">
                <Icon size={14} color="#8B0020" />
              </View>
              <Text className="text-foreground mt-1.5 text-[11px] font-semibold">{p.title}</Text>
              <Text className="text-muted-foreground text-[10px]">{p.sub}</Text>
            </View>
          );
        })}
      </View>

      {/* Tez-kirish gridi */}
      <View className="mt-5">
        <QuickLaunch locale={locale} />
      </View>

      {/* Featured */}
      <View className="mt-6 gap-3">
        <SectionHeader
          title={t('home.bestSellersTitle')}
          description={t('home.bestSellersSubtitle')}
          actionLabel={t('common.viewAll')}
          actionHref="/catalog?sort=popularity"
        />
        {isLoading ? (
          <ProductGridSkeleton count={4} />
        ) : (
          <View className="flex-row flex-wrap gap-3 px-4">
            {featured.map((p: MockProduct) => (
              <View key={p.id} style={{ width: '47%' }}>
                <ProductCard product={p} />
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Yaqinda ko'rilgan */}
      {recentItems.length > 0 ? (
        <View className="mt-6 gap-3">
          <SectionHeader title={t('home.recentlyViewed')} />
          <FlatList
            data={recentItems}
            keyExtractor={(p) => `recent-${p.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 12 }}
            renderItem={({ item }) => (
              <View style={{ width: 160 }}>
                <ProductCard product={item} />
              </View>
            )}
          />
        </View>
      ) : null}

      {/* Sale strip */}
      <View className="mt-6 gap-3">
        <View className="flex-row items-center justify-between px-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-foreground text-lg font-bold">{t('sale.homeTitle')}</Text>
            <Countdown until={saleEndsAt} />
          </View>
          <Link href="/catalog?sort=sale" asChild>
            <Pressable hitSlop={4}>
              <Text className="text-primary text-xs">{t('common.viewAll')}</Text>
            </Pressable>
          </Link>
        </View>
        <FlatList
          data={sale}
          keyExtractor={(p) => p.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 12 }}
          renderItem={({ item }) => (
            <View style={{ width: 160 }}>
              <ProductCard product={item} />
            </View>
          )}
        />
      </View>

      {/* Brands */}
      <View className="mt-6 gap-3">
        <SectionHeader title={t('catalog.brand')} />
        <FlatList
          data={brands}
          keyExtractor={(b) => b.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
          renderItem={({ item }) => (
            <Link href={`/catalog?brand=${item.slug}`} asChild>
              <Pressable className="border-border bg-card h-14 w-24 items-center justify-center rounded-xl border active:opacity-75">
                <Text className="text-foreground text-xs font-bold tracking-widest">
                  {item.name.toUpperCase()}
                </Text>
              </Pressable>
            </Link>
          )}
        />
      </View>
    </ScrollView>
  );
}
