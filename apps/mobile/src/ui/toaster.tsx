import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast, type Toast } from '../store/toast';

import { cn } from './cn';

const TONE: Record<NonNullable<Toast['variant']>, { bg: string; icon: React.ReactNode }> = {
  default: { bg: 'bg-foreground', icon: <Info size={16} color="#fff" /> },
  success: { bg: 'bg-success', icon: <CheckCircle2 size={16} color="#fff" /> },
  destructive: { bg: 'bg-danger', icon: <TriangleAlert size={16} color="#fff" /> },
  warning: { bg: 'bg-warning', icon: <TriangleAlert size={16} color="#fff" /> },
};

export function Toaster() {
  const insets = useSafeAreaInsets();
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-3 z-50 gap-2"
      style={{ top: insets.top + 8 }}
    >
      {toasts.map((t) => {
        const tone = TONE[t.variant ?? 'default'];
        return (
          <View
            key={t.id}
            className={cn('flex-row items-center gap-3 rounded-xl px-4 py-3 shadow-lg', tone.bg)}
          >
            {tone.icon}
            <View className="flex-1">
              <Text className="text-sm font-semibold text-white">{t.title}</Text>
              {t.description ? (
                <Text className="text-xs text-white/85">{t.description}</Text>
              ) : null}
            </View>
            <Pressable onPress={() => dismiss(t.id)} hitSlop={8}>
              <X size={14} color="#fff" />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
