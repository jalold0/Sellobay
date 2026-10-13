import { EmptyState } from '@ecom/ui';
import { Search } from 'lucide-react';
import { redirect } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Metadata } from 'next';

interface PageProps {
  params: { locale: string };
  searchParams: { q?: string };
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'search' });
  return { title: t('pageTitle') };
}

export default function SearchPage({ params, searchParams }: PageProps) {
  setRequestLocale(params.locale);
  const locale = useLocale();
  const t = useTranslations('search');
  if (searchParams.q) {
    redirect(`/${locale}/catalog?q=${encodeURIComponent(searchParams.q)}`);
  }
  return <EmptyState icon={Search} title={t('pageEmptyTitle')} description={t('pageEmptyHint')} />;
}
