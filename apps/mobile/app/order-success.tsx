import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Package } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Gradient } from '../src/ui/gradient';

export default function OrderSuccessScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { number, total, delivery, address } = useLocalSearchParams<{
    number?: string;
    total?: string;
    delivery?: string;
    address?: string;
  }>();

  return (
    <Gradient
      colors={['#531625', '#3A0E19']}
      style={{
        flex: 1,
        paddingTop: insets.top + 32,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 24,
        alignItems: 'center',
      }}
    >
      <View className="h-[104px] w-[104px] items-center justify-center rounded-full bg-white/10">
        <View className="h-[76px] w-[76px] items-center justify-center rounded-full bg-white">
          <Check size={40} color="#531625" strokeWidth={2.5} />
        </View>
      </View>
      <Text className="mt-6 font-serif text-2xl text-white">Buyurtma qabul qilindi!</Text>
      <Text className="mt-2 max-w-[280px] text-center text-[13px] leading-5 text-white/70">
        Rahmat! Buyurtmangiz tasdiqlandi va tayyorlanmoqda.
      </Text>

      <View className="mt-7 w-full gap-3 rounded-[20px] border border-white/[0.13] bg-white/[0.07] p-[18px]">
        <Row label="Buyurtma raqami" value={number ?? '#ECM-0000'} />
        <View className="h-px bg-white/10" />
        {delivery ? <Row label="Yetkazish" value={delivery} /> : null}
        {address ? <Row label="Manzil" value={address} alignTop /> : null}
        <View className="h-px bg-white/10" />
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-bold text-white">Jami to'landi</Text>
          <Text className="font-serif-bold text-xl" style={{ color: '#E5C77A' }}>
            {total ?? ''}
          </Text>
        </View>
      </View>

      <View className="mt-6 w-full gap-3">
        <Pressable
          onPress={() => router.replace('/orders')}
          className="h-[52px] flex-row items-center justify-center gap-2 rounded-full active:opacity-85"
          style={{ backgroundColor: '#C9A961' }}
        >
          <Package size={18} color="#3A0E19" />
          <Text className="text-[15px] font-bold" style={{ color: '#3A0E19' }}>
            Buyurtmani kuzatish
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          className="h-[52px] items-center justify-center rounded-full active:opacity-85"
          style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}
        >
          <Text className="text-[15px] font-bold text-white">Bosh sahifaga qaytish</Text>
        </Pressable>
      </View>
    </Gradient>
  );
}

function Row({ label, value, alignTop }: { label: string; value: string; alignTop?: boolean }) {
  return (
    <View className={`flex-row justify-between gap-4 ${alignTop ? 'items-start' : 'items-center'}`}>
      <Text className="text-xs text-white/60">{label}</Text>
      <Text className="flex-1 text-right text-[13px] font-semibold text-white">{value}</Text>
    </View>
  );
}
