import * as React from 'react';
import { Text, View } from 'react-native';

import { cn } from './cn';

// Orqaga sanovchi taymer (HH:MM:SS) — flash sale shoshilinchligi uchun.
// `until` — tugash vaqti (ms timestamp). 0 ga yetganda 00:00:00 turadi.
export function Countdown({ until, className }: { until: number; className?: string }) {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const totalSec = Math.max(0, Math.floor((until - now) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <View className={cn('flex-row items-center gap-0.5', className)}>
      {[pad(h), pad(m), pad(s)].map((v, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <Text className="text-foreground text-[11px] font-black">:</Text> : null}
          <View className="bg-dark rounded px-1 py-0.5">
            <Text className="text-[11px] font-black text-white">{v}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}
