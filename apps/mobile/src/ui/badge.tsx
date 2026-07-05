import { Text, View } from 'react-native';

import { cn } from './cn';

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'sale' | 'new' | 'top';

interface Props {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}

const TONES: Record<Tone, { bg: string; text: string }> = {
  default: { bg: 'bg-chip', text: 'text-foreground' },
  success: { bg: 'bg-success-chip', text: 'text-success' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-700' },
  danger: { bg: 'bg-crimson-chip', text: 'text-primary' },
  info: { bg: 'bg-sky-100', text: 'text-sky-700' },
  // Redesign badge konvensiyasi: SALE=crimson/oq, TOP=gold/crimson-deep, NEW=ink/gold-light
  sale: { bg: 'bg-primary', text: 'text-white' },
  new: { bg: 'bg-ink', text: 'text-gold-bright' },
  top: { bg: 'bg-gold', text: 'text-bordeaux-deep' },
};

export function Badge({ children, tone = 'default', className }: Props) {
  const t = TONES[tone];
  return (
    <View className={cn('rounded-full px-2.5 py-1', t.bg, className)}>
      <Text className={cn('text-[10px] font-extrabold uppercase tracking-[0.1em]', t.text)}>
        {children}
      </Text>
    </View>
  );
}
