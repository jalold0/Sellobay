import { StatusBadge, type StatusTone } from '@ecom/ui';

import type { ProductStatus } from '@ecom/database';

const MAP: Record<ProductStatus, { label: string; tone: StatusTone }> = {
  DRAFT: { label: 'Qoralama', tone: 'muted' },
  PENDING_REVIEW: { label: 'Tekshiruvda', tone: 'warning' },
  ACTIVE: { label: 'Faol', tone: 'success' },
  ARCHIVED: { label: 'Arxivlangan', tone: 'neutral' },
  OUT_OF_STOCK: { label: 'Tugagan', tone: 'danger' },
};

export function SellerProductStatusBadge({ status }: { status: ProductStatus }) {
  const cfg = MAP[status];
  return <StatusBadge tone={cfg.tone}>{cfg.label}</StatusBadge>;
}
