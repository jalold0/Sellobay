// /orders/global — global buyurtmalar (zayavkalar) navbati.
// Orkestr: holat + fetch shu yerda, har bir zayavka FulfillmentCard'da.

'use client';

import { EmptyState, PageHeader } from '@ecom/ui';
import { Loader2, PackageSearch } from 'lucide-react';
import * as React from 'react';

import { FulfillmentCard } from '../../../components/global/fulfillment-card';
import { Breadcrumbs } from '../../../components/layout/breadcrumbs';

import type { FulfillmentView } from '../../../components/global/fulfillment-types';
import type { ApiEnvelope } from '../../../components/global/global-import-types';

export default function GlobalFulfillmentPage() {
  const [items, setItems] = React.useState<FulfillmentView[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/global/fulfillment');
      const body: ApiEnvelope<{ items: FulfillmentView[] }> = await res.json();
      if (body.success && body.data) setItems(body.data.items);
    } catch {
      // bo'sh qoladi
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  function handleChanged(updated: FulfillmentView) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs overrides={{ '/orders/global': 'Global zayavkalar' }} />

      <PageHeader
        title="Global zayavkalar"
        description="To‘langan global buyurtmalar. Narxni jonli tekshiring, platformadan sotib oling, trek raqamni kargo saytiga kiriting."
      />

      {loading ? (
        <div className="text-muted-foreground flex items-center justify-center py-10">
          <Loader2 size={18} className="mr-2 animate-spin" /> Yuklanmoqda...
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Zayavka yo‘q"
          description="Mijoz global tovarni sotib olganda bu yerda paydo bo‘ladi."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <FulfillmentCard key={item.id} item={item} onChanged={handleChanged} />
          ))}
        </div>
      )}
    </div>
  );
}
