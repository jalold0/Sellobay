// Sello Coins (loyalty) — balans/tarix + kunlik check-in.

import { authedFetch } from './core';

export interface LoyaltyData {
  coins: number;
  spentSom: number;
  history: Array<{ id: string; type: string; amount: number; reasonKey: string; daysAgo: number }>;
  checkedInToday?: boolean;
}

/** Joriy user loyalty balansi — login bo'lsa real, aks holda null (chaqiruvchi mock'ga tushadi). */
export async function fetchLoyalty(): Promise<LoyaltyData | null> {
  try {
    const res = await authedFetch('/api/loyalty');
    if (!res.ok) return null;
    const json = (await res.json()) as { success: boolean; data?: LoyaltyData };
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

export interface CheckinResult {
  alreadyClaimed: boolean;
  awarded: number;
  balance: number;
}

/** Kunlik check-in — +5 coin (kuniga 1 marta). Login kerak; null = mock rejim. */
export async function checkinDaily(): Promise<CheckinResult | null> {
  try {
    const res = await authedFetch('/api/loyalty/checkin', { method: 'POST' });
    if (!res.ok) return null;
    const json = (await res.json()) as { success: boolean; data?: CheckinResult };
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}
