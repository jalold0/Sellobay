import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronDown,
  Clock,
  Filter,
  Search,
  SlidersHorizontal,
  TrendingUp,
  X,
} from 'lucide-react-native';
import * as React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pickLocalized } from '../../src/lib/format';
import { haptics } from '../../src/lib/haptics';
import { useProducts } from '../../src/lib/hooks';
import { brands, categories, findBySlug, type MockProduct } from '../../src/lib/mock-data';
import { useT } from '../../src/lib/useT';
import { useSearches } from '../../src/store/searches';
import { Button } from '../../src/ui/button';
import { ProductCard } from '../../src/ui/product-card';
import { ProductGridSkeleton } from '../../src/ui/skeleton';

type SortKey = 'popularity' | 'price-asc' | 'price-desc' | 'rating' | 'newest';

// Ommabop qidiruvlar (mock — keyin analitikadan keladi)
const TRENDING = ['Nike', 'Krossovka', 'Atir', 'Kosmetika', 'Sumka', 'Kurtka', 'Adidas', 'Soat'];

export default function CatalogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, locale } = useT();

  const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
    { key: 'popularity', label: t('catalog.sortBy.popularity') },
    { key: 'price-asc', label: t('catalog.sortBy.priceAsc') },
    { key: 'price-desc', label: t('catalog.sortBy.priceDesc') },
    { key: 'rating', label: t('catalog.sortBy.rating') },
    { key: 'newest', label: t('catalog.sortBy.newest') },
  ];
  const params = useLocalSearchParams<{
    category?: string;
    brand?: string;
    sort?: string;
    q?: string;
  }>();

  const [search, setSearch] = React.useState(params.q ?? '');
  const [sort, setSort] = React.useState<SortKey>((params.sort as SortKey) ?? 'popularity');
  const [sortOpen, setSortOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const { recent, add: addSearch, remove: removeSearch, clear: clearSearches } = useSearches();

  // Qidiruvni debounce qilamiz — har harfda so'rov yubormaslik uchun
  const [debouncedSearch, setDebouncedSearch] = React.useState(search);
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const selectedCategory = params.category ? findBySlug(categories, params.category) : undefined;
  const selectedBrand = params.brand ? findBySlug(brands, params.brand) : undefined;

  // Jonli API — filtering/sorting backend'da (Postgres)
  const {
    data: filtered = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useProducts({
    category: params.category,
    brand: params.brand,
    q: debouncedSearch.trim() || undefined,
    sort,
  });

  const clearFilters = () => router.setParams({ category: undefined, brand: undefined });

  // Qidiruv fokusda va bo'sh bo'lsa — takliflar (oxirgi + ommabop) ko'rsatiladi
  const showSuggestions = focused && !search.trim();
  const applySearch = (q: string) => {
    haptics.select();
    setSearch(q);
    addSearch(q);
  };

  // renderItem barqaror — memo'langan ProductCard bilan birga scroll'ni yengillashtiradi
  const renderItem = React.useCallback(
    ({ item }: { item: MockProduct }) => (
      <View style={styles.cell}>
        <ProductCard product={item} locale={locale} />
      </View>
    ),
    [locale],
  );

  return (
    <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
      {/* Top */}
      <View className="gap-3 px-4 pb-3 pt-2">
        <View className="flex-row items-center gap-2">
          <View className="bg-muted flex-1 flex-row items-center gap-2 rounded-full px-4 py-2.5">
            <Search size={16} color="#6B6B73" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={() => addSearch(search)}
              placeholder={t('common.search') + '...'}
              placeholderTextColor="#94a3b8"
              className="text-foreground flex-1 text-sm"
              returnKeyType="search"
            />
            {search ? (
              <Pressable hitSlop={6} onPress={() => setSearch('')}>
                <X size={14} color="#6B6B73" />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={() => setSortOpen((v) => !v)}
            className="border-border bg-card active:bg-muted h-11 w-11 items-center justify-center rounded-full border"
            hitSlop={8}
          >
            <SlidersHorizontal size={18} color="#0A0A0C" />
          </Pressable>
        </View>

        {/* Active filters */}
        {(selectedCategory || selectedBrand) && (
          <View className="flex-row flex-wrap items-center gap-2">
            {selectedCategory ? (
              <View className="bg-primary flex-row items-center gap-1 rounded-full px-3 py-1">
                <Text className="text-xs font-medium text-white">
                  {pickLocalized(selectedCategory.name, locale)}
                </Text>
                <Pressable hitSlop={6} onPress={() => router.setParams({ category: undefined })}>
                  <X size={12} color="#fff" />
                </Pressable>
              </View>
            ) : null}
            {selectedBrand ? (
              <View className="bg-primary flex-row items-center gap-1 rounded-full px-3 py-1">
                <Text className="text-xs font-medium text-white">{selectedBrand.name}</Text>
                <Pressable hitSlop={6} onPress={() => router.setParams({ brand: undefined })}>
                  <X size={12} color="#fff" />
                </Pressable>
              </View>
            ) : null}
            <Pressable onPress={clearFilters} hitSlop={4}>
              <Text className="text-muted-foreground text-xs">{t('common.clear')}</Text>
            </Pressable>
          </View>
        )}

        {/* Sort dropdown */}
        {sortOpen ? (
          <View className="border-border bg-card absolute right-4 top-16 z-10 w-48 overflow-hidden rounded-xl border shadow-lg">
            {SORT_OPTIONS.map((o) => (
              <Pressable
                key={o.key}
                onPress={() => {
                  haptics.select();
                  setSort(o.key);
                  setSortOpen(false);
                }}
                className="active:bg-muted px-4 py-2.5"
              >
                <Text
                  className={
                    sort === o.key
                      ? 'text-primary text-sm font-semibold'
                      : 'text-foreground text-sm'
                  }
                >
                  {o.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Stats line */}
        <View className="flex-row items-center justify-between">
          <Text className="text-muted-foreground text-xs">
            {t('catalog.results').replace('{count}', String(filtered.length))}
          </Text>
          <Pressable
            onPress={() => setSortOpen((v) => !v)}
            className="flex-row items-center gap-1"
            hitSlop={4}
          >
            <Filter size={12} color="#6B6B73" />
            <Text className="text-muted-foreground text-xs">
              {SORT_OPTIONS.find((o) => o.key === sort)?.label}
            </Text>
            <ChevronDown size={12} color="#6B6B73" />
          </Pressable>
        </View>
      </View>

      {/* Qidiruv takliflari (fokusda, bo'sh) yoki grid */}
      {showSuggestions ? (
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        >
          {recent.length > 0 ? (
            <View className="mt-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-foreground text-sm font-semibold">{t('search.recent')}</Text>
                <Pressable onPress={clearSearches} hitSlop={6}>
                  <Text className="text-muted-foreground text-xs">{t('common.clear')}</Text>
                </Pressable>
              </View>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {recent.map((q) => (
                  <View
                    key={q}
                    className="bg-muted flex-row items-center gap-1.5 rounded-full py-1.5 pl-3 pr-2"
                  >
                    <Pressable
                      onPress={() => applySearch(q)}
                      className="flex-row items-center gap-1 active:opacity-70"
                    >
                      <Clock size={12} color="#6B6B73" />
                      <Text className="text-foreground text-xs">{q}</Text>
                    </Pressable>
                    <Pressable onPress={() => removeSearch(q)} hitSlop={6}>
                      <X size={11} color="#94a3b8" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          <View className="mt-5">
            <Text className="text-foreground text-sm font-semibold">{t('search.popular')}</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {TRENDING.map((q) => (
                <Pressable
                  key={q}
                  onPress={() => applySearch(q)}
                  className="border-border flex-row items-center gap-1 rounded-full border px-3 py-1.5 active:opacity-70"
                >
                  <TrendingUp size={12} color="#8B0020" />
                  <Text className="text-foreground text-xs">{q}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : isLoading ? (
        <ProductGridSkeleton count={6} />
      ) : isError ? (
        <View className="items-center px-6 py-16">
          <Text className="text-muted-foreground text-center text-sm">{t('common.error')}</Text>
          <View className="mt-4">
            <Button onPress={() => refetch()}>{t('common.retry')}</Button>
          </View>
        </View>
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(p) => p.id}
          numColumns={2}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 4, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#8B0020" />
          }
          ListEmptyComponent={
            <View className="items-center px-6 py-16">
              <Text className="text-muted-foreground text-sm">{t('catalog.noResults')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // FlashList numColumns=2 — gap'ni item padding orqali beramiz (columnWrapperStyle yo'q).
  // contentContainer paddingHorizontal 10 + cell padding 6 → tashqi ~16, ustunlar orasi ~12
  cell: { flex: 1, padding: 6 },
});
