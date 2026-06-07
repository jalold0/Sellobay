import { Button } from '@ecom/ui';
import { Clock, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { PageHero } from './page-hero';

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  features?: string[];
  cta?: { label: string; href: string };
}

export function ComingSoon({ icon = Clock, title, description, features = [], cta }: Props) {
  return (
    <div className="space-y-8">
      <PageHero icon={icon} title={title} description={description} accent="violet" />

      <div className="rounded-2xl border bg-card p-8 text-center md:p-12">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary/10 text-primary">
          <Clock className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-2xl font-bold">Tez orada</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Bu bo&apos;lim ustida ish olib bormoqdamiz. Yangiliklar uchun obuna bo&apos;ling.
        </p>

        {features.length > 0 && (
          <div className="mx-auto mt-6 grid max-w-xl gap-2 text-left text-sm">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border bg-background p-3">
                <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                  {i + 1}
                </div>
                <span>{f}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/">Bosh sahifaga qaytish</Link>
          </Button>
          {cta && (
            <Button asChild variant="outline">
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
