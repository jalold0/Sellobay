import { useRouter } from 'expo-router';
import { Globe, LayoutGrid } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { haptics } from '../lib/haptics';
import { categories, productImage } from '../lib/mock-data';
import { categoryTint } from '../lib/storefront';
import { useT } from '../lib/useT';
import { useMode } from '../store/mode';

import { AppImage } from './app-image';

// Kategoriya gridi (4 ustun): 6 kategoriya + Global + Barchasi.
export function CategoryGrid() {
  const router = useRouter();
  const { t, locale } = useT();
  const setMode = useMode((s) => s.setMode);

  const openCat = (slug: string) => {
    haptics.select();
    router.push(`/catalog?category=${slug}` as never);
  };

  return (
    <View className="flex-row flex-wrap bg-white px-2.5 pb-5 pt-4">
      {categories.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => openCat(c.slug)}
          className="w-1/4 items-center gap-[7px] px-1 py-2"
        >
          <View
            className="h-14 w-14 overflow-hidden rounded-[18px]"
            style={{ backgroundColor: categoryTint[c.slug] ?? '#FAF6F4' }}
          >
            <AppImage
              source={productImage(c.imageSeed, 160)}
              className="h-full w-full"
              contentFit="cover"
            />
          </View>
          <Text numberOfLines={1} className="text-[11px] font-medium text-neutral-700">
            {c.name[locale]}
          </Text>
        </Pressable>
      ))}

      {/* Global */}
      <Pressable
        onPress={() => {
          haptics.select();
          setMode('global');
        }}
        className="w-1/4 items-center gap-[7px] px-1 py-2"
      >
        <View
          className="h-14 w-14 items-center justify-center rounded-[18px]"
          style={{ backgroundColor: categoryTint.global }}
        >
          <Globe size={24} color="#531625" />
        </View>
        <Text className="text-[11px] font-medium text-neutral-700">Global</Text>
      </Pressable>

      {/* Barchasi */}
      <Pressable onPress={() => openCat('all')} className="w-1/4 items-center gap-[7px] px-1 py-2">
        <View
          className="h-14 w-14 items-center justify-center rounded-[18px]"
          style={{ backgroundColor: categoryTint.all }}
        >
          <LayoutGrid size={24} color="#531625" />
        </View>
        <Text className="text-[11px] font-medium text-neutral-700">
          {t('common.all') || 'Barchasi'}
        </Text>
      </Pressable>
    </View>
  );
}
