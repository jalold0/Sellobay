'use client';

// 3PL kartochkasi (ADR 0015): buyurtma omborda yig'ilgach logistika kompaniyasiga topshiriladi —
// kompaniya nomi va trek raqami kiritiladi. Keyin holat shu yerda belgilanadi (provayder API'si
// ulangach webhook o'zi belgilaydi): yetkazilmoqda, yetkazildi yoki mijoz topshirishda rad etdi.

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, toast } from '@ecom/ui';
import { Truck } from 'lucide-react';
import * as React from 'react';

import type { AdminOrderDetail } from '@/lib/auth/client';

const LAST_COMPANY_KEY = 'sellobay.admin.lastCarrierCompany';

const STATUS_LABEL: Record<string, string> = {
  HANDED_OVER: 'Topshirildi',
  OUT_FOR_DELIVERY: 'Yetkazilmoqda',
  DELIVERED: 'Yetkazildi',
  REFUSED: 'Mijoz rad etdi',
};

interface Props {
  orderId: string;
  carrier: AdminOrderDetail['carrier'];
  events: AdminOrderDetail['carrierEvents'];
  onChanged: () => void;
}

async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as { success: boolean; error?: { message: string } };
}

export function CarrierCard({ orderId, carrier, events, onChanged }: Props) {
  const [company, setCompany] = React.useState('');
  const [tracking, setTracking] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    try {
      setCompany(window.localStorage.getItem(LAST_COMPANY_KEY) ?? '');
    } catch {
      // Saqlash o'chiq — maydon bo'sh qoladi.
    }
  }, []);

  if (!carrier && events.length === 0) return null;

  async function handOver(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await post(`/api/orders/${orderId}/carrier`, {
      company: company.trim(),
      trackingNumber: tracking.trim(),
    });
    setBusy(false);
    if (!res.success) {
      toast({ title: res.error?.message ?? 'Saqlanmadi', variant: 'destructive' });
      return;
    }
    try {
      window.localStorage.setItem(LAST_COMPANY_KEY, company.trim());
    } catch {
      // Eslab qolinmasa ham ish to'xtamaydi.
    }
    toast({
      title: `${company.trim()} ga topshirildi`,
      description: 'Mijozga trek raqami ko‘rinadi',
      variant: 'success',
    });
    onChanged();
  }

  async function send(event: 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'REFUSED') {
    let note: string | undefined;
    if (event === 'REFUSED') {
      const r = window.prompt('Mijoz nima sababdan rad etdi? (tovar omborga qaytadi)');
      if (r === null) return;
      note = r.trim();
    }
    setBusy(true);
    const res = await post(`/api/orders/${orderId}/carrier/event`, { event, note });
    setBusy(false);
    if (!res.success) {
      toast({ title: res.error?.message ?? 'Saqlanmadi', variant: 'destructive' });
      return;
    }
    toast({
      title: STATUS_LABEL[event],
      description:
        event === 'REFUSED' ? 'Tovar omborga kelganda «Qaytarishlar»da qabul qiling' : undefined,
      variant: 'success',
    });
    onChanged();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Truck className="text-muted-foreground h-4 w-4" />
        <CardTitle className="text-sm">Yetkazish (3PL)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {carrier ? (
          <div className="space-y-0.5">
            <div className="font-medium">{carrier.company}</div>
            {carrier.trackingNumber ? (
              <div className="font-mono text-xs">{carrier.trackingNumber}</div>
            ) : null}
            {carrier.status ? (
              <div className="text-muted-foreground text-xs">
                {STATUS_LABEL[carrier.status] ?? carrier.status}
                {carrier.status === 'REFUSED' && carrier.failureReason
                  ? `: ${carrier.failureReason}`
                  : ''}
              </div>
            ) : null}
          </div>
        ) : null}

        {events.includes('HANDED_OVER') ? (
          <form onSubmit={(e) => void handOver(e)} className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="carrier-company" className="text-xs">
                Logistika kompaniyasi
              </Label>
              <Input
                id="carrier-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Masalan: Fargo"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="carrier-tracking" className="text-xs">
                Trek raqami
              </Label>
              <Input
                id="carrier-tracking"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                className="h-9 font-mono"
              />
            </div>
            <Button type="submit" size="sm" className="w-full" disabled={busy}>
              Kompaniyaga topshirish
            </Button>
          </form>
        ) : null}

        {events.some((e) => e !== 'HANDED_OVER') ? (
          <div className="flex flex-wrap gap-2">
            {events.includes('OUT_FOR_DELIVERY') ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void send('OUT_FOR_DELIVERY')}
              >
                Yetkazilmoqda
              </Button>
            ) : null}
            {events.includes('DELIVERED') ? (
              <Button size="sm" disabled={busy} onClick={() => void send('DELIVERED')}>
                Yetkazildi
              </Button>
            ) : null}
            {events.includes('REFUSED') ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void send('REFUSED')}
              >
                Mijoz rad etdi
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
