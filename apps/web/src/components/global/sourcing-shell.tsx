// Global "Havola orqali buyurtma" sahifasining orkestri (ADR 0005):
// holat + fetch shu yerda, ko'rinish seksiyalarda (form / list).

'use client';

import { Globe, ShieldCheck, Timer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { SourcingForm } from './sourcing-form';
import { SourcingList } from './sourcing-list';

import type { ApiEnvelope, SourcingRequestView } from './sourcing-types';

export function SourcingShell() {
  const t = useTranslations('global');

  const [items, setItems] = React.useState<SourcingRequestView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [needsLogin, setNeedsLogin] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/global/sourcing');
      if (res.status === 401) {
        setNeedsLogin(true);
        setItems([]);
        return;
      }
      const body: ApiEnvelope<{ items: SourcingRequestView[] }> = await res.json();
      if (body.success && body.data) {
        setNeedsLogin(false);
        setItems(body.data.items);
      }
    } catch {
      // tarmoq xatosi — ro'yxat bo'sh qoladi, forma baribir ishlaydi
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  function handleCreated(request: SourcingRequestView, duplicate: boolean) {
    setNotice(duplicate ? t('form.duplicateNotice') : t('form.createdNotice'));
    setItems((prev) => [request, ...prev.filter((i) => i.id !== request.id)]);
  }

  function handleChanged(updated: SourcingRequestView) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  const steps = [
    { icon: Globe, key: 'step1' },
    { icon: Timer, key: 'step2' },
    { icon: ShieldCheck, key: 'step3' },
  ] as const;

  return (
    <div className="space-y-8">
      <section className="bg-brand-crimson relative overflow-hidden rounded-3xl px-6 py-10 text-white md:px-10 md:py-14">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <Globe size={12} /> {t('badge')}
          </span>
          <h1 className="mt-4 font-serif text-3xl leading-tight md:text-5xl">{t('title')}</h1>
          <p className="mt-3 max-w-xl text-white/85 md:text-lg">{t('subtitle')}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {steps.map(({ icon: Icon, key }, i) => (
          <div key={key} className="rounded-2xl border p-5">
            <div className="flex items-center gap-3">
              <div className="bg-brand-crimson grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white">
                {i + 1}
              </div>
              <Icon size={18} className="text-brand-crimson" />
            </div>
            <h3 className="mt-3 font-semibold">{t(`${key}Title`)}</h3>
            <p className="text-muted-foreground mt-1 text-sm">{t(`${key}Desc`)}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl">{t('form.title')}</h2>
        {notice && (
          <p className="bg-success-chip rounded-lg px-3 py-2 text-sm text-emerald-800">{notice}</p>
        )}
        <SourcingForm onCreated={handleCreated} />
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl">{t('list.title')}</h2>
        {needsLogin ? (
          <p className="bg-paper text-brand-ink-soft rounded-lg px-4 py-3 text-sm">
            {t('list.loginRequired')}
          </p>
        ) : (
          <SourcingList items={items} loading={loading} onChanged={handleChanged} />
        )}
      </section>
    </div>
  );
}
