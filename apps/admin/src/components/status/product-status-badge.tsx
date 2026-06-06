import { PRODUCT_STATUS_TONE, StatusBadge } from '@ecom/ui';

import type { ProductStatus } from '../../lib/mock/types';

const LABELS: Record<ProductStatus, string> = {
  DRAFT: 'Qoralama',
  PENDING_REVIEW: 'Tekshiruvda',
  ACTIVE: 'Faol',
  ARCHIVED: 'Arxivlangan',
  OUT_OF_STOCK: 'Tugagan',
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <StatusBadge tone={PRODUCT_STATUS_TONE[status] ?? 'neutral'}>{LABELS[status]}</StatusBadge>
  );
}

export const PRODUCT_STATUS_LABELS = LABELS;
