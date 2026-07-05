import * as React from 'react';
import { View, type ViewStyle } from 'react-native';

type Direction = 'diagonal' | 'vertical' | 'horizontal';

interface Props {
  colors: readonly string[];
  direction?: Direction;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

// Dizaynda linear-gradient(...) ishlatilgan joylar.
//
// MUHIM: expo-linear-gradient (native) mavjud dev-build'da yo'q edi va crash berdi;
// react-native-svg gradient esa Android canvas'да juda katta bitmap chizib
// ("draw too large bitmap") native crash berdi. Shuning uchun gradientni
// ranglar aralashmasidan olingan bitta SOLID rang bilan chizamiz — bu to'q,
// nozik gradientlar uchun deyarli bir xil ko'rinadi va HECH QACHON crash bo'lmaydi.
// (Haqiqiy gradient kerak bo'lsa — dev-client'ни expo-linear-gradient bilan
// qaytadan build qilish kerak.)

function toRgb(hex: string): [number, number, number] {
  const s = hex.replace('#', '');
  const full =
    s.length === 3
      ? s
          .split('')
          .map((c) => c + c)
          .join('')
      : s;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function blend(colors: readonly string[]): string {
  const rgbs = colors.filter((c) => c.startsWith('#')).map(toRgb);
  if (!rgbs.length) return colors[0] ?? '#531625';
  const avg = [0, 1, 2].map((i) => Math.round(rgbs.reduce((a, c) => a + c[i], 0) / rgbs.length));
  return `rgb(${avg[0]}, ${avg[1]}, ${avg[2]})`;
}

export function Gradient({ colors, style, children }: Props) {
  return (
    <View style={[{ backgroundColor: blend(colors), overflow: 'hidden' }, style]}>{children}</View>
  );
}
