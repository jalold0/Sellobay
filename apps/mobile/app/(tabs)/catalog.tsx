import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowUpDown, Clock, Search, SlidersHorizontal, TrendingUp, X } from 'lucide-react-native';
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

import { haptics } from '../../src/lib/haptics';
import { useProducts } from '../../src/lib/hooks';
import {
  brands,
  categories,
  findBySlug,
  globalProducts,
  type MockProduct,
} from '../../src/lib/mock-data';
import { useT } from '../../src/lib/useT';
import { useMode } from '../../src/store/mode';
import { useSearches } from '../../src/store/searches';
import { Button } from '../../src/ui/button';
import {
  applyClientFilters,
  activeFilterCount,
  type CatFilter,
  DEFAULT_FILTER,
  FilterSheet,
} from '../../src/ui/filter-sheet';
import { ProductCard } from '../../src/ui/product-card';
import { ProductGridSkeleton } from '../../src/ui/skeleton';

type SortKey = 'popularity' | 'price-asc' | 'price-desc' | 'rating' | 'newest';

const TRENDING = ['Nike', 'Krossovka', 'Atir', 'Kosmetika', 'Sumka', 'Kurtka', 'Adidas', 'Soat'];

// Global rejim uchun client-side filtr/sort (API lokal mahsulot beradi)
function filterGlobal(
  list: MockProduct[],
  opts: { category?: string; brand?: string; q?: string; sort: SortKey },
): MockProduct[] {
  let r = list.slice();
  if (opts.category && opts.category !== 'all') {
    const cat = findBySlug(categories, opts.category);
    if (cat) r = r.filter((p) => p.categoryId === cat.id);
  }
  if (opts.brand) r = r.filter((p) => p.brand.toLowerCase() === opts.brand!.toLowerCase());
  if (opts.q) {
    const q = opts.q.toLowerCase();
    r = r.filter((p) => p.name.uz.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
  }
  const sorters: Record<SortKey, (a: MockProduct, b: MockProduct) => number> = {
    popularity: (a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0),
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating,
    newest: () => 0,
  };
  return r.sort(sorters[opts.sort]);
}

export default function CatalogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, locale } = useT();
  const mode = useMode((s) => s.mode);

  const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
    { key: 'popularity', label: t('catalog.sortBy.popularity') },
    { key: 'price-asc', label: t('catalog.sortBy.priceAsc') },
    { key: 'price-desc', label: t('catalog.sortBy.priceDesc') },
    { key: 'rating', label: t('catalog.sortBy.rating') },
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
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<CatFilter>(DEFAULT_FILTER);
  const [focused, setFocused] = React.useState(false);
  const { recent, add: addSearch, remove: removeSearch, clear: clearSearches } = useSearches();

  const [debouncedSearch, setDebouncedSearch] = React.useState(search);
  React.useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(h);
  }, [search]);

  const activeCat = params.category ?? 'all';

  const {
    data: apiProducts = [],
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

  const globalFiltered = React.useMemo(
    () =>
      filterGlobal(globalProducts, {
        category: params.category,
        brand: params.brand,
        q: debouncedSearch.trim() || undefined,
        sort,
      }),
    [params.category, params.brand, debouncedSearch, sort],
  );

  const baseProducts = mode === 'global' ? globalFiltered : apiProducts;
  const products = React.useMemo(
    () => applyClientFilters(baseProducts, filter),
    [baseProducts, filter],
  );
  const filterCount = activeFilterCount(filter);
  const loading = mode === 'global' ? false : isLoading;

  const chips = React.useMemo(
    () => [
      { slug: 'all', label: t('common.all') || 'Barchasi' },
      ...categories.map((c) => ({ slug: c.slug, label: c.name[locale] })),
    ],
    [t, locale],
  );

  const pickCat = (slug: string) => {
    haptics.select();
    router.setParams({ category: slug === 'all' ? undefined : slug });
  };

  const showSuggestions = focused && !search.trim();
  const applySearch = (q: string) => {
    haptics.select();
    setSearch(q);
    addSearch(q);
  };

  const renderItem = React.useCallback(
    ({ item }: { item: MockProduct }) => (
      <View style={styles.cell}>
        <ProductCard product={item} locale={locale} />
      </View>
    ),
    [locale],
  );

  return (
    <View className="bg-paper flex-1" style={{ paddingTop: insets.top }}>
      {/* Sticky header */}
      <View className="border-border bg-white px-4 pb-3 pt-2" style={{ borderBottomWidth: 1 }}>
        <View className="flex-row items-center gap-2.5">
          <View className="bg-muted flex-1 flex-row items-center gap-2 rounded-full px-4 py-2.5">
            <Search size={16} color="#9a9aa2" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={() => addSearch(search)}
              placeholder={t('common.search') + '…'}
              placeholderTextColor="#9a9aa2"
              className="text-foreground flex-1 text-[13px]"
              returnKeyType="search"
            />
            {search ? (
              <Pressable hitSlop={6} onPress={() => setSearch('')}>
                <X size={14} color="#6B6B73" />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={() => setFilterOpen(true)}
            className="border-border h-11 w-11 items-center justify-center rounded-full border bg-white active:opacity-75"
            hitSlop={8}
          >
            <SlidersHorizontal size={18} color="#0A0A0C" />
            {filterCount > 0 ? (
              <View
                className="absolute -right-1 -top-1 h-[18px] min-w-[18px] items-center justify-center rounded-full px-1"
                style={{ backgroundColor: '#C9A961' }}
              >
                <Text className="text-[10px] font-extrabold" style={{ color: '#3A0E19' }}>
                  {filterCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* Kategoriya chiplari */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingTop: 12 }}
        >
          {chips.map((c) => {
            const active = activeCat === c.slug;
            return (
              <Pressable
                key={c.slug}
                onPress={() => pickCat(c.slug)}
                className="rounded-full border px-4 py-2"
                style={{
                  backgroundColor: active ? '#531625' : '#fff',
                  borderColor: active ? '#531625' : '#EAEAEC',
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: active ? '#fff' : '#3a3a40' }}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Count + sort */}
        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-muted-foreground text-xs">
            {t('catalog.results').replace('{count}', String(products.length))}
          </Text>
          <Pressable
            onPress={() => setSortOpen((v) => !v)}
            className="flex-row items-center gap-1.5"
            hitSlop={4}
          >
            <ArrowUpDown size={13} color="#6B6B73" />
            <Text className="text-[12px] font-medium text-neutral-700">
              {SORT_OPTIONS.find((o) => o.key === sort)?.label}
            </Text>
          </Pressable>
        </View>

        {sortOpen ? (
          <View className="border-border absolute right-4 top-[104px] z-10 w-48 overflow-hidden rounded-xl border bg-white shadow-lg">
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
      </View>

      {showSuggestions ? (
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        >
          {recent.length > 0 ? (
            <View className="mt-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-foreground text-sm font-bold">{t('search.recent')}</Text>
                <Pressable onPress={clearSearches} hitSlop={6}>
                  <Text className="text-muted-foreground text-xs">{t('common.clear')}</Text>
                </Pressable>
              </View>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {recent.map((q) => (
                  <View
                    key={q}
                    className="bg-muted flex-row items-center gap-1.5 rounded-full py-2 pl-3 pr-2"
                  >
                    <Pressable
                      onPress={() => applySearch(q)}
                      className="flex-row items-center gap-1.5 active:opacity-70"
                    >
                      <Clock size={13} color="#9a9aa2" />
                      <Text className="text-[13px] text-neutral-700">{q}</Text>
                    </Pressable>
                    <Pressable onPress={() => removeSearch(q)} hitSlop={6}>
                      <X size={12} color="#9a9aa2" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          <View className="mt-5">
            <Text className="text-foreground text-sm font-bold">{t('search.popular')}</Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {TRENDING.map((q) => (
                <Pressable
                  key={q}
                  onPress={() => applySearch(q)}
                  className="border-border flex-row items-center gap-1.5 rounded-full border px-3 py-2 active:opacity-70"
                >
                  <TrendingUp size={12} color="#531625" />
                  <Text className="text-[13px] text-neutral-700">{q}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : loading ? (
        <ProductGridSkeleton count={6} />
      ) : isError && mode === 'local' ? (
        <View className="items-center px-6 py-16">
          <Text className="text-muted-foreground text-center text-sm">{t('common.error')}</Text>
          <View className="mt-4">
            <Button onPress={() => refetch()}>{t('common.retry')}</Button>
          </View>
        </View>
      ) : (
        <FlashList
          data={products}
          keyExtractor={(p) => p.id}
          numColumns={2}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            mode === 'local' ? (
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#531625" />
            ) : undefined
          }
          ListEmptyComponent={
            <View className="items-center px-6 py-16">
              <Text className="text-muted-foreground text-sm">{t('catalog.noResults')}</Text>
            </View>
          }
        />
      )}

      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filter}
        onApply={setFilter}
        brands={brands.map((b) => b.name)}
        base={baseProducts}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, padding: 6 },
});
