import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { haptics } from '../lib/haptics';

import { BottomSheet } from './bottom-sheet';

import type { MockProduct } from '../lib/mock-data';

type PriceKey = 'all' | 'lt' | 'mid' | 'high' | 'top';
type RatingKey = 'all' | '4.5' | '4.0';
type DelivKey = 'all' | 'tomorrow' | 'fast' | 'global';

export interface CatFilter {
  price: PriceKey;
  brands: string[];
  rating: RatingKey;
  delivery: DelivKey;
  inStock: boolean;
}

export const DEFAULT_FILTER: CatFilter = {
  price: 'all',
  brands: [],
  rating: 'all',
  delivery: 'all',
  inStock: false,
};

export function activeFilterCount(f: CatFilter): number {
  return (
    (f.price !== 'all' ? 1 : 0) +
    (f.brands.length ? 1 : 0) +
    (f.rating !== 'all' ? 1 : 0) +
    (f.delivery !== 'all' ? 1 : 0) +
    (f.inStock ? 1 : 0)
  );
}

export function applyClientFilters(list: MockProduct[], f: CatFilter): MockProduct[] {
  let r = list;
  if (f.brands.length) r = r.filter((p) => f.brands.includes(p.brand));
  if (f.price !== 'all') {
    r = r.filter((p) =>
      f.price === 'lt'
        ? p.price < 500_000
        : f.price === 'mid'
          ? p.price >= 500_000 && p.price < 1_500_000
          : f.price === 'high'
            ? p.price >= 1_500_000 && p.price < 3_000_000
            : p.price >= 3_000_000,
    );
  }
  if (f.rating !== 'all') r = r.filter((p) => p.rating >= parseFloat(f.rating));
  if (f.delivery !== 'all') {
    r = r.filter((p) =>
      f.delivery === 'global' ? p.origin === 'global' : p.delivery === f.delivery,
    );
  }
  if (f.inStock) r = r.filter((p) => p.inStock);
  return r;
}

const PRICE_OPTS: Array<{ id: PriceKey; label: string }> = [
  { id: 'all', label: 'Barchasi' },
  { id: 'lt', label: '500 mingacha' },
  { id: 'mid', label: '500 ming – 1.5 mln' },
  { id: 'high', label: '1.5 – 3 mln' },
  { id: 'top', label: '3 mln+' },
];
const RATING_OPTS: Array<{ id: RatingKey; label: string }> = [
  { id: 'all', label: 'Barchasi' },
  { id: '4.5', label: '4.5+' },
  { id: '4.0', label: '4.0+' },
];
const DELIV_OPTS: Array<{ id: DelivKey; label: string }> = [
  { id: 'all', label: 'Barchasi' },
  { id: 'tomorrow', label: 'Ertaga' },
  { id: 'fast', label: 'Tez (2-3 kun)' },
  { id: 'global', label: 'Global' },
];

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full border px-4 py-2.5"
      style={{
        backgroundColor: active ? '#531625' : '#fff',
        borderColor: active ? '#531625' : '#EAEAEC',
      }}
    >
      <Text className="text-[13px] font-semibold" style={{ color: active ? '#fff' : '#3a3a40' }}>
        {label}
      </Text>
    </Pressable>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  value: CatFilter;
  onApply: (f: CatFilter) => void;
  brands: string[];
  base: MockProduct[]; // joriy kategoriya bo'yicha mahsulotlar (jonli hisob uchun)
}

export function FilterSheet({ visible, onClose, value, onApply, brands, base }: Props) {
  const [draft, setDraft] = React.useState<CatFilter>(value);
  React.useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const count = applyClientFilters(base, draft).length;
  const set = (patch: Partial<CatFilter>) => {
    haptics.select();
    setDraft((d) => ({ ...d, ...patch }));
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightPct={86}>
      <View className="flex-row items-center justify-between px-5 pb-1.5 pt-1.5">
        <Text className="text-foreground font-serif text-[21px]">Filtrlar</Text>
        <Pressable onPress={() => setDraft(DEFAULT_FILTER)}>
          <Text className="text-muted-foreground text-[13px] font-semibold">Tozalash</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 22 }}
      >
        <View>
          <Text className="text-foreground mb-3 text-[13px] font-bold">Narx oralig'i</Text>
          <View className="flex-row flex-wrap gap-2.5">
            {PRICE_OPTS.map((o) => (
              <Pill
                key={o.id}
                label={o.label}
                active={draft.price === o.id}
                onPress={() => set({ price: o.id })}
              />
            ))}
          </View>
        </View>

        {brands.length ? (
          <View>
            <Text className="text-foreground mb-3 text-[13px] font-bold">Brendlar</Text>
            <View className="flex-row flex-wrap gap-2.5">
              {brands.map((b) => {
                const on = draft.brands.includes(b);
                return (
                  <Pill
                    key={b}
                    label={b}
                    active={on}
                    onPress={() =>
                      set({
                        brands: on ? draft.brands.filter((x) => x !== b) : [...draft.brands, b],
                      })
                    }
                  />
                );
              })}
            </View>
          </View>
        ) : null}

        <View>
          <Text className="text-foreground mb-3 text-[13px] font-bold">Reyting</Text>
          <View className="flex-row flex-wrap gap-2.5">
            {RATING_OPTS.map((o) => (
              <Pill
                key={o.id}
                label={o.label}
                active={draft.rating === o.id}
                onPress={() => set({ rating: o.id })}
              />
            ))}
          </View>
        </View>

        <View>
          <Text className="text-foreground mb-3 text-[13px] font-bold">Yetkazish</Text>
          <View className="flex-row flex-wrap gap-2.5">
            {DELIV_OPTS.map((o) => (
              <Pill
                key={o.id}
                label={o.label}
                active={draft.delivery === o.id}
                onPress={() => set({ delivery: o.id })}
              />
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => set({ inStock: !draft.inStock })}
          className="flex-row items-center justify-between pb-1.5"
        >
          <Text className="text-foreground text-sm font-semibold">Faqat sotuvda borlar</Text>
          <View
            className="h-7 w-12 rounded-full p-[3px]"
            style={{
              backgroundColor: draft.inStock ? '#531625' : '#E0DEDA',
              alignItems: draft.inStock ? 'flex-end' : 'flex-start',
            }}
          >
            <View
              className="h-[22px] w-[22px] rounded-full bg-white"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowRadius: 3,
                shadowOffset: { width: 0, height: 1 },
                elevation: 2,
              }}
            />
          </View>
        </Pressable>
      </ScrollView>

      <View className="border-border border-t px-5 pb-2 pt-3">
        <Pressable
          onPress={() => {
            haptics.medium();
            onApply(draft);
            onClose();
          }}
          className="bg-primary h-[52px] items-center justify-center rounded-full active:opacity-85"
        >
          <Text className="text-base font-bold text-white">{count} ta mahsulotni ko'rsatish</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
