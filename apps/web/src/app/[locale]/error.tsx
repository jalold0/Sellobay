'use client';

import { Button } from '@ecom/ui';
import { AlertTriangle, Home, RotateCw } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Real loyihada: Sentry.captureException(error)
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Nimadir xato ketdi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sahifani yuklashda kutilmagan xato yuz berdi. Iltimos qaytadan urinib ko&apos;ring yoki bosh sahifaga qayting.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">Digest: {error.digest}</p>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={reset} className="gap-2">
          <RotateCw className="h-4 w-4" /> Qaytadan urinish
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/">
            <Home className="h-4 w-4" /> Bosh sahifa
          </Link>
        </Button>
      </div>
    </div>
  );
}
