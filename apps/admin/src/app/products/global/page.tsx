// /products/global — Xitoy tovarlarini katalogga import qilish (operator paneli).
// Orkestr: holat + fetch shu yerda, ko'rinish seksiyalarda (forma / ro'yxat).

'use client';

import { PageHeader } from '@ecom/ui';
import * as React from 'react';

import { GlobalCatalogList } from '../../../components/global/global-catalog-list';
import { GlobalImportForm } from '../../../components/global/global-import-form';
import { Breadcrumbs } from '../../../components/layout/breadcrumbs';

import type { ApiEnvelope, GlobalCatalogRow } from '../../../components/global/global-import-types';

export default function GlobalCatalogPage() {
  const [items, setItems] = React.useState<GlobalCatalogRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/global/catalog');
      const body: ApiEnvelope<{ items: GlobalCatalogRow[] }> = await res.json();
      if (body.success && body.data) setItems(body.data.items);
    } catch {
      // ro'yxat bo'sh qoladi — forma baribir ishlaydi
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <Breadcrumbs overrides={{ '/products/global': 'Global import' }} />

      <PageHeader
        title="Global katalog"
        description="Taobao, Tmall, 1688 va Weidian tovarlarini o‘zbekcha katalogga import qiling. Narx yuk, agent, boj, kurs zaxirasi va marja bilan avtomatik hisoblanadi."
      />

      <GlobalImportForm onImported={() => void load()} />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Import qilinganlar</h2>
        <GlobalCatalogList items={items} loading={loading} onUpdated={() => void load()} />
      </section>
    </div>
  );
}
