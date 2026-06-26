import { Tabs } from 'expo-router';
import { Heart, Home, Search, ShoppingBag, User } from 'lucide-react-native';
import * as React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '../../src/lib/haptics';
import { useCart } from '../../src/store/cart';

export default function TabsLayout() {
  const cartCount = useCart((s) => s.totalQuantity());
  const insets = useSafeAreaInsets();

  // Android tizim nav bar yoki iOS home indicator uchun safe area
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenListeners={{ tabPress: () => haptics.select() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8B0020',
        tabBarInactiveTintColor: '#6B6B73',
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
        tabBarStyle: {
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: '#EAEAEC',
          backgroundColor: '#ffffff',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bosh',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Katalog',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Savatcha',
          tabBarIcon: ({ color, size }) => (
            <View>
              <ShoppingBag size={size} color={color} />
              {cartCount > 0 ? (
                <View className="bg-accent absolute -right-2 -top-1 h-4 min-w-4 items-center justify-center rounded-full px-1">
                  <Text className="text-[9px] font-bold text-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </Text>
                </View>
              ) : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Sevimli',
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
