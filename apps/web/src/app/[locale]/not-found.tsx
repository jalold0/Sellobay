import { Button } from '@ecom/ui';
import { Compass, Home, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <div className="text-primary/20 text-[120px] font-black leading-none md:text-[160px]">
        404
      </div>
      <div className="-mt-8">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('title')}</h1>
        <p className="text-muted-foreground mt-2 max-w-md text-sm md:text-base">
          {t('description')}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild className="gap-2">
          <Link href="/">
            <Home className="h-4 w-4" /> {t('home')}
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/catalog">
            <Compass className="h-4 w-4" /> {t('catalog')}
          </Link>
        </Button>
      </div>

      <div className="mt-6 w-full max-w-sm">
        <form action="/catalog" className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="search"
            name="q"
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="border-input bg-background focus:border-primary h-11 w-full rounded-full border pl-10 pr-4 text-sm outline-none"
          />
        </form>
      </div>
    </div>
  );
}
