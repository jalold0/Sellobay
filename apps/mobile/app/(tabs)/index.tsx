import { Link, useRouter } from 'expo-router';
import {
  Bell,
  Camera,
  ChevronDown,
  Globe,
  MapPin,
  Plane,
  Search,
  ShoppingBag,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '../../src/lib/haptics';
import { useProducts } from '../../src/lib/hooks';
import { globalProducts, type MockProduct } from '../../src/lib/mock-data';
import { countryMeta, globalCats, popularBrands } from '../../src/lib/storefront';
import { useT } from '../../src/lib/useT';
import { useCart } from '../../src/store/cart';
import { useLocation } from '../../src/store/location';
import { useMode } from '../../src/store/mode';
import { useRecentlyViewed } from '../../src/store/recently-viewed';
import { toast } from '../../src/store/toast';
import { AppImage } from '../../src/ui/app-image';
import { CategoryGrid } from '../../src/ui/category-grid';
import { FlashSale } from '../../src/ui/flash-sale';
import { Gradient } from '../../src/ui/gradient';
import { HeroBanner } from '../../src/ui/hero-banner';
import { ModeSwitchSheet } from '../../src/ui/mode-switch-sheet';
import { PerksBar } from '../../src/ui/perks-bar';
import { ProductCard } from '../../src/ui/product-card';
import { ProductRail } from '../../src/ui/product-rail';
import { StoriesRail } from '../../src/ui/stories-rail';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOGO = require('../../assets/icon.png');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mode = useMode((s) => s.mode);
  const cartCount = useCart((s) => s.totalQuantity());
  const locLabel = useLocation((s) => s.label);
  const locLoading = useLocation((s) => s.loading);
  const refreshLocation = useLocation((s) => s.refresh);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const { data: localProducts = [] } = useProducts({ sort: 'popularity', limit: 12 });

  // Ochilishda qurilma joylashuvini aniqlash (ruxsat berilgan bo'lsa)
  React.useEffect(() => {
    void refreshLocation();
  }, [refreshLocation]);

  // Rasm orqali qidirish — galereyadan rasm tanlab, o'xshash mahsulotlarga o'tadi.
  // expo-image-picker native modul: dev-client qayta build qilingach ishlaydi;
  // aks holda crash bermay ogohlantiradi.
  const onImageSearch = async () => {
    haptics.select();
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast({
          title: 'Ruxsat kerak',
          description: 'Galereyaga kirishga ruxsat bering',
          variant: 'warning',
        });
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
      if (res.canceled) return;
      toast({
        title: "Rasm bo'yicha qidiruv",
        description: "O'xshash mahsulotlar tanlandi",
        variant: 'success',
      });
      router.push('/catalog?imageSearch=1' as never);
    } catch {
      toast({
        title: 'Rasmli qidiruv',
        description: 'Bu funksiya ilova yangilangach ishlaydi',
        variant: 'warning',
      });
    }
  };

  return (
    <View className="bg-paper flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={{ paddingTop: insets.top + 6 }} className="bg-white px-4 pb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center gap-2.5">
              <Pressable onPress={() => setSheetOpen(true)}>
                {mode === 'local' ? (
                  <AppImage source={LOGO} style={{ width: 36, height: 36, borderRadius: 10 }} />
                ) : (
                  <Gradient
                    colors={['#16161A', '#0A0A0C']}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Globe size={20} color="#E5C77A" />
                  </Gradient>
                )}
              </Pressable>
              <View className="flex-1">
                <Pressable
                  onPress={() => setSheetOpen(true)}
                  className="flex-row items-center gap-1.5 self-start"
                >
                  <Text className="text-foreground font-serif text-[19px] leading-5">Sellobay</Text>
                  {mode === 'global' ? (
                    <Text className="text-primary font-serif text-[19px] leading-5">Global</Text>
                  ) : null}
                  <ChevronDown size={15} color="#0A0A0C" strokeWidth={2.2} />
                </Pressable>
                {mode === 'local' ? (
                  <Pressable
                    onPress={() => {
                      haptics.select();
                      void refreshLocation();
                    }}
                    className="mt-0.5 flex-row items-center gap-1 self-start active:opacity-70"
                  >
                    <MapPin size={10} color="#762237" />
                    <Text
                      numberOfLines={1}
                      className="text-muted-foreground max-w-[180px] text-[11px]"
                    >
                      {locLoading ? 'Aniqlanmoqda…' : locLabel}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => router.push('/profile/notifications' as never)}
                className="bg-muted h-10 w-10 items-center justify-center rounded-full active:opacity-75"
              >
                <Bell size={18} color="#0A0A0C" />
                <View
                  className="absolute right-2 top-2 h-[7px] w-[7px] rounded-full border-[1.5px]"
                  style={{ backgroundColor: '#762237', borderColor: '#FAF6F4' }}
                />
              </Pressable>
              <Link href="/(tabs)/cart" asChild>
                <Pressable className="bg-muted h-10 w-10 items-center justify-center rounded-full active:opacity-75">
                  <ShoppingBag size={18} color="#0A0A0C" />
                  {cartCount > 0 ? (
                    <View className="bg-primary absolute -right-0.5 -top-0.5 h-[18px] min-w-[18px] items-center justify-center rounded-full px-1">
                      <Text className="text-[10px] font-bold text-white">
                        {cartCount > 99 ? '99+' : cartCount}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </Link>
            </View>
          </View>

          {/* Search */}
          <Link href="/catalog" asChild>
            <Pressable className="bg-muted mt-3 flex-row items-center gap-2.5 rounded-full px-4 py-3 active:opacity-75">
              <Search size={17} color="#9a9aa2" />
              <Text className="flex-1 text-[13px] text-neutral-300">
                {mode === 'local'
                  ? 'Brend, mahsulot yoki kategoriya…'
                  : 'Global katalogdan qidirish…'}
              </Text>
              <Pressable
                onPress={onImageSearch}
                hitSlop={8}
                accessibilityLabel="Rasm orqali qidirish"
                className="bg-primary h-[28px] w-[28px] items-center justify-center rounded-lg active:opacity-80"
              >
                <Camera size={15} color="#fff" />
              </Pressable>
            </Pressable>
          </Link>
        </View>

        {mode === 'local' ? <LocalHome products={localProducts} /> : <GlobalHome />}
      </ScrollView>

      <ModeSwitchSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </View>
  );
}

// ─── LOKAL BOSH SAHIFA ───────────────────────────────────────────
function LocalHome({ products }: { products: MockProduct[] }) {
  const { t } = useT();
  const setMode = useMode((s) => s.setMode);
  const recentItems = useRecentlyViewed((s) => s.items);

  const flashDeals = products.filter((p) => p.badge === 'SALE');
  const recs = products.filter((p) => p.badge === 'TOP' || p.badge === 'NEW').slice(0, 6);
  const bestSellers = [...products]
    .sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0))
    .slice(0, 6);
  const globalDeals = globalProducts.slice(0, 6);

  return (
    <View>
      <StoriesRail />
      <HeroBanner />
      <CategoryGrid />
      <FlashSale products={flashDeals} />

      <ProductRail
        title="Siz uchun"
        subtitle="Xaridlaringiz asosida tavsiya"
        products={recs}
        cardWidth={156}
      />

      {recentItems.length > 0 ? (
        <ProductRail title={t('home.recentlyViewed')} products={recentItems} cardWidth={156} />
      ) : null}

      {/* Global bozor teaser */}
      <Gradient
        colors={['#16161A', '#0A0A0C']}
        style={{ margin: 16, marginBottom: 6, borderRadius: 22, padding: 18, overflow: 'hidden' }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <Globe size={19} color="#E5C77A" />
            <View>
              <Text className="font-serif text-lg leading-5 text-white">Global bozor</Text>
              <Text className="mt-0.5 text-[11px] text-neutral-300">
                🇨🇳 Xitoy · 🇹🇷 Turkiya · 🇰🇷 Koreya
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => {
              haptics.select();
              setMode('global');
            }}
            className="rounded-full bg-white/10 px-3.5 py-2"
          >
            <Text className="text-[12px] font-semibold" style={{ color: '#E5C77A' }}>
              Barchasi
            </Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, marginTop: 14 }}
        >
          {globalDeals.map((p) => (
            <View key={p.id} style={{ width: 150 }}>
              <ProductCard product={p} />
            </View>
          ))}
        </ScrollView>
      </Gradient>

      {/* Eng ko'p sotilgan (grid) */}
      <View className="px-4 pt-5">
        <View className="mb-3.5 flex-row items-end justify-between">
          <View>
            <Text className="text-foreground font-serif text-xl leading-6">Eng ko'p sotilgan</Text>
            <Text className="text-muted-foreground mt-0.5 text-[11px]">Haftaning xitlari</Text>
          </View>
          <Link href="/catalog?sort=popularity" asChild>
            <Pressable>
              <Text className="text-primary text-xs font-semibold">Barchasi →</Text>
            </Pressable>
          </Link>
        </View>
        <View className="flex-row flex-wrap gap-3">
          {bestSellers.map((p) => (
            <View key={p.id} style={{ width: '47.5%' }}>
              <ProductCard product={p} />
            </View>
          ))}
        </View>
      </View>

      {/* Brendlar */}
      <View className="px-4 pt-6">
        <Text className="text-foreground mb-3 font-serif text-lg">Mashhur brendlar</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
        >
          {popularBrands.map((b) => (
            <Link key={b} href={`/catalog?brand=${b.toLowerCase()}`} asChild>
              <Pressable className="border-border h-[52px] items-center justify-center rounded-2xl border bg-white px-6">
                <Text className="text-foreground font-serif text-[15px] tracking-[0.12em]">
                  {b}
                </Text>
              </Pressable>
            </Link>
          ))}
        </ScrollView>
      </View>

      <PerksBar />
    </View>
  );
}

// ─── GLOBAL BOSH SAHIFA ──────────────────────────────────────────
function GlobalHome() {
  const router = useRouter();
  const china = globalProducts.filter((p) => p.sourceCountry === 'CN');
  const turkey = globalProducts.filter((p) => p.sourceCountry === 'TR');
  const korea = globalProducts.filter((p) => p.sourceCountry === 'KR');

  return (
    <View className="bg-white">
      {/* Global kategoriya grid */}
      <View className="flex-row flex-wrap px-2.5 pb-3.5 pt-1.5">
        {globalCats.map((c, i) => (
          <Pressable
            key={`${c.slug}-${i}`}
            onPress={() => {
              haptics.select();
              router.push(`/catalog?category=${c.slug}` as never);
            }}
            className="w-1/4 items-center gap-[7px] px-1 py-2"
          >
            <View
              className="h-14 w-14 items-center justify-center rounded-[18px]"
              style={{ backgroundColor: c.tint }}
            >
              <Text className="text-2xl">{c.emoji}</Text>
            </View>
            <Text numberOfLines={1} className="text-[11px] font-medium text-neutral-700">
              {c.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Global yetkazish banneri */}
      <Gradient
        colors={['#16161A', '#0A0A0C']}
        style={{
          marginHorizontal: 16,
          marginBottom: 4,
          borderRadius: 16,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text
            className="text-[11px] font-extrabold tracking-[0.14em]"
            style={{ color: '#E5C77A' }}
          >
            GLOBAL YETKAZISH
          </Text>
          <Text className="mt-1 text-[13px] text-white">10–18 kun · bojxona kiritilgan</Text>
        </View>
        <Plane size={32} color="#E5C77A" />
      </Gradient>

      <ProductRail
        emoji={countryMeta.CN.flag}
        title={countryMeta.CN.label}
        products={china}
        actionLabel="Barchasi →"
        actionHref="/catalog"
      />
      <ProductRail
        emoji={countryMeta.TR.flag}
        title={countryMeta.TR.label}
        products={turkey}
        actionLabel="Barchasi →"
        actionHref="/catalog"
      />
      <ProductRail
        emoji={countryMeta.KR.flag}
        title={countryMeta.KR.label}
        products={korea}
        actionLabel="Barchasi →"
        actionHref="/catalog"
      />

      {/* Global trust bar */}
      <View className="mx-4 mb-1 mt-4 flex-row gap-2">
        {[
          { t: 'Xaridor himoyasi', s: '100% kafolat' },
          { t: 'Kuzatuv', s: 'Har bosqichda' },
          { t: "So'mda narx", s: "Yashirin to'lovsiz" },
        ].map((p) => (
          <View
            key={p.t}
            className="border-border flex-1 items-center rounded-2xl border bg-white px-2 py-3"
          >
            <Text className="text-foreground text-center text-[11px] font-bold">{p.t}</Text>
            <Text className="mt-0.5 text-center text-[9px] text-neutral-400">{p.s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
