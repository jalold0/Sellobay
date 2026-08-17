// Global sourcing — web UI uchun umumiy tiplar.
// Backend javobi (`/api/global/sourcing`) bilan bir xil shakl.

export type SourcingStatus =
  | 'NEW'
  | 'IN_REVIEW'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'UNAVAILABLE'
  | 'ORDERED'
  | 'CANCELLED'
  | 'EXPIRED';

export type FreightMode = 'AUTO' | 'AVIA';

export interface SourcingRequestView {
  id: string;
  number: string;
  status: SourcingStatus;
  platform: string;
  sourceUrl: string;
  normalizedUrl: string;
  externalItemId: string | null;
  needsResolve: boolean;
  qty: number;
  freightMode: FreightMode;
  variantNote: string | null;
  customerNote: string | null;
  quotedTotal: number | null;
  quotedUnit: number | null;
  leadTimeMinDays: number | null;
  leadTimeMaxDays: number | null;
  quoteExpiresAt: string | null;
  quotedAt: string | null;
  operatorNote: string | null;
  orderId: string | null;
  createdAt: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

/** Mijoz javobini kutayotgan yagona status — CTA shu holatda ko'rsatiladi. */
export const AWAITING_CUSTOMER: SourcingStatus = 'QUOTED';

/** Yakunlangan (endi o'zgarmaydigan) statuslar. */
export const CLOSED_STATUSES: readonly SourcingStatus[] = [
  'REJECTED',
  'UNAVAILABLE',
  'CANCELLED',
  'EXPIRED',
  'ORDERED',
];
