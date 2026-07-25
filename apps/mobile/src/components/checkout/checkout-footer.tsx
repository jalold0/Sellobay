// Sticky footer: Sello Coins redeem toggle, chegirma qatorlari, jami va CTA.
// 1-oynada (tur tanlanmaganda) ota komponent buni render qilmaydi.
import { Check, Coins } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, Text, View } from 'react-native';

import { formatMoney } from '../../lib/format';
import { haptics } from '../../lib/haptics';
import { COIN_VALUE_SOM, coinsForOrder } from '../../lib/loyalty';
import { cn } from '../../ui/cn';

type Props = {
  bottomInset: number;
  redeemableCoins: number;
  useCoins: boolean;
  onToggleCoins: () => void;
  promoDiscount: number;
  appliedPromoCode: string | undefined;
  coinDiscount: number;
  total: number;
  submitting: boolean;
  isReview: boolean;
  onPress: () => void;
};

export function CheckoutFooter({
  bottomInset,
  redeemableCoins,
  useCoins,
  onToggleCoins,
  promoDiscount,
  appliedPromoCode,
  coinDiscount,
  total,
  submitting,
  isReview,
  onPress,
}: Props) {
  return (
    <View
      style={{ paddingBottom: bottomInset + 12 }}
      className="border-border bg-background absolute inset-x-0 bottom-0 gap-2 border-t px-4 pt-3"
    >
      {/* Sello Coins redeem toggle — login + balans bo'lsa */}
      {redeemableCoins > 0 ? (
        <Pressable
          onPress={() => {
            haptics.select();
            onToggleCoins();
          }}
          className={cn(
            'flex-row items-center gap-2 rounded-lg border p-2.5',
            useCoins ? 'border-amber-400 bg-amber-50' : 'border-border',
          )}
        >
          <View
            className={cn(
              'h-5 w-5 items-center justify-center rounded border-2',
              useCoins ? 'border-amber-500 bg-amber-500' : 'border-border',
            )}
          >
            {useCoins ? <Check size={13} color="#fff" strokeWidth={3} /> : null}
          </View>
          <Coins size={15} color="#d97706" />
          <Text className="text-foreground flex-1 text-xs font-medium">
            Sello Coins ishlatish · {redeemableCoins} coin
          </Text>
          <Text className="text-xs font-semibold text-amber-700">
            −{formatMoney(redeemableCoins * COIN_VALUE_SOM)}
          </Text>
        </Pressable>
      ) : null}
      {promoDiscount > 0 ? (
        <View className="flex-row justify-between">
          <Text className="text-success text-sm">Promokod ({appliedPromoCode})</Text>
          <Text className="text-success text-sm font-medium">−{formatMoney(promoDiscount)}</Text>
        </View>
      ) : null}
      {coinDiscount > 0 ? (
        <View className="flex-row justify-between">
          <Text className="text-success text-sm">Sello Coins chegirmasi</Text>
          <Text className="text-success text-sm font-medium">−{formatMoney(coinDiscount)}</Text>
        </View>
      ) : null}
      <View className="flex-row justify-between">
        <Text className="text-muted-foreground text-sm">Jami</Text>
        <Text className="text-base font-bold">{formatMoney(total)}</Text>
      </View>
      {/* Sello Coins earn hint — chegirmadan keyingi summa bo'yicha */}
      <View className="flex-row items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5">
        <Coins size={13} color="#d97706" />
        <Text className="text-[11px] font-medium text-amber-700">
          Bu buyurtma uchun +{coinsForOrder(total)} Sello Coin olasiz
        </Text>
      </View>
      {/* Crimson pill — chapda label, o'ngda jami (1i) */}
      <Pressable
        onPress={onPress}
        disabled={submitting}
        className={cn(
          'bg-primary h-[54px] flex-row items-center justify-between rounded-full px-6 active:opacity-85',
          submitting && 'opacity-60',
        )}
      >
        <Text className="text-base font-bold text-white">
          {isReview ? 'Buyurtmani tasdiqlash' : "To'lovga o'tish"}
        </Text>
        <Text className="text-base font-bold text-white">{formatMoney(total)}</Text>
      </Pressable>
    </View>
  );
}
