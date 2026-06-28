import { useRouter, type Href } from 'expo-router';
import { Star } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { useT } from '../../src/lib/useT';
import { useLocale, type Locale } from '../../src/store/locale';
import { Button } from '../../src/ui/button';
import { EmptyState } from '../../src/ui/empty-state';
import { Header } from '../../src/ui/header';

const DESC: Record<Locale, string> = {
  uz: 'Yetkazib berilgan buyurtmalaringizdagi mahsulotlarga sharh qoldiring — bu yerda koʻrinadi.',
  ru: 'Оставляйте отзывы о товарах из доставленных заказов — они появятся здесь.',
  en: 'Leave reviews for products from your delivered orders — they will appear here.',
};

export default function ReviewsScreen() {
  const router = useRouter();
  const { t } = useT();
  const locale = useLocale((s) => s.locale);

  return (
    <View className="bg-background flex-1">
      <Header title={t('profile.nav.reviews')} showBack fallbackHref="/(tabs)/profile" />
      <EmptyState
        icon={<Star size={26} color="#94a3b8" />}
        title={t('profile.nav.reviews')}
        description={DESC[locale] ?? DESC.uz}
        action={
          <Button variant="outline" onPress={() => router.push('/orders' as Href)} fullWidth>
            {t('profile.ordersPage.title')}
          </Button>
        }
      />
    </View>
  );
}
