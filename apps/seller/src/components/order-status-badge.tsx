import { StatusBadge, type StatusTone } from '@ecom/ui';

import type { SellerOrder } from '../lib/mock';

const MAP: Record<SellerOrder['status'], { label: string; tone: StatusTone }> = {
  PENDING: { label: 'Kutilmoqda', tone: 'warning' },
  CONFIRMED: { label: 'Tasdiqlandi', tone: 'info' },
  PAID: { label: "To`landi", tone: 'info' },
  PROCESSING: { label: 'Tayyorlanmoqda', tone: 'info' },
  PACKED: { label: "O`ralgan", tone: 'info' },
  SHIPPED: { label: "Jo`natildi", tone: 'pending' },
  DELIVERED: { label: 'Yetkazildi', tone: 'success' },
  CANCELLED: { label: 'Bekor', tone: 'danger' },
  RETURNED: { label: 'Qaytarildi', tone: 'danger' },
};

export function SellerOrderStatusBadge({ status }: { status: SellerOrder['status'] }) {
  const cfg = MAP[status];
  return <StatusBadge tone={cfg.tone}>{cfg.label}</StatusBadge>;
}

export const SELLER_ORDER_STATUS_LABELS = Object.fromEntries(
  Object.entries(MAP).map(([k, v]) => [k, v.label]),
) as Record<SellerOrder['status'], string>;
