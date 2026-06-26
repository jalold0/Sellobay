import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, Filter, Search, SlidersHorizontal, X } from 'lucide-react-native';
import * as React from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pickLocalized } from '../../src/lib/format';
import { haptics } from '../../src/lib/haptics';
import { useT } from '../../src/lib/useT';
import { useProducts } from '../../src/lib/hooks';
import { brands, categories, findBySlug } from '../../src/lib/mock-data';
import { ProductCard } from '../../src/ui/product-card';
import { ProductGridSkeleton } from '../../src/ui/skeleton';

type SortKey = 'popularity' | 'price-asc' | 'price-desc' | 'rating' | 'newest';

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

  // Qidiruvni debounce qilamiz — har harfda so'rov yubormaslik uchun
  const [debouncedSearch, setDebouncedSearch] = React.useState(search);
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const selectedCategory = params.category ? findBySlug(categories, params.category) : undefined;
  const selectedBrand = params.brand ? findBySlug(brands, params.brand) : undefined;

  // Jonli API — filtering/sorting backend'da (Postgres)
  const { data: filtered = [], isLoading } = useProducts({
    category: params.category,
    brand: params.brand,
    q: debouncedSearch.trim() || undefined,
    sort,
  });

  const clearFilters = () => router.setParams({ category: undefined, brand: undefined });

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

      {/* Grid */}
      {isLoading ? (
        <ProductGridSkeleton count={6} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 24, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={{ flex: 1, maxWidth: '48.5%' }}>
              <ProductCard product={item} />
            </View>
          )}
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
