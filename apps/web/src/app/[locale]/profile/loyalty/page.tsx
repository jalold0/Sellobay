'use client';

import { Button, Card, toast } from '@ecom/ui';
import {
  CalendarCheck,
  Coins,
  Gift,
  Sparkles,
  Tag,
  Truck,
  Crown,
  Star,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { formatNumber } from '../../../../lib/format';
import {
  MOCK_LOYALTY,
  TIERS,
  coinsToSom,
  currentTier,
  nextTier,
  tierProgressPct,
  type CoinTxn,
} from '../../../../lib/loyalty';

const CHECKIN_REWARD = 5;

export default function LoyaltyPage() {
  const t = useTranslations('loyalty');

  const [coins, setCoins] = React.useState(MOCK_LOYALTY.coins);
  const [spent, setSpent] = React.useState(MOCK_LOYALTY.spentSom);
  const [history, setHistory] = React.useState<CoinTxn[]>(MOCK_LOYALTY.history);
  const [checkedIn, setCheckedIn] = React.useState(false);

  // Haqiqiy balans/tarix — /api/loyalty (login bo'lsa). Xato/empty bo'lsa mock qoladi.
  React.useEffect(() => {
    let active = true;
    fetch('/api/loyalty', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (!active || !res?.success || !res.data) return;
        // Login muvaffaqiyatli — har doim haqiqiy data (bo'sh tarix ham haqiqiy)
        setCoins(res.data.coins);
        setSpent(res.data.spentSom);
        setHistory((res.data.history ?? []) as CoinTxn[]);
        setCheckedIn(Boolean(res.data.checkedInToday));
      })
      .catch(() => {
        // mock fallback — hech narsa qilmaymiz
      });
    return () => {
      active = false;
    };
  }, []);

  const cur = currentTier(spent);
  const next = nextTier(spent);
  const progress = tierProgressPct(spent);

  const [claiming, setClaiming] = React.useState(false);
  const handleCheckIn = async () => {
    if (checkedIn || claiming) return;
    setClaiming(true);
    try {
      const res = await fetch('/api/loyalty/checkin', {
        method: 'POST',
        credentials: 'same-origin',
      });
      const json = await res.json();
      if (json?.success && json.data) {
        setCheckedIn(true);
        setCoins(json.data.balance);
        if (!json.data.alreadyClaimed) {
          toast({ title: t('checkinToast'), variant: 'success', duration: 2000 });
        }
      } else {
        // Login emas / xato — optimistik fallback (mock rejim)
        setCheckedIn(true);
        setCoins((c) => c + CHECKIN_REWARD);
        toast({ title: t('checkinToast'), variant: 'success', duration: 2000 });
      }
    } catch {
      setCheckedIn(true);
      setCoins((c) => c + CHECKIN_REWARD);
      toast({ title: t('checkinToast'), variant: 'success', duration: 2000 });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
          <Coins className="text-amber-500" size={28} /> {t('title')}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
      </div>

      {/* Balance hero */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 p-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{cur.icon}</span>
              <div>
                <div className="text-xs uppercase tracking-wide opacity-80">{t('currentTier')}</div>
                <div className="text-2xl font-bold">{t(`tiers.${cur.key}`)}</div>
                <div className="text-xs opacity-90">{t('cashback', { pct: cur.cashbackPct })}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide opacity-80">{t('balance')}</div>
              <div className="flex items-center justify-end gap-1.5 text-3xl font-bold">
                <Coins size={22} /> {formatNumber(coins)}
              </div>
              <div className="text-xs opacity-90">
                {t('worth', { som: formatNumber(coinsToSom(coins)) })}
              </div>
            </div>
          </div>

          {next && (
            <div className="mt-5">
              <div className="mb-1 flex justify-between text-xs opacity-90">
                <span>{t('nextTier', { tier: `${next.icon} ${t(`tiers.${next.key}`)}` })}</span>
                <span>{t('spendMore', { amount: formatNumber(next.min - spent) })}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Daily check-in — gamification habit loop */}
      <Card className="flex items-center gap-4 p-5">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber-100 dark:bg-amber-950/40">
          <CalendarCheck className="text-amber-600 dark:text-amber-400" size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{checkedIn ? t('checkinDone') : t('checkinCta')}</div>
          <div className="text-muted-foreground text-xs">{t('earn.checkin')}</div>
        </div>
        <Button
          onClick={handleCheckIn}
          disabled={checkedIn || claiming}
          size="sm"
          className="shrink-0"
        >
          {checkedIn ? '✓' : `+${CHECKIN_REWARD}`}
        </Button>
      </Card>

      {/* Tiers */}
      <div className="grid gap-3 md:grid-cols-4">
        {TIERS.map((tier) => (
          <Card
            key={tier.key}
            className={`p-4 text-center ${tier.key === cur.key ? 'ring-2 ring-amber-400' : ''}`}
          >
            <div className="text-3xl">{tier.icon}</div>
            <div className="mt-2 font-bold">{t(`tiers.${tier.key}`)}</div>
            <div className="text-muted-foreground text-xs">
              {tier.min > 0 ? t('tierFrom', { amount: formatNumber(tier.min) }) : t('tierStart')}
            </div>
            <div className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
              {t('cashback', { pct: tier.cashbackPct })}
            </div>
          </Card>
        ))}
      </div>

      {/* Earn + Redeem */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Gift size={16} className="text-amber-500" /> {t('earnTitle')}
          </h2>
          <ul className="space-y-2.5 text-sm">
            <EarnRow icon={Star}>{t('earn.purchase')}</EarnRow>
            <EarnRow icon={Crown}>{t('earn.review')}</EarnRow>
            <EarnRow icon={Sparkles}>{t('earn.referral')}</EarnRow>
            <EarnRow icon={Gift}>{t('earn.birthday')}</EarnRow>
            <EarnRow icon={CalendarCheck}>{t('earn.checkin')}</EarnRow>
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Tag size={16} className="text-emerald-500" /> {t('redeemTitle')}
          </h2>
          <ul className="space-y-2.5 text-sm">
            <EarnRow icon={Tag} tone="emerald">
              {t('redeem.discount')}
            </EarnRow>
            <EarnRow icon={Truck} tone="emerald">
              {t('redeem.shipping')}
            </EarnRow>
            <EarnRow icon={Crown} tone="emerald">
              {t('redeem.exclusive')}
            </EarnRow>
          </ul>
        </Card>
      </div>

      {/* History */}
      <Card className="p-5">
        <h2 className="mb-3 font-semibold">{t('historyTitle')}</h2>
        {history.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">{t('history.empty')}</p>
        ) : (
          <ul className="divide-y">
            {history.map((tx) => (
              <HistoryRow
                key={tx.id}
                tx={tx}
                label={t(`history.${tx.reasonKey}`)}
                ago={t('history.daysAgo', { days: tx.daysAgo })}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function EarnRow({
  icon: Icon,
  tone = 'amber',
  children,
}: {
  icon: typeof Star;
  tone?: 'amber' | 'emerald';
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <Icon size={15} className={tone === 'emerald' ? 'text-emerald-500' : 'text-amber-500'} />
      <span>{children}</span>
    </li>
  );
}

function HistoryRow({ tx, label, ago }: { tx: CoinTxn; label: string; ago: string }) {
  const positive = tx.amount > 0;
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
          positive
            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
            : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40'
        }`}
      >
        {positive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-muted-foreground text-xs">{ago}</div>
      </div>
      <div className={`text-sm font-bold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
        {positive ? '+' : ''}
        {formatNumber(tx.amount)}
      </div>
    </li>
  );
}
