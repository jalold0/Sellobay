// /global — "Havola orqali buyurtma" (Sellobay Global, Xitoydan sourcing).
// Server komponent: faqat metadata; interaktiv qism SourcingShell'da.

import { getTranslations } from 'next-intl/server';

import { SourcingShell } from '../../../components/global/sourcing-shell';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('global');
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default function GlobalSourcingPage() {
  return <SourcingShell />;
}
