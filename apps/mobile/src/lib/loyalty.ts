// Sellobay mobil — "Sello Coins" iqtisodi (web bilan bir xil formula).
// Mock-first: balans/tarix hozircha mock. Mobile auth → API ulanganda real bo'ladi
// (web /api/loyalty bilan bir xil shape). Iqtisod: 1 coin/1000 so'm, 1 coin = 10 so'm.

export const COIN_PER_SOM = 1 / 1000;
export const COIN_VALUE_SOM = 10;

export function coinsForOrder(totalSom: number): number {
  return Math.max(0, Math.floor(totalSom * COIN_PER_SOM));
}

export function coinsToSom(coins: number): number {
  return Math.max(0, Math.floor(coins)) * COIN_VALUE_SOM;
}

export type TierKey = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface LoyaltyTier {
  key: TierKey;
  label: string;
  min: number;
  cashbackPct: number;
  icon: string;
}

export const TIERS: LoyaltyTier[] = [
  { key: 'bronze', label: 'Bronza', min: 0, cashbackPct: 1, icon: '🥉' },
  { key: 'silver', label: 'Kumush', min: 1_000_000, cashbackPct: 2, icon: '🥈' },
  { key: 'gold', label: 'Oltin', min: 5_000_000, cashbackPct: 3, icon: '🥇' },
  { key: 'platinum', label: 'Platina', min: 20_000_000, cashbackPct: 5, icon: '💎' },
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

export interface CoinTxn {
  id: string;
  type: 'earn' | 'spend' | 'bonus';
  amount: number;
  reason: string;
  daysAgo: number;
}

export const MOCK_LOYALTY = {
  coins: 1240,
  spentSom: 8_450_000,
  history: [
    { id: 't1', type: 'earn', amount: 290, reason: 'Buyurtmadan', daysAgo: 1 },
    { id: 't2', type: 'bonus', amount: 50, reason: 'Sharh uchun bonus', daysAgo: 3 },
    { id: 't3', type: 'spend', amount: -500, reason: 'Chegirmaga ishlatildi', daysAgo: 7 },
    { id: 't4', type: 'bonus', amount: 500, reason: "Do'st taklifi bonusi", daysAgo: 12 },
    { id: 't5', type: 'earn', amount: 900, reason: 'Buyurtmadan', daysAgo: 18 },
  ] as CoinTxn[],
};

export const EARN_WAYS = [
  'Har 1 000 so‘m xariddan — 1 coin',
  'Sharh yozib — 50 coin',
  'Do‘stingizni taklif qiling — 500 coin',
  'Tug‘ilgan kunda — 1 000 coin sovg‘a',
  'Har kuni ilovaga kiring — 5 coin',
];

export const REDEEM_WAYS = [
  'Keyingi buyurtmada chegirma (1 coin = 10 so‘m)',
  'Bepul yetkazib berish — 200 coin',
  'Maxsus aksiyalarga kirish (Gold+)',
];
