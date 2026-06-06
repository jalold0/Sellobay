import { StatusBadge, type StatusTone } from '@ecom/ui';

import type { SellerProduct } from '../lib/mock';

const MAP: Record<SellerProduct['status'], { label: string; tone: StatusTone }> = {
  DRAFT: { label: 'Qoralama', tone: 'muted' },
  PENDING_REVIEW: { label: 'Tekshiruvda', tone: 'warning' },
  ACTIVE: { label: 'Faol', tone: 'success' },
  ARCHIVED: { label: 'Arxivlangan', tone: 'neutral' },
  OUT_OF_STOCK: { label: 'Tugagan', tone: 'danger' },
};

export function SellerProductStatusBadge({ status }: { status: SellerProduct['status'] }) {
  const cfg = MAP[status];
  return <StatusBadge tone={cfg.tone}>{cfg.label}</StatusBadge>;
}
