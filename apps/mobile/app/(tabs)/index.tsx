import { Link } from 'expo-router';
import { Bell, Search, ShieldCheck, Sparkles, Truck, Undo2 } from 'lucide-react-native';
import * as React from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '../../src/lib/useT';
import { useProducts } from '../../src/lib/hooks';
import { brands, categories, type MockProduct } from '../../src/lib/mock-data';
import { AppImage } from '../../src/ui/app-image';
import { CategoryChip } from '../../src/ui/category-chip';
import { ProductCard } from '../../src/ui/product-card';
import { ProductGridSkeleton } from '../../src/ui/skeleton';
import { SectionHeader } from '../../src/ui/section-header';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOGO = require('../../assets/icon.png');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  // Jonli API'dan (Neon DB) — xato bo'lsa mock fallback
  const { data: allProducts = [], isLoading } = useProducts({ sort: 'popularity', limit: 12 });

  const PERKS = [
    { icon: Truck, title: t('hero.trustFast'), sub: t('home.stats.fast24h') },
    { icon: Undo2, title: t('hero.trustReturn'), sub: '' },
    { icon: ShieldCheck, title: t('hero.trustAuthentic'), sub: '' },
    { icon: Sparkles, title: 'Bonus', sub: t('loyalty.coin') },
  ];
  const featured = allProducts.slice(0, 4);
  const sale = allProducts
    .filter((p: MockProduct) => p.badge === 'SALE' || p.badge === 'TOP')
    .slice(0, 6);

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

      {/* Hero */}
      <View className="bg-primary mx-4 mt-2 overflow-hidden rounded-3xl p-5">
        <View className="flex-row items-center gap-1 self-start rounded-full bg-white/15 px-2 py-1">
          <Sparkles size={10} color="#fff" />
          <Text className="text-[10px] font-medium text-white">{t('hero.eyebrow')}</Text>
        </View>
        <Text className="mt-3 text-2xl font-black leading-tight text-white">
          {t('hero.headlineLine1')}
          <Text className="text-white/80">
            {'\n'}
            {t('hero.headlineLine2')}
          </Text>
        </Text>
        <Text className="mt-2 max-w-[80%] text-xs text-white/80">{t('hero.subheadline')}</Text>
        <Link href="/catalog" asChild>
          <Pressable className="mt-4 self-start rounded-full bg-white px-5 py-2.5 active:opacity-85">
            <Text className="text-primary text-sm font-semibold">{t('hero.ctaShop')} →</Text>
          </Pressable>
        </Link>
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

      {/* Categories */}
      <View className="mt-6 gap-3">
        <SectionHeader
          title={t('categories.title')}
          actionLabel={t('common.viewAll')}
          actionHref="/catalog"
        />
        <FlatList
          data={categories}
          keyExtractor={(c) => c.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 4 }}
          renderItem={({ item }) => (
            <CategoryChip
              emoji={item.emoji}
              name={item.name.uz}
              href={`/catalog?category=${item.slug}`}
              productCount={item.productCount}
            />
          )}
        />
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

      {/* Sale strip */}
      <View className="mt-6 gap-3">
        <SectionHeader
          title={t('sale.homeTitle')}
          description={t('sale.limitedTimeShort')}
          actionLabel={t('common.viewAll')}
          actionHref="/catalog?sort=sale"
        />
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

      {/* Banner */}
      <View className="bg-accent mx-4 mt-6 overflow-hidden rounded-2xl p-5">
        <Text className="text-xs font-bold uppercase tracking-widest text-white/80">
          {t('auth.noAccount')}
        </Text>
        <Text className="mt-1 text-xl font-black text-white">{t('cart.promoApplied10')}</Text>
        <Text className="mt-1 text-xs text-white/80">{t('auth.registerSubtitle')}</Text>
        <Link href="/auth/login" asChild>
          <Pressable className="mt-3 self-start rounded-full bg-white px-4 py-2 active:opacity-85">
            <Text className="text-accent text-xs font-semibold">{t('common.apply')}</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}
