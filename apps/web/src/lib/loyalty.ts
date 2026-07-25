// Sellobay — "Sello Coins" sodiqlik tizimi.
// Sof iqtisod/formulalar endi @ecom/core-domain'da (yagona manba, web + mobil).
// Bu fayl: core-domain'ni re-export qiladi + web'ga xos MOCK data'ni saqlaydi.

export {
  COIN_PER_SOM,
  COIN_VALUE_SOM,
  coinsForOrder,
  coinsToSom,
  TIERS,
  currentTier,
  nextTier,
  tierProgressPct,
} from '@ecom/core-domain';
export type { TierKey, LoyaltyTier } from '@ecom/core-domain';

// ─── Mock balans/tarix (backend ulanmaguncha; web UI uchun) ────────────
export interface CoinTxn {
  id: string;
  type: 'earn' | 'spend' | 'bonus' | 'expire';
  amount: number; // + earn/bonus, − spend/expire
  reasonKey: string; // i18n kalit: loyalty.history.<reasonKey>
  daysAgo: number;
}

export const MOCK_LOYALTY = {
  coins: 1240,
  spentSom: 8_450_000,
  history: [
    { id: 't1', type: 'earn', amount: 290, reasonKey: 'orderEarn', daysAgo: 1 },
    { id: 't2', type: 'bonus', amount: 50, reasonKey: 'review', daysAgo: 3 },
    { id: 't3', type: 'spend', amount: -500, reasonKey: 'discount', daysAgo: 7 },
    { id: 't4', type: 'bonus', amount: 500, reasonKey: 'referral', daysAgo: 12 },
    { id: 't5', type: 'earn', amount: 900, reasonKey: 'orderEarn', daysAgo: 18 },
  ] as CoinTxn[],
};
