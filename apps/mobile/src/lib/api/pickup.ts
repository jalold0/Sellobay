// Topshirish punktlari (pickup points) — ommaviy ro'yxat.

import type { LocalizedText } from '../mock-data';
import { getJson } from './core';

export interface PickupPoint {
  id: string;
  code: string;
  provider: string;
  name: LocalizedText | string;
  region: string;
  city: string;
  district: string | null;
  street: string;
  building: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
  workingHours: string | null;
  type?: string;
}

/** Faol topshirish punktlari (ommaviy). Xato bo'lsa bo'sh ro'yxat. */
export async function fetchPickupPoints(
  params: { region?: string; city?: string } = {},
): Promise<PickupPoint[]> {
  const qs = new URLSearchParams();
  if (params.region) qs.set('region', params.region);
  if (params.city) qs.set('city', params.city);
  const q = qs.toString();
  try {
    const json = await getJson<{ success: boolean; data?: { items: PickupPoint[] } }>(
      `/api/pickup-points${q ? `?${q}` : ''}`,
    );
    return json.data?.items ?? [];
  } catch (err) {
    if (__DEV__) console.warn('[api] fetchPickupPoints:', String(err));
    return [];
  }
}
