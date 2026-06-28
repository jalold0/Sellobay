'use client';

import { Button, Card, EmptyState, Skeleton, toast } from '@ecom/ui';
import { CreditCard, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface PaymentMethod {
  id: string;
  provider: string;
  brand: string | null;
  last4: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
  createdAt: string;
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

const PROVIDER_LABEL: Record<string, string> = {
  CLICK: 'Click',
  PAYME: 'Payme',
  UZUM_BANK: 'Uzum Bank',
  UZCARD: 'Uzcard',
  HUMO: 'Humo',
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
};

export default function PaymentMethodsPage() {
  const t = useTranslations('profile.paymentPage');
  const [items, setItems] = React.useState<PaymentMethod[]>([]);
  const [loading, setLoading] = React.useState(true);

  const providerLabel = React.useCallback(
    (provider: string) =>
      provider === 'CASH_ON_DELIVERY' ? t('cash') : (PROVIDER_LABEL[provider] ?? provider),
    [t],
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payment-methods', { credentials: 'same-origin' });
      const json = (await res.json()) as ApiResult<{ items: PaymentMethod[] }>;
      if (json.success && json.data) setItems(json.data.items);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    const res = await fetch(`/api/payment-methods/${id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    const json = (await res.json()) as ApiResult<{ deleted: true }>;
    if (json.success) {
      toast({ title: t('deleted'), variant: 'success' });
      setItems((p) => p.filter((x) => x.id !== id));
    } else {
      toast({ title: json.error?.message ?? t('error'), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('title')}</h1>

      <Card className="border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/30">
        <div className="text-sm">
          <strong>{t('noticeStrong')}</strong> {t('noticeBody')}
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-5">
          <EmptyState icon={CreditCard} title={t('emptyTitle')} description={t('emptyDesc')} />
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-brand-bordeaux/10 grid h-10 w-14 shrink-0 place-items-center rounded-lg">
                  <CreditCard size={18} className="text-brand-bordeaux" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{m.brand ?? providerLabel(m.provider)}</span>
                    {m.isDefault ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                        {t('defaultBadge')}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-muted-foreground font-mono text-sm tracking-wider">
                    •••• •••• •••• {m.last4 ?? '????'}
                  </div>
                  {m.expiryMonth && m.expiryYear ? (
                    <div className="text-muted-foreground text-[11px]">
                      {t('expires')} {String(m.expiryMonth).padStart(2, '0')}/{m.expiryYear}
                    </div>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(m.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
