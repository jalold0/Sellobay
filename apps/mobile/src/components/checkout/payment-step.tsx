// To'lov bosqichi: provayder tanlash + UZCARD (karta o'tkazma) bloki —
// platforma kartalari, chek yuklash va izoh.
import { Check, ImageUp, ShieldCheck, X } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, Text, View } from 'react-native';

import { type PaymentCard } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { haptics } from '../../lib/haptics';
import { AppImage } from '../../ui/app-image';
import { cn } from '../../ui/cn';
import { Input } from '../../ui/input';

import { PAYMENT_OPTIONS, type PaymentId } from './types';

type Props = {
  payment: PaymentId;
  onSelectPayment: (id: PaymentId) => void;
  cards: PaymentCard[];
  receipt: string | null;
  onPickReceipt: () => void;
  onRemoveReceipt: () => void;
  receiptNote: string;
  onChangeReceiptNote: (v: string) => void;
  total: number;
};

export function PaymentStep({
  payment,
  onSelectPayment,
  cards,
  receipt,
  onPickReceipt,
  onRemoveReceipt,
  receiptNote,
  onChangeReceiptNote,
  total,
}: Props) {
  return (
    <View className="gap-2">
      {PAYMENT_OPTIONS.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => {
            haptics.select();
            onSelectPayment(p.id);
          }}
          className={cn(
            'flex-row items-center gap-3 rounded-2xl border-2 p-3.5',
            payment === p.id ? 'border-primary bg-primary/5' : 'border-border',
          )}
        >
          <View className="bg-muted h-10 w-10 items-center justify-center rounded-lg">
            <Text className="text-lg">{p.emoji}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-medium">{p.label}</Text>
            <Text className="text-muted-foreground text-xs">{p.sub}</Text>
          </View>
          {payment === p.id ? <Check size={16} color="#0A0A0C" /> : null}
        </Pressable>
      ))}
      {/* Karta o'tkazma — platforma kartalari + chek yuklash */}
      {payment === 'UZCARD' ? (
        <View className="border-primary/30 bg-primary/5 mt-1 gap-3 rounded-2xl border p-3.5">
          <View>
            <Text className="text-sm font-bold">Karta orqali to&apos;lov</Text>
            <Text className="text-muted-foreground mt-1 text-[11px] leading-4">
              Quyidagi kartaga to&apos;lovni amalga oshiring, so&apos;ng chek (skrinshot)ni yuklang.
              Admin tasdiqlagach buyurtma jarayoni boshlanadi.
            </Text>
          </View>

          <View className="flex-row items-center justify-between rounded-xl bg-white px-3 py-2.5">
            <Text className="text-muted-foreground text-xs">O&apos;tkaziladigan summa</Text>
            <Text className="text-sm font-extrabold">{formatMoney(total)}</Text>
          </View>

          {cards.map((c) => (
            <View key={c.number} className="rounded-xl bg-white px-3 py-2.5">
              <Text selectable className="font-mono text-[15px] font-semibold tracking-wider">
                {c.number}
              </Text>
              <Text className="text-muted-foreground text-[11px]">
                {c.holder}
                {c.bank ? ` · ${c.bank}` : ''}
              </Text>
            </View>
          ))}

          {/* Chek yuklash */}
          <Pressable
            onPress={onPickReceipt}
            className={cn(
              'flex-row items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-3',
              receipt ? 'border-emerald-400 bg-emerald-50' : 'border-border bg-white',
            )}
          >
            {receipt ? <Check size={16} color="#059669" /> : <ImageUp size={16} color="#531625" />}
            <Text
              className={cn('text-[13px] font-bold', receipt ? 'text-emerald-700' : 'text-primary')}
            >
              {receipt ? 'Chek yuklandi · Almashtirish' : 'Chekni yuklash'}
            </Text>
          </Pressable>
          {receipt ? (
            <View className="flex-row items-center gap-2">
              <AppImage
                source={{ uri: receipt }}
                className="h-24 w-24 rounded-lg border"
                contentFit="cover"
              />
              <Pressable
                onPress={() => {
                  haptics.light();
                  onRemoveReceipt();
                }}
                className="flex-row items-center gap-1 rounded-full border border-red-200 px-3 py-1.5"
              >
                <X size={13} color="#dc2626" />
                <Text className="text-xs font-semibold text-red-600">O&apos;chirish</Text>
              </Pressable>
            </View>
          ) : null}

          <Input
            value={receiptNote}
            onChangeText={onChangeReceiptNote}
            placeholder="To'lov izohi (ixtiyoriy) — mas. karta oxirgi 4 raqami"
            maxLength={300}
          />
        </View>
      ) : null}

      <View className="bg-muted mt-2 flex-row items-center gap-2 rounded-md p-2.5">
        <ShieldCheck size={14} color="#1F8A5B" />
        <Text className="text-muted-foreground flex-1 text-[11px]">
          Karta ma&apos;lumotlari to&apos;lov tizimida saqlanadi
        </Text>
      </View>
    </View>
  );
}
