import { ORDER_STATUS_TONE, StatusBadge } from '@ecom/ui';

import type { OrderStatus } from '../../lib/mock/types';

const LABELS: Record<OrderStatus, string> = {
  PENDING: 'Kutilmoqda',
  CONFIRMED: 'Tasdiqlandi',
  PAID: "To`landi",
  PROCESSING: 'Tayyorlanmoqda',
  PACKED: "O`ralgan",
  SHIPPED: 'Jo`natildi',
  OUT_FOR_DELIVERY: 'Yetkazib berishda',
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor qilindi',
  RETURNED: 'Qaytarildi',
  REFUNDED: 'Pul qaytarildi',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <StatusBadge tone={ORDER_STATUS_TONE[status] ?? 'neutral'}>{LABELS[status]}</StatusBadge>;
}

export const ORDER_STATUS_LABELS = LABELS;
