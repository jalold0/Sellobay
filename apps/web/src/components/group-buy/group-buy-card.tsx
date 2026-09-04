'use client';

import { Button, Card, toast } from '@ecom/ui';
import { Check, Clock, Share2, Users } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { formatMoney } from '../../lib/format';
import { pickLocale, type Locale } from '../../lib/mock-data';

import type { GroupDealView } from '../../lib/group-buy-server';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Qolgan vaqtni HH:MM:SS ko'rinishida. 24 soatdan oshsa soat 24+ bo'lib ketadi. */
function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function GroupBuyCard({ deal, isLoggedIn }: { deal: GroupDealView; isLoggedIn: boolean }) {
  const t = useTranslations('groupBuy');
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [joined, setJoined] = React.useState(deal.joined);
  const [current, setCurrent] = React.useState(deal.currentSize);
  const [pending, setPending] = React.useState(false);
  const [remaining, setRemaining] = React.useState<number | null>(null);

  // Taymer HAQIQIY tugash vaqtidan hisoblanadi (server bergan `expiresAt`).
  // Ilgari `Date.now() + hoursLeft` ishlatilardi — sahifa har yangilanganda
  // hisob boshidan boshlanib, soxta shoshilinchlik yaratardi.
  const expiresAtMs = React.useMemo(() => new Date(deal.expiresAt).getTime(), [deal.expiresAt]);
  React.useEffect(() => {
    const tick = () => setRemaining(Math.max(0, expiresAtMs - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAtMs]);

  const expired = remaining !== null && remaining <= 0;
  const complete = deal.status === 'COMPLETED' || current >= deal.targetSize;
  const progress = Math.min(100, Math.round((current / deal.targetSize) * 100));
  const needMore = Math.max(0, deal.targetSize - current);

  const onJoin = async () => {
    if (joined || complete || pending || expired) return;
    if (!isLoggedIn) {
      // Login talab qiladi — mijozni kirish sahifasiga qaytib kelish bilan yuboramiz.
      router.push(`/${locale}/login?next=/${locale}/group-buy`);
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/group-buy/${deal.id}/join`, { method: 'POST' });
      const body = (await res.json().catch(() => null)) as {
        success: boolean;
        data?: { deal: GroupDealView };
        error?: { message: string };
      } | null;
      if (!res.ok || !body?.success || !body.data) {
        toast({
          title: body?.error?.message ?? t('joinFailed'),
          variant: 'destructive',
        });
        return;
      }
      // Serverdan kelgan HAQIQIY son bilan yangilaymiz (mahalliy ++ emas).
      setJoined(true);
      setCurrent(body.data.deal.currentSize);
      toast({ title: t('youJoined'), variant: 'success' });
      // Boshqa kartalar/soni ham yangilanishi uchun serverdan qayta o'qiymiz.
      router.refresh();
    } catch {
      toast({ title: t('joinFailed'), variant: 'destructive' });
    } finally {
      setPending(false);
    }
  };

  const onShare = async () => {
    const url = `${window.location.origin}/${locale}/group-buy#${deal.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: pickLocale(deal.name, locale), url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: t('linkCopied'), variant: 'success' });
      }
    } catch {
      // foydalanuvchi bekor qildi
    }
  };

  const countdown = remaining === null ? '--:--:--' : formatCountdown(remaining);

  return (
    <Card id={deal.id} className="flex scroll-mt-32 flex-col overflow-hidden">
      <div className="bg-muted relative aspect-square">
        {deal.imageUrl ? (
          <Image
            src={deal.imageUrl}
            alt={pickLocale(deal.name, locale)}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="text-muted-foreground grid h-full place-items-center">
            <Users size={28} />
          </div>
        )}
        {deal.discountPercent > 0 ? (
          <span className="absolute left-2 top-2 rounded-full bg-rose-600 px-2 py-1 text-xs font-bold text-white">
            {t('save', { percent: deal.discountPercent })}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium">
          {pickLocale(deal.name, locale)}
        </h3>

        <div className="flex items-end gap-2">
          <span className="text-lg font-bold text-rose-600">{formatMoney(deal.groupPrice)}</span>
          {deal.soloPrice > deal.groupPrice ? (
            <span className="text-muted-foreground text-xs line-through">
              {formatMoney(deal.soloPrice)}
            </span>
          ) : null}
        </div>

        {/* Progress */}
        <div>
          <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1">
              <Users size={12} /> {t('joinedCount', { current, target: deal.targetSize })}
            </span>
            <span className="inline-flex items-center gap-1 font-mono">
              <Clock size={12} /> {countdown}
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full transition-all ${complete ? 'bg-emerald-500' : 'bg-rose-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {complete ? (
            <div className="mt-1 text-[11px] font-medium text-emerald-600">{t('complete')}</div>
          ) : expired ? (
            <div className="text-muted-foreground mt-1 text-[11px]">{t('expired')}</div>
          ) : (
            <div className="mt-1 text-[11px] text-rose-600">{t('needMore', { n: needMore })}</div>
          )}
        </div>

        <div className="mt-auto flex gap-2">
          <Button
            onClick={onJoin}
            disabled={joined || complete || pending || expired}
            className="flex-1"
            variant={joined ? 'outline' : 'default'}
          >
            {joined ? (
              <>
                <Check size={15} className="mr-1" /> {t('youJoined')}
              </>
            ) : pending ? (
              t('joining')
            ) : (
              t('join')
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={onShare} aria-label={t('share')}>
            <Share2 size={16} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
