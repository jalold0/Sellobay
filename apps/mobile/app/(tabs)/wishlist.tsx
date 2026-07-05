import { useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProducts } from '../../src/lib/hooks';
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
  const { data: allProducts = [] } = useProducts({ limit: 48 });
  // Lokal + global — sevimli id'lar ikkala katalogdan bo'lishi mumkin
  const pool = [...allProducts, ...globalProducts];
  const seen = new Set<string>();
  const items = pool.filter((p: MockProduct) => {
    if (!ids.includes(p.id) || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  return (
    <View className="bg-paper flex-1" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-2 pt-3.5">
        <Text className="text-foreground font-serif text-2xl leading-7">Sevimlilar</Text>
        <Text className="text-muted-foreground mt-1 text-xs">
          {items.length} ta mahsulot saqlandi
        </Text>
      </View>
      {items.length === 0 ? (
        <EmptyState
          icon={<Heart size={32} color="#762237" />}
          title="Sevimlilar bo'sh"
          description="Yurakcha bilan mahsulotlarni saqlang"
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
