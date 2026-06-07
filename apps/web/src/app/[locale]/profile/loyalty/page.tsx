import { Card } from '@ecom/ui';
import { Crown, Gift, Star } from 'lucide-react';

import { formatNumber } from '../../../../lib/format';

const TIERS = [
  { name: 'Bronze', min: 0, perk: '1% cashback', icon: '🥉' },
  { name: 'Silver', min: 1_000_000, perk: '2% cashback + bepul yetkazib berish 1M+', icon: '🥈' },
  { name: 'Gold', min: 5_000_000, perk: '3% cashback + Premium qo`llab-quvvatlash', icon: '🥇' },
  { name: 'Platinum', min: 20_000_000, perk: '5% cashback + maxsus aksiyalar', icon: '💎' },
];

export default function LoyaltyPage() {
  const points = 1240;
  const spent = 8_450_000;
  const currentTier = TIERS.slice().reverse().find((t) => spent >= t.min) ?? TIERS[0]!;
  const nextTier = TIERS.find((t) => spent < t.min);
  const progress = nextTier ? Math.min(100, ((spent - currentTier.min) / (nextTier.min - currentTier.min)) * 100) : 100;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Sodiqlik dasturi</h1>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 p-6 text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentTier.icon}</span>
            <div>
              <div className="text-xs uppercase tracking-wide opacity-80">Joriy daraja</div>
              <div className="text-2xl font-bold">{currentTier.name}</div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-xs uppercase tracking-wide opacity-80">Sizning balingiz</div>
              <div className="text-3xl font-bold">{formatNumber(points)}</div>
            </div>
          </div>

          {nextTier && (
            <div className="mt-5">
              <div className="mb-1 flex justify-between text-xs opacity-90">
                <span>Keyingi: {nextTier.icon} {nextTier.name}</span>
                <span>Yana {formatNumber(nextTier.min - spent)} so&apos;m sotib oling</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        {TIERS.map((t) => (
          <Card key={t.name} className="p-4 text-center">
            <div className="text-3xl">{t.icon}</div>
            <div className="mt-2 font-bold">{t.name}</div>
            <div className="text-xs text-muted-foreground">
              {t.min > 0 ? `${formatNumber(t.min)} so'mdan` : 'Boshlovchi'}
            </div>
            <div className="mt-2 text-xs">{t.perk}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <Gift size={16} /> Ballarni qanday yig&apos;ish
        </h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2"><Star size={14} className="text-amber-500" /> Har 10 000 so&apos;m xariddan — 100 ball</li>
          <li className="flex items-center gap-2"><Crown size={14} className="text-amber-500" /> Sharh yozib — 50 ball</li>
          <li className="flex items-center gap-2"><Star size={14} className="text-amber-500" /> Do&apos;stingizni taklif qiling — 500 ball</li>
          <li className="flex items-center gap-2"><Crown size={14} className="text-amber-500" /> Tug&apos;ilgan kunda — 1000 ball sovg&apos;a</li>
        </ul>
      </Card>
    </div>
  );
}
