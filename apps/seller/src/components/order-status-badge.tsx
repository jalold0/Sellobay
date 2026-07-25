import { StatusBadge, type StatusTone } from '@ecom/ui';

import type { OrderStatus } from '@ecom/database';

// DB'dagi OrderStatus enumining BARCHA qiymatlari (Record → TS to'liqlikni majburlaydi,
// yangi status qo'shilsa shu yerda ham qo'shish shart bo'ladi).
const MAP: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  PENDING: { label: 'Kutilmoqda', tone: 'warning' },
  CONFIRMED: { label: 'Tasdiqlandi', tone: 'info' },
  PAID: { label: 'To`landi', tone: 'info' },
  PROCESSING: { label: 'Tayyorlanmoqda', tone: 'info' },
  PACKED: { label: 'O`ralgan', tone: 'info' },
  SHIPPED: { label: 'Jo`natildi', tone: 'pending' },
  OUT_FOR_DELIVERY: { label: 'Yetkazilmoqda', tone: 'pending' },
  DELIVERED: { label: 'Yetkazildi', tone: 'success' },
  CANCELLED: { label: 'Bekor', tone: 'danger' },
  RETURNED: { label: 'Qaytarildi', tone: 'danger' },
  REFUNDED: { label: 'Pul qaytarildi', tone: 'danger' },
};

// Noma'lum status kelsa ham yiqilmasin (himoyaviy fallback).
export function SellerOrderStatusBadge({ status }: { status: string }) {
  const cfg = MAP[status as OrderStatus] ?? { label: status, tone: 'neutral' as StatusTone };
  return <StatusBadge tone={cfg.tone}>{cfg.label}</StatusBadge>;
}

export const SELLER_ORDER_STATUS_LABELS = Object.fromEntries(
  Object.entries(MAP).map(([k, v]) => [k, v.label]),
) as Record<OrderStatus, string>;
