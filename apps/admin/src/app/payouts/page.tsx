'use client';

// /payouts — sotuvchilarga to'lovlar (ADR 0015).
//
// Qaytarish muddati o'tgan savdolar to'lov kunlarida (standart 1 va 16) sotuvchi bo'yicha
// yig'iladi. Admin bank orqali o'tkazadi va to'lov topshiriqnomasi raqamini kiritib
// «To'landi» deydi — sotuvchi panelida shu raqam ko'rinadi.

import { Button, Card, EmptyState, Input, PageHeader, Skeleton, toast } from '@ecom/ui';
import { Banknote, Loader2, RefreshCw } from 'lucide-react';
import * as React from 'react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { formatDate, formatMoney } from '../../lib/format';

import type { ApiEnvelope } from '../../components/global/global-import-types';

interface Payout {
  id: string;
  amount: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
  reference: string | null;
  bankAccount: string | null;
  bankName: string | null;
  note: string | null;
  seller: { id: string; brandName: string };
  entries: number;
}

interface Payload {
  nextPayoutAt: string;
  payoutDays: number[];
  pending: Payout[];
  history: Payout[];
  balances: Array<{
    seller: { id: string; brandName: string };
    hasBankAccount: boolean;
    pending: string;
    available: string;
  }>;
}

const money = (v: string) => formatMoney(Number(v));

export default function PayoutsPage() {
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [refs, setRefs] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payouts');
      const body: ApiEnvelope<Payload> = await res.json();
      if (body.success && body.data) setData(body.data);
      else toast({ title: body.error?.message ?? 'Ro‘yxat yuklanmadi', variant: 'destructive' });
    } catch {
      toast({ title: 'Aloqa uzildi — qayta urinib ko‘ring', variant: 'destructive' });
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function post(path: string, body?: unknown) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return (await res.json()) as ApiEnvelope<{ created?: number }>;
  }

  async function runNow() {
    if (!confirm('Qaytarish muddati o‘tgan savdolar hozir to‘lovga yig‘ilsinmi?')) return;
    setBusy('run');
    try {
      const body = await post('/api/payouts/run');
      if (!body.success) {
        toast({ title: body.error?.message ?? 'Hisoblanmadi', variant: 'destructive' });
        return;
      }
      toast({
        title: body.data?.created
          ? `${body.data.created} ta sotuvchiga to‘lov hisoblandi`
          : 'To‘lovga tayyor savdo yo‘q',
        variant: 'success',
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function markPaid(p: Payout) {
    const reference = (refs[p.id] ?? '').trim();
    if (reference.length < 2) {
      toast({ title: 'To‘lov topshiriqnomasi raqamini yozing', variant: 'destructive' });
      return;
    }
    setBusy(p.id);
    try {
      const body = await post(`/api/payouts/${p.id}/paid`, { reference });
      if (!body.success) {
        toast({ title: body.error?.message ?? 'Saqlanmadi', variant: 'destructive' });
        return;
      }
      toast({ title: `${p.seller.brandName} — ${money(p.amount)} to‘landi`, variant: 'success' });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function cancel(p: Payout) {
    const reason = window.prompt(
      `${p.seller.brandName} — to‘lovni bekor qilish sababi (savdolar keyingi hisoblashga qaytadi):`,
    );
    if (reason === null) return;
    if (reason.trim().length < 3) {
      toast({ title: 'Sababni yozing', variant: 'destructive' });
      return;
    }
    setBusy(p.id);
    try {
      const body = await post(`/api/payouts/${p.id}/cancel`, { reason: reason.trim() });
      if (!body.success) {
        toast({ title: body.error?.message ?? 'Saqlanmadi', variant: 'destructive' });
        return;
      }
      toast({ title: 'To‘lov bekor qilindi — savdolar keyingi hisoblashda', variant: 'success' });
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={<Breadcrumbs overrides={{ '/payouts': 'Sotuvchilarga to‘lovlar' }} />}
        title="Sotuvchilarga to‘lovlar"
        description={
          data
            ? `Qaytarish muddati o‘tgan savdolar oyning ${data.payoutDays.join(' va ')}-kunlari to‘lovga yig‘iladi. Bank orqali o‘tkazib, topshiriqnoma raqamini kiriting. Keyingi hisoblash: ${formatDate(data.nextPayoutAt)}.`
            : 'Qaytarish muddati o‘tgan savdolar to‘lov kunlarida yig‘iladi'
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={14} className="mr-1" />
              Yangilash
            </Button>
            <Button size="sm" onClick={() => void runNow()} disabled={busy === 'run'}>
              {busy === 'run' ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
              Hozir hisoblash
            </Button>
          </div>
        }
      />

      {loading && !data ? (
        <div className="grid gap-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : !data ? null : (
        <>
          <section className="space-y-3" aria-labelledby="to-pay">
            <h2 id="to-pay" className="text-brand-ink font-serif text-xl font-semibold">
              To‘lash kerak ({data.pending.length})
            </h2>
            {data.pending.length === 0 ? (
              <EmptyState
                icon={Banknote}
                title="Hozir to‘lanadigan summa yo‘q"
                description="To‘lov kuni kelganda yoki «Hozir hisoblash» bosilganda shu yerda paydo bo‘ladi"
              />
            ) : (
              <ul className="space-y-3">
                {data.pending.map((p) => (
                  <li key={p.id}>
                    <Card className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-baseline gap-x-3">
                          <span className="font-medium">{p.seller.brandName}</span>
                          <span className="text-brand-ink font-serif text-2xl font-semibold">
                            {money(p.amount)}
                          </span>
                        </div>
                        {p.bankAccount ? (
                          <div className="text-sm">
                            <span className="font-mono">{p.bankAccount}</span>
                            {p.bankName ? (
                              <span className="text-muted-foreground"> — {p.bankName}</span>
                            ) : null}
                          </div>
                        ) : (
                          <div className="text-destructive text-sm">
                            Bank rekvizitlari yo‘q — sotuvchidan so‘rang yoki to‘lovni bekor qiling
                          </div>
                        )}
                        <div className="text-muted-foreground text-xs">
                          {formatDate(p.periodStart)} — {formatDate(p.periodEnd)}, {p.entries} ta
                          yozuv
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          aria-label={`${p.seller.brandName} — to‘lov topshiriqnomasi raqami`}
                          placeholder="Topshiriqnoma №"
                          value={refs[p.id] ?? ''}
                          onChange={(e) => setRefs((s) => ({ ...s, [p.id]: e.target.value }))}
                          className="h-9 w-44"
                        />
                        <Button size="sm" disabled={busy === p.id} onClick={() => void markPaid(p)}>
                          To‘landi
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === p.id}
                          onClick={() => void cancel(p)}
                        >
                          Bekor qilish
                        </Button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3" aria-labelledby="balances">
            <h2 id="balances" className="text-brand-ink font-serif text-xl font-semibold">
              Sotuvchilar balansi
            </h2>
            {data.balances.length === 0 ? (
              <p className="text-muted-foreground text-sm">Hali yetkazilgan savdo yo‘q.</p>
            ) : (
              <Card className="overflow-x-auto p-0">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left text-xs">
                      <th className="p-3 font-normal">Do‘kon</th>
                      <th className="p-3 text-right font-normal">Qaytarish muddatida</th>
                      <th className="p-3 text-right font-normal">To‘lovga tayyor</th>
                      <th className="p-3 font-normal">Rekvizit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.balances.map((b) => (
                      <tr key={b.seller.id}>
                        <td className="p-3">{b.seller.brandName}</td>
                        <td className="text-muted-foreground p-3 text-right tabular-nums">
                          {money(b.pending)}
                        </td>
                        <td className="p-3 text-right font-medium tabular-nums">
                          {money(b.available)}
                        </td>
                        <td className="p-3 text-xs">
                          {b.hasBankAccount ? (
                            <span className="text-muted-foreground">bor</span>
                          ) : (
                            <span className="text-destructive">yo‘q</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </section>

          {data.history.length > 0 ? (
            <section className="space-y-3" aria-labelledby="history">
              <h2 id="history" className="text-brand-ink font-serif text-xl font-semibold">
                Tarix
              </h2>
              <Card className="overflow-x-auto p-0">
                <table className="w-full min-w-[520px] text-sm">
                  <tbody className="divide-y">
                    {data.history.map((p) => (
                      <tr key={p.id}>
                        <td className="p-3">{p.seller.brandName}</td>
                        <td className="p-3 text-right tabular-nums">{money(p.amount)}</td>
                        <td className="text-muted-foreground p-3 text-xs">
                          {p.status === 'PAID'
                            ? `To‘landi ${p.paidAt ? formatDate(p.paidAt) : ''}, № ${p.reference ?? '—'}`
                            : `Bekor qilindi: ${p.note ?? ''}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
