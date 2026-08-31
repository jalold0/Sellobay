'use client';

import { Button } from '@ecom/ui';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, Home, RotateCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import * as React from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errorPage');

  React.useEffect(() => {
    // MUHIM: React xato chegarasi ushlagan xato Sentry'ga O'ZI bormaydi —
    // chegara uni yutadi va global handler ko'rmay qoladi. Foydalanuvchi eng
    // ko'p uchratadigan xatolar aynan shu yerga tushadi, shuning uchun uni
    // qo'lda qayd etamiz.
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t('description')}</p>
        {error.digest && (
          <p className="text-muted-foreground mt-2 font-mono text-[11px]">
            {t('code')}: {error.digest}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={reset} className="gap-2">
          <RotateCw className="h-4 w-4" /> {t('retry')}
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/">
            <Home className="h-4 w-4" /> {t('home')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
