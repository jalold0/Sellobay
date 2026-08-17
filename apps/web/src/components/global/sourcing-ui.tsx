// Global sourcing — kichik taqdimot yordamchilari (status chip, narx, muddat).
// Faqat ko'rinish: hech qanday fetch/biznes-qaror yo'q.

'use client';

import { cn } from '@ecom/ui';
import { useTranslations } from 'next-intl';

import type { SourcingStatus } from './sourcing-types';

/** Har bir status uchun rang — dizayn tokenlari (crimson/gold/success chip). */
const STATUS_TONE: Record<SourcingStatus, string> = {
  NEW: 'bg-chip text-brand-ink-soft',
  IN_REVIEW: 'bg-chip text-brand-ink-soft',
  QUOTED: 'bg-brand-gold/20 text-brand-gold-text',
  ACCEPTED: 'bg-success-chip text-emerald-800',
  ORDERED: 'bg-success-chip text-emerald-800',
  REJECTED: 'bg-crimson-chip text-brand-crimson',
  UNAVAILABLE: 'bg-crimson-chip text-brand-crimson',
  CANCELLED: 'bg-chip text-brand-ink-soft',
  EXPIRED: 'bg-chip text-brand-ink-soft',
};

export function SourcingStatusChip({ status }: { status: SourcingStatus }) {
  const t = useTranslations('global.status');
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
        STATUS_TONE[status],
      )}
    >
      {t(status)}
    </span>
  );
}

/** So'm formati — 1 234 000 so'm. */
export function formatUzs(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} so'm`;
}

/** "15-17 kun" ko'rinishi; bitta qiymat bo'lsa "15 kun". */
export function formatLeadTime(min: number | null, max: number | null, dayWord: string): string {
  if (min === null && max === null) return '—';
  if (min !== null && max !== null && min !== max) return `${min}-${max} ${dayWord}`;
  return `${min ?? max} ${dayWord}`;
}

/** Taklif tugashiga qolgan vaqt (soat). Muddati o'tgan bo'lsa 0. */
export function hoursLeft(expiresAt: string | null, now: number = Date.now()): number {
  if (!expiresAt) return 0;
  const diffMs = new Date(expiresAt).getTime() - now;
  return diffMs <= 0 ? 0 : Math.ceil(diffMs / (60 * 60 * 1000));
}
