import { Card, EmptyState, Rating } from '@ecom/ui';
import { Star } from 'lucide-react';

import { formatRelative } from '../../../../lib/format';

const MY_REVIEWS = [
  {
    id: 'r1',
    productName: 'Nike Air Max 270',
    productSlug: 'nike-air-max-270',
    rating: 5,
    body: 'Juda sifatli, yetkazib berish ham tez bo`ldi. Tavsiya qilaman!',
    createdAt: '2026-05-12',
  },
  {
    id: 'r2',
    productName: 'Chanel N°5',
    productSlug: 'chanel-no5-edp-100ml',
    rating: 4,
    body: 'Asl mahsulot, hech qanday muammosiz.',
    createdAt: '2026-04-28',
  },
];

export default function MyReviewsPage() {
  if (MY_REVIEWS.length === 0) {
    return <EmptyState icon={Star} title="Hali sharh yozmaganmisiz" />;
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Mening sharhlarim</h1>
      <ul className="space-y-3">
        {MY_REVIEWS.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <a href={`/product/${r.productSlug}`} className="font-medium hover:underline">
                {r.productName}
              </a>
              <Rating value={r.rating} size={14} />
            </div>
            <p className="mt-2 text-sm">{r.body}</p>
            <div className="mt-2 text-xs text-muted-foreground">{formatRelative(r.createdAt)}</div>
          </Card>
        ))}
      </ul>
    </div>
  );
}
