import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, Home, Package } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../src/ui/button';

export default function OrderSuccessScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { number } = useLocalSearchParams<{ number?: string }>();
  return (
    <View
      className="bg-background flex-1 items-center justify-center px-6"
      style={{ paddingTop: insets.top }}
    >
      <View className="h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 size={40} color="#10b981" />
      </View>
      <Text className="text-foreground mt-5 text-2xl font-black">Rahmat!</Text>
      <Text className="text-muted-foreground mt-1 text-sm">Buyurtmangiz qabul qilindi</Text>
      <View className="border-border bg-card mt-5 rounded-2xl border px-5 py-3">
        <Text className="text-muted-foreground text-[10px] uppercase tracking-widest">Raqam</Text>
        <Text className="mt-0.5 font-mono text-base font-bold">
          {number ?? 'ORD-2026-00000000'}
        </Text>
      </View>
      <Text className="text-muted-foreground mt-3 max-w-xs text-center text-xs">
        Operator siz bilan tez orada bog&apos;lanadi
      </Text>
      <View className="mt-8 w-full gap-2">
        <Button
          fullWidth
          size="lg"
          onPress={() => router.replace('/(tabs)')}
          leftIcon={<Home size={16} color="#fff" />}
        >
          Bosh sahifa
        </Button>
        <Button
          fullWidth
          variant="outline"
          size="lg"
          onPress={() => router.replace('/(tabs)/profile')}
          leftIcon={<Package size={16} color="#0A0A0C" />}
        >
          Buyurtmalarimga o&apos;tish
        </Button>
      </View>
    </View>
  );
}
