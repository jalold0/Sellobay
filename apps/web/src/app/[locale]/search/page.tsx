import { EmptyState } from '@ecom/ui';
import { Search } from 'lucide-react';
import type { Metadata } from 'next';
import { useLocale, useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: { q?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('search');
  return { title: t('pageTitle') };
}

export default function SearchPage({ searchParams }: PageProps) {
  const locale = useLocale();
  const t = useTranslations('search');
  if (searchParams.q) {
    redirect(`/${locale}/catalog?q=${encodeURIComponent(searchParams.q)}`);
  }
  return <EmptyState icon={Search} title={t('pageEmptyTitle')} description={t('pageEmptyHint')} />;
}
