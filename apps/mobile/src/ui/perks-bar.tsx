import { RotateCcw, ShieldCheck, Truck } from 'lucide-react-native';
import { Text, View } from 'react-native';

const PERKS = [
  { Icon: Truck, title: 'Tez yetkazish', sub: '24 soatda' },
  { Icon: RotateCcw, title: 'Qaytarish', sub: '14 kun' },
  { Icon: ShieldCheck, title: '100% Original', sub: 'kafolat' },
];

// Ishonch signallari qatori (yetkazish / qaytarish / originallik).
export function PerksBar() {
  return (
    <View className="mx-4 mt-4 flex-row gap-2">
      {PERKS.map((p) => (
        <View
          key={p.title}
          className="border-border flex-1 items-center rounded-2xl border bg-white px-2 py-3"
        >
          <View
            className="h-[30px] w-[30px] items-center justify-center rounded-full"
            style={{ backgroundColor: '#FDF3F5' }}
          >
            <p.Icon size={15} color="#531625" />
          </View>
          <Text className="text-foreground mt-1.5 text-[11px] font-bold">{p.title}</Text>
          <Text className="mt-0.5 text-[9px] text-neutral-400">{p.sub}</Text>
        </View>
      ))}
    </View>
  );
}
