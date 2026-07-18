// Qabul qiluvchi modal — matn kiritish shu yerda (asosiy ekran toza qoladi).
import { X } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { haptics } from '../../lib/haptics';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

import { type AddressForm, type DeliveryType } from './types';

type Props = {
  topInset: number;
  bottomInset: number;
  address: AddressForm;
  deliveryType: DeliveryType | null;
  onChangeFirstName: (v: string) => void;
  onChangeLastName: (v: string) => void;
  onChangePhone: (v: string) => void;
  onClose: () => void;
};

export function RecipientModal({
  topInset,
  bottomInset,
  address,
  deliveryType,
  onChangeFirstName,
  onChangeLastName,
  onChangePhone,
  onClose,
}: Props) {
  return (
    <View className="bg-background absolute inset-0" style={{ elevation: 20, zIndex: 20 }}>
      <View
        className="border-border flex-row items-center border-b px-3 pb-2"
        style={{ paddingTop: topInset + 6 }}
      >
        <Pressable
          onPress={onClose}
          hitSlop={8}
          className="active:bg-muted h-10 w-10 items-center justify-center rounded-full"
        >
          <X size={22} color="#0A0A0C" />
        </Pressable>
        <Text className="flex-1 text-center text-base font-semibold">Qabul qiluvchi</Text>
        <View className="w-10" />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Input label="Ism*" value={address.firstName} onChangeText={onChangeFirstName} />
          </View>
          <View className="flex-1">
            <Input label="Familiya" value={address.lastName} onChangeText={onChangeLastName} />
          </View>
        </View>
        <Input
          label="Telefon*"
          value={address.phone}
          onChangeText={onChangePhone}
          keyboardType="phone-pad"
        />
        {deliveryType === 'REGION_PICKUP' ? (
          <Text className="text-muted-foreground text-xs">
            Viloyat va shahar tanlangan topshirish punktidan olinadi.
          </Text>
        ) : null}
      </ScrollView>
      <View
        className="border-border bg-background border-t px-4 pt-3"
        style={{ paddingBottom: bottomInset + 12 }}
      >
        <Button
          fullWidth
          size="lg"
          onPress={() => {
            haptics.light();
            onClose();
          }}
        >
          Saqlash
        </Button>
      </View>
    </View>
  );
}
