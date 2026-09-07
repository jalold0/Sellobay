import { useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProductsByIds } from '../../src/lib/hooks';
import { globalProducts, type MockProduct } from '../../src/lib/mock-data';
import { useT } from '../../src/lib/useT';
import { useWishlist } from '../../src/store/wishlist';
import { Button } from '../../src/ui/button';
import { EmptyState } from '../../src/ui/empty-state';
import { ProductCard } from '../../src/ui/product-card';

export default function WishlistScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const ids = useWishlist((s) => s.ids);

  // Sevimlilar AYNAN saqlangan id'lar bo'yicha olinadi.
  //
  // Ilgari bu ekran `useProducts({ limit: 48 })` natijasidan filtrlardi —
  // ya'ni o'sha 48 talikka kirmagan sevimli mahsulot ro'yxatda KO'RINMASDI,
  // holbuki profildagi sanoq uni hisoblab turardi. Server `?ids=` filtrini
  // allaqachon qo'llab-quvvatlardi.
  const { data: fetched = [], isLoading } = useProductsByIds(ids);

  // Dev'dagi demo katalog id'lari UUID emas, shu sababli serverdan kelmaydi.
  // Ularni faqat dev rejimda mahalliy ro'yxatdan qo'shamiz.
  const items: MockProduct[] = __DEV__
    ? [...fetched, ...globalProducts.filter((p) => ids.includes(p.id))]
    : fetched;

  const showSpinner = isLoading && items.length === 0 && ids.length > 0;

  return (
    <View className="bg-paper flex-1" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-2 pt-3.5">
        <Text className="text-foreground font-serif text-2xl leading-7">{t('wishlist.title')}</Text>
        <Text className="text-muted-foreground mt-1 text-xs">
          {t('wishlist.savedCount').replace('{count}', String(items.length))}
        </Text>
      </View>
      {showSpinner ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#531625" />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Heart size={32} color="#762237" />}
          title={t('wishlist.emptyTitle')}
          description={t('wishlist.emptyDesc')}
          action={
            <Button fullWidth onPress={() => router.push('/catalog')}>
              {t('cart.openCatalog')}
            </Button>
          }
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 24, paddingTop: 6 }}
          renderItem={({ item }) => (
            <View style={{ flex: 1, maxWidth: '48.5%' }}>
              <ProductCard product={item} />
            </View>
          )}
        />
      )}
    </View>
  );
}
