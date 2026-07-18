// Checkout mayda prezentatsion bo'laklari: Header, Stepper, ReviewBlock.
import { Check, ChevronLeft } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, Text, View } from 'react-native';

import { STEPS } from './types';

export function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View className="flex-row items-center px-3">
      <Pressable
        onPress={onBack}
        hitSlop={8}
        className="active:bg-muted h-10 w-10 items-center justify-center rounded-full"
      >
        <ChevronLeft size={22} color="#0A0A0C" />
      </Pressable>
      <Text className="flex-1 text-center text-base font-semibold">{title}</Text>
      <View className="w-10" />
    </View>
  );
}

// Compact stepper: circle'lar + ulanish chiziq + active step label
export function Stepper({ stepIdx }: { stepIdx: number }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {STEPS.map((s, i) => {
          const done = i < stepIdx;
          const active = i === stepIdx;
          return (
            <React.Fragment key={s.id}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: done ? '#0A0A0C' : active ? '#531625' : '#E5E7EB',
                }}
              >
                {done ? (
                  <Check size={14} color="#C9A961" strokeWidth={3} />
                ) : (
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: active ? '#fff' : '#6B6B73',
                    }}
                  >
                    {i + 1}
                  </Text>
                )}
              </View>
              {i < STEPS.length - 1 ? (
                <View
                  style={{
                    flex: 1,
                    height: 2,
                    marginHorizontal: 4,
                    backgroundColor: done ? '#0A0A0C' : '#E5E7EB',
                    borderRadius: 1,
                  }}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
      <Text
        style={{
          marginTop: 8,
          fontSize: 13,
          fontWeight: '600',
          textAlign: 'center',
          color: '#0A0A0C',
        }}
      >
        {STEPS[stepIdx]!.label}
        <Text style={{ color: '#6B6B73', fontWeight: '400' }}>
          {'  ·  '}
          {stepIdx + 1}/{STEPS.length}
        </Text>
      </Text>
    </View>
  );
}

export function ReviewBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View className="border-border bg-card rounded-2xl border p-3">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
          {title}
        </Text>
        {onEdit ? (
          <Pressable onPress={onEdit} hitSlop={4}>
            <Text className="text-primary text-xs">O&apos;zgartirish</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}
