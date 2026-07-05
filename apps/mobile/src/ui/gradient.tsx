import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import type { ViewStyle } from 'react-native';

type Direction = 'diagonal' | 'vertical' | 'horizontal';

interface Props {
  colors: readonly string[];
  direction?: Direction;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

const DIRS: Record<Direction, { start: { x: number; y: number }; end: { x: number; y: number } }> =
  {
    diagonal: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    vertical: { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
    horizontal: { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  };

// Dizayndagi linear-gradient(...) larni expo-linear-gradient bilan qayta yaratadi.
// (Bu native modul dev-client build'iga kiritilgan — 2026-07 EAS build.)
export function Gradient({ colors, direction = 'diagonal', style, children }: Props) {
  const d = DIRS[direction];
  return (
    <LinearGradient
      colors={colors as [string, string, ...string[]]}
      start={d.start}
      end={d.end}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
