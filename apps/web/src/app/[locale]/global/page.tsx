// /global — "Havola orqali buyurtma" (Sellobay Global, Xitoydan sourcing).
// Server komponent: faqat metadata; interaktiv qism SourcingShell'da.

import { getTranslations } from 'next-intl/server';

import { GlobalCatalogSection } from '../../../components/global/global-catalog-section';
import { SourcingShell } from '../../../components/global/sourcing-shell';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('global');
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default function GlobalSourcingPage() {
  return (
    <div className="space-y-8">
      {/* Katalog — mijoz asosan shu yerdan buyurtma qiladi */}
      <GlobalCatalogSection />
      {/* Havola orqali buyurtma — katalogda yo'q tovar uchun zaxira yo'l */}
      <SourcingShell />
    </div>
  );
}
