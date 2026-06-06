import { PAYMENT_STATUS_TONE, StatusBadge } from '@ecom/ui';

import type { PaymentStatus } from '../../lib/mock/types';

const LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Kutilmoqda',
  AUTHORIZED: 'Avtorizatsiya',
  PAID: "To`langan",
  PARTIALLY_REFUNDED: 'Qisman qaytarilgan',
  REFUNDED: 'Qaytarilgan',
  FAILED: 'Muvaffaqiyatsiz',
  CANCELLED: 'Bekor qilingan',
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <StatusBadge tone={PAYMENT_STATUS_TONE[status] ?? 'neutral'}>{LABELS[status]}</StatusBadge>
  );
}

export const PAYMENT_STATUS_LABELS = LABELS;
