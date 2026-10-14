// /global — "Havola orqali buyurtma" (Sellobay Global, Xitoydan sourcing).
// Server komponent: faqat metadata; interaktiv qism SourcingShell'da.

import { getTranslations, setRequestLocale } from 'next-intl/server';

import { GlobalCatalogSection } from '../../../components/global/global-catalog-section';
import { SourcingShell } from '../../../components/global/sourcing-shell';

import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'global' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default function GlobalSourcingPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return (
    <div className="space-y-8">
      {/* Katalog — mijoz asosan shu yerdan buyurtma qiladi */}
      <GlobalCatalogSection />
      {/* Havola orqali buyurtma — katalogda yo'q tovar uchun zaxira yo'l */}
      <SourcingShell />
    </div>
  );
}
