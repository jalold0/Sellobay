'use client';

import { Button, Card } from '@ecom/ui';
import { CheckCircle2, FileText, Package, Smartphone } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { Link } from '@/i18n/navigation';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function OrderSuccess() {
  const t = useTranslations('orderSuccess');
  const tc = useTranslations('common');
  const params = useSearchParams();
  // Raqam berilmagan bo'lsa ko'rsatilmaydi: ilgari bu yerda to'qima
  // `ORD-2026-00000000` turardi va u haqiqiy buyurtmaga o'xshab ko'rinardi.
  const number = params.get('number');

  // To'lov provayderidan qaytganda (`return_url` da `order` bor) mobil
  // ilovani ochamiz. Faqat UUID qabul qilinadi: parametr tashqaridan
  // keladi va havolaga o'zboshimcha matn qo'yilmasligi kerak.
  const orderParam = params.get('order');
  const appLink = orderParam && UUID.test(orderParam) ? `sellobay://orders/${orderParam}` : null;

  useEffect(() => {
    // Faqat Android: ilova o'rnatilmagan bo'lsa jim qoladi, sahifa ishlayveradi.
    // Kompyuterda `sellobay://` brauzerda xato oynasi chiqarardi — tegmaymiz.
    if (appLink && /android/i.test(navigator.userAgent)) window.location.href = appLink;
  }, [appLink]);

  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
        <CheckCircle2 className="h-10 w-10" />
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground mt-3 text-sm">{t('subtitle')}</p>

      {number ? (
        <Card className="mt-6 p-5">
          <div className="text-muted-foreground text-xs uppercase tracking-wide">
            {t('orderNumber')}
          </div>
          <div className="mt-1 font-mono text-2xl font-bold">{number}</div>
        </Card>
      ) : null}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {appLink ? (
          <Button asChild>
            <a href={appLink}>
              <Smartphone className="mr-2 h-4 w-4" /> {t('openInApp')}
            </a>
          </Button>
        ) : null}
        <Button asChild variant={appLink ? 'outline' : 'default'}>
          <Link href="/profile/orders">
            <Package className="mr-2 h-4 w-4" /> {t('goToOrders')}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">
            <FileText className="mr-2 h-4 w-4" /> {tc('continue')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
