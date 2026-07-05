import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { stories } from '../lib/storefront';

import { Gradient } from './gradient';

// Brend "stories" lentasi — bosilganda katalogga o'tadi.
export function StoriesRail() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}
      className="bg-white"
    >
      {stories.map((s) => (
        <Link key={s.name} href={'/catalog' as never} asChild>
          <Pressable className="w-[60px] items-center gap-1.5">
            <Gradient
              colors={s.ring}
              style={{ width: 60, height: 60, borderRadius: 999, padding: 2.5 }}
            >
              <View
                className="h-full w-full items-center justify-center rounded-full border-2 border-white"
                style={{ backgroundColor: s.bg }}
              >
                <Text className="font-serif-bold text-base" style={{ color: s.fg }}>
                  {s.label}
                </Text>
              </View>
            </Gradient>
            <Text numberOfLines={1} className="text-[10px] font-medium text-neutral-700">
              {s.name}
            </Text>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}
