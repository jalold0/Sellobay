// Sellobay — "Sello Coins" sodiqlik iqtisodi (BITTA HAQIQAT MANBAI, web + mobil).
// Sof funksiyalar/konstantalar — framework/DB'ga bog'liq emas.
//
// Iqtisod:
//   • Earn: har 1 000 so'm xariddan 1 Sello Coin (≈1% cashback)
//   • Redeem: 1 Sello Coin = 10 so'm chegirma

export const COIN_PER_SOM = 1 / 1000; // 1 coin / 1000 so'm
export const COIN_VALUE_SOM = 10; // 1 coin = 10 so'm redeem qiymati

/** Buyurtma uchun ishlab olinadigan coinlar (butun songa yaxlitlanadi). */
export function coinsForOrder(totalSom: number): number {
  return Math.max(0, Math.floor(totalSom * COIN_PER_SOM));
}

/** Coinlarning so'mdagi qiymati. */
export function coinsToSom(coins: number): number {
  return Math.max(0, Math.floor(coins)) * COIN_VALUE_SOM;
}

export type TierKey = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface LoyaltyTier {
  key: TierKey;
  min: number; // tier uchun minimal umumiy xarid (so'm)
  cashbackPct: number;
  icon: string;
}

export const TIERS: LoyaltyTier[] = [
  { key: 'bronze', min: 0, cashbackPct: 1, icon: '🥉' },
  { key: 'silver', min: 1_000_000, cashbackPct: 2, icon: '🥈' },
  { key: 'gold', min: 5_000_000, cashbackPct: 3, icon: '🥇' },
  { key: 'platinum', min: 20_000_000, cashbackPct: 5, icon: '💎' },
];

export function currentTier(spentSom: number): LoyaltyTier {
  return (
    TIERS.slice()
      .reverse()
      .find((t) => spentSom >= t.min) ?? TIERS[0]!
  );
}

export function nextTier(spentSom: number): LoyaltyTier | undefined {
  return TIERS.find((t) => spentSom < t.min);
}

export function tierProgressPct(spentSom: number): number {
  const cur = currentTier(spentSom);
  const next = nextTier(spentSom);
  if (!next) return 100;
  return Math.min(100, ((spentSom - cur.min) / (next.min - cur.min)) * 100);
}
