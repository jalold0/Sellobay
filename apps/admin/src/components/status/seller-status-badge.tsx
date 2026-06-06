import { SELLER_STATUS_TONE, StatusBadge } from '@ecom/ui';

import type { SellerStatus } from '../../lib/mock/types';

const LABELS: Record<SellerStatus, string> = {
  PENDING: 'Tekshiruvda',
  ACTIVE: 'Faol',
  SUSPENDED: "To`xtatilgan",
  BLOCKED: 'Bloklangan',
};

export function SellerStatusBadge({ status }: { status: SellerStatus }) {
  return <StatusBadge tone={SELLER_STATUS_TONE[status] ?? 'neutral'}>{LABELS[status]}</StatusBadge>;
}

export const SELLER_STATUS_LABELS = LABELS;
