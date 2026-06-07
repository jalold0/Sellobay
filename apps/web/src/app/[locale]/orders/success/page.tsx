'use client';

import { Button, Card } from '@ecom/ui';
import { CheckCircle2, FileText, Package } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function OrderSuccessPage() {
  const params = useSearchParams();
  const number = params.get('number') ?? 'ORD-2026-00000000';

  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
        <CheckCircle2 className="h-10 w-10" />
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Rahmat! Buyurtmangiz qabul qilindi</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Buyurtmangizni tasdiqlash uchun operator siz bilan tez orada bog&apos;lanadi.
      </p>

      <Card className="mt-6 p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Buyurtma raqami</div>
        <div className="mt-1 font-mono text-2xl font-bold">{number}</div>
      </Card>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href="/profile/orders">
            <Package className="mr-2 h-4 w-4" /> Buyurtmalarimga o&apos;tish
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">
            <FileText className="mr-2 h-4 w-4" /> Davom etish
          </Link>
        </Button>
      </div>
    </div>
  );
}
