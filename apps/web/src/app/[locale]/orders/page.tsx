'use client';

import { Button, Card, Input, StatusBadge } from '@ecom/ui';
import { CheckCircle2, MapPin, Package, Phone, Search, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { ORDER_STATUS_TONE } from '../../../lib/order-status';
import { formatDateTime } from '../../../lib/format';

// Mock — order tracking endpointi backend tayyor bo'lganda
function findOrder(query: string) {
  if (!query) return null;
  const q = query.toUpperCase();
  if (q.startsWith('ORD-')) {
    return {
      number: q,
      status: 'OUT_FOR_DELIVERY' as const,
      placedAt: '2026-06-04T08:00:00Z',
      timeline: [
        { status: 'PENDING' as const, at: '2026-06-04T08:00:00Z' },
        { status: 'CONFIRMED' as const, at: '2026-06-04T08:30:00Z' },
        { status: 'PAID' as const, at: '2026-06-04T08:32:00Z' },
        { status: 'PROCESSING' as const, at: '2026-06-04T14:00:00Z' },
        { status: 'PACKED' as const, at: '2026-06-05T09:00:00Z' },
        { status: 'SHIPPED' as const, at: '2026-06-05T15:00:00Z' },
        { status: 'OUT_FOR_DELIVERY' as const, at: '2026-06-06T07:30:00Z' },
      ],
      courier: { name: 'Bekzod A.', phone: '+998 90 123 45 67', vehicle: 'Mototsikl' },
      destination: "Toshkent sh., Yunusobod, Mustaqillik ko'chasi 12",
    };
  }
  return null;
}

export default function OrderTrackerPage() {
  const t = useTranslations('tracking');
  const tStatus = useTranslations('order.status');
  const tc = useTranslations('common');
  const [query, setQuery] = React.useState('');
  const [result, setResult] = React.useState<ReturnType<typeof findOrder>>(null);
  const [searched, setSearched] = React.useState(false);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    setResult(findOrder(query.trim()));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
      </div>

      <form onSubmit={onSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ORD-2026-00001234"
            className="pl-9"
          />
        </div>
        <Button type="submit">{tc('search')}</Button>
      </form>

      {searched && !result && (
        <Card className="p-6 text-center">
          <Package className="text-muted-foreground mx-auto h-10 w-10" />
          <p className="text-muted-foreground mt-3 text-sm">{t('notFound')}</p>
        </Card>
      )}

      {result && (
        <Card className="overflow-hidden">
          <div className="bg-secondary/40 border-b p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-muted-foreground text-xs uppercase tracking-wide">
                  {t('orderNumber')}
                </div>
                <div className="font-mono text-lg font-bold">{result.number}</div>
              </div>
              <StatusBadge tone={ORDER_STATUS_TONE[result.status]}>
                {tStatus(result.status)}
              </StatusBadge>
            </div>
          </div>

          <div className="p-5">
            <ol className="relative space-y-4 border-l pl-6">
              {result.timeline.map((step, i) => {
                const isLast = i === result.timeline.length - 1;
                return (
                  <li key={i} className="relative">
                    <span
                      className={`absolute -left-[31px] grid h-6 w-6 place-items-center rounded-full border ${
                        isLast
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-background'
                      }`}
                    >
                      <CheckCircle2 size={12} />
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{tStatus(step.status)}</div>
                      <div className="text-muted-foreground text-xs">{formatDateTime(step.at)}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {result.courier && (
            <div className="bg-secondary/30 border-t p-5">
              <div className="text-muted-foreground text-xs uppercase tracking-wide">
                {t('courier')}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="bg-primary/10 text-primary grid h-10 w-10 place-items-center rounded-full">
                  <Truck size={18} />
                </div>
                <div>
                  <div className="font-medium">{result.courier.name}</div>
                  <div className="text-muted-foreground text-xs">{result.courier.vehicle}</div>
                </div>
                <a
                  href={`tel:${result.courier.phone.replace(/\s/g, '')}`}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 ml-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
                >
                  <Phone size={14} /> {result.courier.phone}
                </a>
              </div>
              <div className="mt-3 flex items-start gap-2 text-sm">
                <MapPin size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                <span>{result.destination}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className="p-5 text-sm">
        <div className="font-semibold">{t('helpTitle')}</div>
        <p className="text-muted-foreground mt-1">{t('helpDesc')}</p>
        <a
          href="tel:+998712000000"
          className="bg-background hover:bg-accent mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <Phone size={14} className="text-primary" /> +998 71 200 00 00
        </a>
      </Card>
    </div>
  );
}
