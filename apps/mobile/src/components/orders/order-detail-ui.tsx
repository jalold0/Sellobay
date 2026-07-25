// Buyurtma detali mayda prezentatsion bo'laklari: Row (summa qatori) va DetailHeader.
import { ChevronLeft } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, Text, View } from 'react-native';

import { cn } from '../../ui/cn';

export function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-muted-foreground text-sm">{label}</Text>
      <Text className={cn('text-sm', accent ? 'text-success font-medium' : 'text-foreground')}>
        {value}
      </Text>
    </View>
  );
}

export function DetailHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View className="flex-row items-center px-3 pb-1">
      <Pressable
        onPress={onBack}
        hitSlop={8}
        className="active:bg-muted h-10 w-10 items-center justify-center rounded-full"
      >
        <ChevronLeft size={22} color="#0A0A0C" />
      </Pressable>
      <Text numberOfLines={1} className="flex-1 text-center text-base font-semibold">
        {title}
      </Text>
      <View className="w-10" />
    </View>
  );
}
