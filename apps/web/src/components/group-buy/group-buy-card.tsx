'use client';

import { Button, Card, toast } from '@ecom/ui';
import { Check, Clock, Share2, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import * as React from 'react';

import { formatMoney } from '../../lib/format';
import { type GroupDeal, dealImageUrl, discountPercent } from '../../lib/group-buy';
import { type Locale } from '../../lib/mock-data';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function GroupBuyCard({ deal }: { deal: GroupDeal }) {
  const t = useTranslations('groupBuy');
  const locale = useLocale() as Locale;

  const [joined, setJoined] = React.useState(false);
  const [current, setCurrent] = React.useState(deal.currentSize);
  const [remaining, setRemaining] = React.useState<number | null>(null);

  // Countdown — mount'da hisoblanadi (SSR hydration mosligi uchun)
  React.useEffect(() => {
    const target = Date.now() + deal.hoursLeft * 3600_000;
    const tick = () => setRemaining(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deal.hoursLeft]);

  const complete = current >= deal.targetSize;
  const progress = Math.min(100, Math.round((current / deal.targetSize) * 100));
  const needMore = Math.max(0, deal.targetSize - current);
  const pct = discountPercent(deal);

  const onJoin = () => {
    if (joined || complete) return;
    setJoined(true);
    setCurrent((c) => c + 1);
  };

  const onShare = async () => {
    const url = `${window.location.origin}/${locale}/group-buy#${deal.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: deal.name[locale], url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: t('linkCopied'), variant: 'success' });
      }
    } catch {
      // foydalanuvchi bekor qildi
    }
  };

  let countdown = '--:--:--';
  if (remaining !== null) {
    const totalSec = Math.floor(remaining / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    countdown = `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  return (
    <Card id={deal.id} className="flex scroll-mt-32 flex-col overflow-hidden">
      <div className="relative aspect-square bg-muted">
        <Image
          src={dealImageUrl(deal.imageSeed)}
          alt={deal.name[locale]}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover"
        />
        <span className="absolute left-2 top-2 rounded-full bg-rose-600 px-2 py-1 text-xs font-bold text-white">
          {t('save', { percent: pct })}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium">{deal.name[locale]}</h3>

        <div className="flex items-end gap-2">
          <span className="text-lg font-bold text-rose-600">{formatMoney(deal.groupPrice)}</span>
          <span className="text-xs text-muted-foreground line-through">
            {formatMoney(deal.soloPrice)}
          </span>
        </div>

        {/* Progress */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users size={12} /> {t('joinedCount', { current, target: deal.targetSize })}
            </span>
            <span className="inline-flex items-center gap-1 font-mono">
              <Clock size={12} /> {countdown}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${complete ? 'bg-emerald-500' : 'bg-rose-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {!complete ? (
            <div className="mt-1 text-[11px] text-rose-600">{t('needMore', { n: needMore })}</div>
          ) : (
            <div className="mt-1 text-[11px] font-medium text-emerald-600">{t('complete')}</div>
          )}
        </div>

        <div className="mt-auto flex gap-2">
          <Button
            onClick={onJoin}
            disabled={joined || complete}
            className="flex-1"
            variant={joined ? 'outline' : 'default'}
          >
            {joined ? (
              <>
                <Check size={15} className="mr-1" /> {t('youJoined')}
              </>
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
