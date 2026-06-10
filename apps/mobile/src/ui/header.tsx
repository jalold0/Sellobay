import { useRouter, type Href } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  title?: string;
  showBack?: boolean;
  fallbackHref?: Href;
  right?: React.ReactNode;
  transparent?: boolean;
}

export function Header({ title, showBack, fallbackHref, right, transparent }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{ paddingTop: insets.top }}
      className={transparent ? 'bg-transparent' : 'border-border bg-background border-b'}
    >
      <View className="h-12 flex-row items-center px-3">
        {showBack ? (
          <Pressable
            onPress={() => {
              if (router.canGoBack()) router.back();
              else if (fallbackHref) router.replace(fallbackHref);
            }}
            hitSlop={10}
            className="active:bg-muted h-10 w-10 items-center justify-center rounded-full"
          >
            <ChevronLeft size={22} color="#0A0A0C" />
          </Pressable>
        ) : (
          <View className="w-10" />
        )}
        <Text
          numberOfLines={1}
          className="text-foreground flex-1 text-center text-base font-semibold"
        >
          {title ?? ''}
        </Text>
        <View className="w-10 items-end">{right}</View>
      </View>
    </View>
  );
}
