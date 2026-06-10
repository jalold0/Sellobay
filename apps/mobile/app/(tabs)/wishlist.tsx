import { useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProducts } from '../../src/lib/hooks';
import { useWishlist } from '../../src/store/wishlist';
import { Button } from '../../src/ui/button';
import { EmptyState } from '../../src/ui/empty-state';
import { ProductCard } from '../../src/ui/product-card';

export default function WishlistScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const ids = useWishlist((s) => s.ids);
  // Barcha mahsulotlar (jonli API) — sevimli id'lar bo'yicha filtrlаymiz
  const { data: allProducts = [] } = useProducts({ limit: 48 });
  const items = allProducts.filter((p) => ids.includes(p.id));

  return (
    <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-2 pt-3">
        <Text className="text-foreground text-2xl font-bold">Sevimlilar</Text>
        <Text className="text-muted-foreground text-xs">{items.length} ta mahsulot saqlandi</Text>
      </View>
      {items.length === 0 ? (
        <EmptyState
          icon={<Heart size={32} color="#94a3b8" />}
          title="Sevimlilar bo`sh"
          description="Yoqtirgan mahsulotlaringizni kartochkadagi yurakcha bilan saqlang"
          action={
            <Button fullWidth onPress={() => router.push('/catalog')}>
              Katalogga o&apos;tish
            </Button>
          }
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 24, paddingTop: 4 }}
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
