'use client';

// Sotuvchi moliyasi (ADR 0015). Sahifa bitta savolga javob beradi: «qachon va qancha olaman?».
// Hammasi hisob daftaridan: yetkazilgan savdo (+), komissiya va xizmat haqi (−), qaytarish
// (teskari), to'lov (−). Savdo yetkazilganidan 10 kun o'tib (qaytarish muddati) to'lovga
// tayyor bo'ladi va oyning to'lov kunlarida bank orqali o'tkaziladi.

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Card,
  PageHeader,
  StatusBadge,
  toast,
} from '@ecom/ui';
import { Landmark } from 'lucide-react';
import * as React from 'react';

import { getSellerFinance, type LedgerEntryType, type SellerFinance } from '../../lib/auth/client';
import { formatDate, formatMoney } from '../../lib/format';

import type { StatusTone } from '@ecom/ui';

const ENTRY_LABEL: Record<LedgerEntryType, string> = {
  SALE: 'Sotuv',
  COMMISSION: 'Komissiya',
  FULFILLMENT_FEE: 'Xizmat haqi',
  RETURN_SALE: 'Qaytarilgan sotuv',
  RETURN_COMMISSION: 'Komissiya qaytdi',
  RETURN_FULFILLMENT_FEE: 'Xizmat haqi qaytdi',
  PAYOUT: 'To‘lov',
  ADJUSTMENT: 'Tuzatish',
};

/** Izoh qo'shimcha ma'lumot bergandagina: model, foiz, dona soni. */
const NOTE_SHOWN = new Set<LedgerEntryType>([
  'SALE',
  'COMMISSION',
  'FULFILLMENT_FEE',
  'ADJUSTMENT',
]);

const PAYOUT_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  PENDING: { label: 'Bank o‘tkazmasida', tone: 'warning' },
  PAID: { label: 'To‘landi', tone: 'success' },
  CANCELLED: { label: 'Bekor qilindi', tone: 'muted' },
};

function signed(amount: string): string {
  const n = Number(amount);
  return n > 0 ? `+${formatMoney(n)}` : formatMoney(n);
}

export default function SellerFinancePage() {
  const [data, setData] = React.useState<SellerFinance | null>(null);
  const [loading, setLoading] = React.useState(true);
  const now = Date.now();

  React.useEffect(() => {
    let alive = true;
    void getSellerFinance().then((res) => {
      if (!alive) return;
      if (res.success) setData(res.data);
      else toast({ title: res.error.message, variant: 'destructive' });
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return <div className="text-muted-foreground py-20 text-center text-sm">Yuklanmoqda...</div>;
  }
  if (!data) {
    return (
      <div className="text-muted-foreground py-20 text-center text-sm">
        Moliya ma’lumoti yuklanmadi — sahifani yangilang
      </div>
    );
  }

  const { balance, tariff, bank } = data;
  const next = Number(balance.nextPayoutAmount);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Moliya"
        description={`Savdo yetkazilganidan 10 kun o‘tib (qaytarish muddati) to‘lovga tayyor bo‘ladi. To‘lov oyning ${tariff.payoutDays.join(' va ')}-kunlari bank orqali o‘tkaziladi.`}
      />

      {!bank.accountTail ? (
        <Alert variant="destructive">
          <Landmark className="h-4 w-4" />
          <AlertTitle>Bank rekvizitlari kiritilmagan</AlertTitle>
          <AlertDescription>
            Pulni o‘tkazish uchun hisob raqamingiz kerak. Administratorga hisob raqami va bank
            nomini yuboring.
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="next-payout" className="space-y-1">
        <h2 id="next-payout" className="text-muted-foreground text-sm">
          Keyingi to‘lov — {formatDate(balance.nextPayoutAt)}
        </h2>
        <div className="text-brand-ink font-serif text-4xl font-semibold">
          {formatMoney(Math.max(0, next))}
        </div>
        <p className="text-muted-foreground text-sm">
          {next > 0
            ? `Shu kungacha qaytarish muddati o‘tadigan savdolar${bank.accountTail ? `, hisob ••${bank.accountTail}${bank.name ? ` (${bank.name})` : ''}` : ''}.`
            : 'Hozircha shu kunga to‘lanadigan savdo yo‘q.'}
        </p>
      </section>

      <dl className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <dt className="text-muted-foreground text-xs">Qaytarish muddatida</dt>
          <dd className="text-xl font-semibold tabular-nums">{formatMoney(balance.pending)}</dd>
        </Card>
        <Card className="p-4">
          <dt className="text-muted-foreground text-xs">Bank o‘tkazmasida</dt>
          <dd className="text-xl font-semibold tabular-nums">{formatMoney(balance.inPayout)}</dd>
        </Card>
        <Card className="p-4">
          <dt className="text-muted-foreground text-xs">Jami to‘langan</dt>
          <dd className="text-xl font-semibold tabular-nums">{formatMoney(balance.paid)}</dd>
        </Card>
      </dl>

      <p className="text-sm">
        Sizning modelingiz: <span className="font-medium">{tariff.model}</span>. Komissiya{' '}
        {tariff.commissionPct}%
        {Number(tariff.feePerUnit) > 0
          ? `, xizmat haqi ${formatMoney(tariff.feePerUnit)} har dona uchun`
          : ', xizmat haqi yo‘q'}
        .
      </p>

      <section aria-labelledby="ledger" className="space-y-3">
        <h2 id="ledger" className="text-brand-ink font-serif text-xl font-semibold">
          Hisob daftari
        </h2>
        {data.entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Hali yozuv yo‘q. Buyurtma mijozga yetkazilganda sotuv shu yerda paydo bo‘ladi.
          </p>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th className="p-3 font-normal">Sana</th>
                  <th className="p-3 font-normal">Buyurtma</th>
                  <th className="p-3 font-normal">Amal</th>
                  <th className="p-3 text-right font-normal">Summa</th>
                  <th className="p-3 font-normal">Holat</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.entries.map((e) => (
                  <tr key={e.id}>
                    <td className="text-muted-foreground p-3 text-xs">{formatDate(e.createdAt)}</td>
                    <td className="p-3 font-mono text-xs">{e.orderNumber ?? '—'}</td>
                    <td className="p-3">
                      {ENTRY_LABEL[e.type]}
                      {e.note && NOTE_SHOWN.has(e.type) ? (
                        <span className="text-muted-foreground text-xs"> ({e.note})</span>
                      ) : null}
                    </td>
                    <td
                      className={`p-3 text-right tabular-nums ${Number(e.amount) > 0 ? 'text-emerald-700' : ''}`}
                    >
                      {signed(e.amount)}
                    </td>
                    <td className="text-muted-foreground p-3 text-xs">
                      {e.type === 'PAYOUT'
                        ? `№ ${e.note ?? '—'}`
                        : e.inPayout
                          ? 'To‘lovga kiritildi'
                          : new Date(e.availableAt).getTime() > now
                            ? `${formatDate(e.availableAt)} dan to‘lovga`
                            : Number(e.amount) < 0
                              ? 'Keyingi to‘lovdan ushlanadi'
                              : 'To‘lovga tayyor'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {data.payouts.length > 0 ? (
        <section aria-labelledby="payouts" className="space-y-3">
          <h2 id="payouts" className="text-brand-ink font-serif text-xl font-semibold">
            To‘lovlar
          </h2>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[520px] text-sm">
              <tbody className="divide-y">
                {data.payouts.map((p) => {
                  const cfg = PAYOUT_STATUS[p.status] ?? { label: p.status, tone: 'muted' };
                  return (
                    <tr key={p.id}>
                      <td className="text-muted-foreground p-3 text-xs">
                        {formatDate(p.periodStart)} — {formatDate(p.periodEnd)}
                      </td>
                      <td className="p-3 text-right font-semibold tabular-nums">
                        {formatMoney(p.amount)}
                      </td>
                      <td className="p-3">
                        <StatusBadge tone={cfg.tone}>{cfg.label}</StatusBadge>
                      </td>
                      <td className="text-muted-foreground p-3 text-xs">
                        {p.paidAt ? `${formatDate(p.paidAt)}, № ${p.reference ?? '—'}` : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
