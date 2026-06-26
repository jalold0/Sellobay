'use client';

import { useTranslations } from 'next-intl';

export function SkipLink() {
  const t = useTranslations('search');
  return (
    <a
      href="#main"
      className="bg-primary text-primary-foreground focus:ring-ring sr-only fixed left-2 top-2 z-[100] rounded-md px-3 py-2 text-sm font-medium focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-offset-2"
    >
      {t('skipToContent')}
    </a>
  );
}
