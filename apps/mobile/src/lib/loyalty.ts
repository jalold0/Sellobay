// Sellobay mobil — "Sello Coins" iqtisodi.
// Formulalar/konstantalar endi @ecom/core-domain'da (web bilan YAGONA manba).
// Bu fayl: core'ni re-export qiladi + mobil UI'ga xos label/mock qatlamini saqlaydi.

import {
  TIERS as CORE_TIERS,
  currentTier as coreCurrentTier,
  nextTier as coreNextTier,
  type LoyaltyTier as CoreLoyaltyTier,
  type TierKey,
} from '@ecom/core-domain';

export {
  COIN_PER_SOM,
  COIN_VALUE_SOM,
  coinsForOrder,
  coinsToSom,
  tierProgressPct,
} from '@ecom/core-domain';
export type { TierKey } from '@ecom/core-domain';

// Mobil UI tier kartalarida ko'rsatiladigan nomlar (mavjud xatti-harakat saqlanadi).
const TIER_LABELS: Record<TierKey, string> = {
  bronze: 'Bronza',
  silver: 'Kumush',
  gold: 'Oltin',
  platinum: 'Platina',
};

export interface LoyaltyTier extends CoreLoyaltyTier {
  label: string;
}

function withLabel(t: CoreLoyaltyTier): LoyaltyTier {
  return { ...t, label: TIER_LABELS[t.key] };
}

export const TIERS: LoyaltyTier[] = CORE_TIERS.map(withLabel);

export function currentTier(spentSom: number): LoyaltyTier {
  return withLabel(coreCurrentTier(spentSom));
}

export function nextTier(spentSom: number): LoyaltyTier | undefined {
  const next = coreNextTier(spentSom);
  return next ? withLabel(next) : undefined;
}

// ─── Mobil mock balans/tarix (backend ulanmaguncha fallback) ───────────
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
