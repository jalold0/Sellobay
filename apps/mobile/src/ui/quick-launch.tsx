import { Link } from 'expo-router';
import * as React from 'react';
import { Pressable, Text, View } from 'react-native';

import { pickLocalized } from '../lib/format';
import { categories } from '../lib/mock-data';

// Coupang uslubidagi tez-kirish gridi — 2 qator × 4 ta tile.
// 6 ta kategoriya + Global (import demo) + Barchasi (2-panel kategoriyalar).
const TINTS = [
  '#FBF2F4',
  '#FAEEDA',
  '#E6F1FB',
  '#FBEAF0',
  '#E1F5EE',
  '#EEEDFE',
  '#F1EFE8',
  '#FAECE7',
];

interface Tile {
  key: string;
  emoji: string;
  label: string;
  href: string;
  tint: string;
}

interface Props {
  locale?: 'uz' | 'ru' | 'en';
}

export function QuickLaunch({ locale = 'uz' }: Props) {
  const tiles: Tile[] = [
    ...categories.map((c, i) => ({
      key: c.id,
      emoji: c.emoji,
      label: pickLocalized(c.name, locale),
      href: `/catalog?category=${c.slug}`,
      tint: TINTS[i % TINTS.length]!,
    })),
    { key: 'global', emoji: '🌐', label: 'Global', href: '/global', tint: TINTS[6]! },
    { key: 'all', emoji: '🛍️', label: 'Barchasi', href: '/categories', tint: TINTS[7]! },
  ];

  return (
    <View className="flex-row flex-wrap px-2">
      {tiles.map((t) => (
        <Link key={t.key} href={t.href as never} asChild>
          <Pressable className="w-1/4 items-center py-2 active:opacity-70">
            <View
              style={{ backgroundColor: t.tint }}
              className="h-14 w-14 items-center justify-center rounded-2xl"
            >
              <Text style={{ fontSize: 26 }}>{t.emoji}</Text>
            </View>
            <Text numberOfLines={1} className="text-foreground mt-1.5 text-[11px] font-medium">
              {t.label}
            </Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}
