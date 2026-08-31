import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Bar, Eyebrow, Nav, PriorityTag, RoleTag, StatusChip } from '../../../components/ui';
import { MODULES } from '../../../data/modules';
import { ROLE_LABEL, readiness } from '../../../data/types';

export function generateStaticParams() {
  return MODULES.map((m) => ({ id: m.id }));
}

export default function ModulPage({ params }: { params: { id: string } }) {
  const m = MODULES.find((x) => x.id === params.id);
  if (!m) notFound();

  const r = readiness(m.features);
  const tasks = m.features.flatMap((f) => (f.tasks ?? []).map((t) => ({ f, t })));

  return (
    <>
      <Nav current="holat" />
      <main className="mx-auto max-w-[880px] px-6 pb-24">
        <header className="border-line border-b py-11">
          <Link href="/" className="text-muted hover:text-ink text-[13px] font-semibold">
            ← Barcha bo&apos;limlar
          </Link>
          <div className="mt-5">
            <Eyebrow>{m.layer}</Eyebrow>
            <h1 className="mt-2.5 text-[30px] font-extrabold leading-tight tracking-tight">
              {m.name}
            </h1>
            <p className="text-muted mt-3 max-w-[62ch] text-[15.5px] leading-relaxed">
              {m.purpose}
            </p>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-5">
            <div className="min-w-[200px] flex-1">
              <Bar pct={r.pct} tone={r.pct === 100 ? 'ok' : 'accent'} />
            </div>
            <span className="font-mono text-[13px] font-semibold tabular-nums">
              {r.pct}% tayyor
            </span>
            <span className="text-muted text-[13px]">
              Mas&apos;ul: <b className="text-ink font-semibold">{ROLE_LABEL[m.owner]}</b>
            </span>
          </div>
        </header>

        {/* Funksiyalar — o'qitish uchun ham shu bo'lim */}
        <section className="py-10">
          <Eyebrow>Funksiyalar</Eyebrow>
          <h2 className="mt-2.5 text-[19px] font-bold tracking-tight">
            Bu bo&apos;lim nima qiladi
          </h2>
          <p className="text-muted mt-2 max-w-[60ch] text-[13.5px] leading-relaxed">
            Yangi hodim shu ro&apos;yxatni o&apos;qib bo&apos;limning vazifasini tushunadi.
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            {m.features.map((f) => (
              <article key={f.title} className="border-line bg-surface rounded-xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-[15px] font-bold tracking-tight">{f.title}</h3>
                  <StatusChip status={f.status} />
                </div>
                <p className="text-muted mt-2 text-[13.5px] leading-relaxed">{f.does}</p>
                {f.evidence && (
                  <p className="text-faint mt-2.5 font-mono text-[11.5px] leading-relaxed">
                    {f.evidence}
                  </p>
                )}
                {f.tasks && f.tasks.length > 0 && (
                  <ul className="border-line-soft mt-3.5 flex flex-col gap-2 border-t pt-3.5">
                    {f.tasks.map((t) => (
                      <li key={t.title} className="flex flex-wrap items-start gap-2">
                        <span className="text-accent mt-[3px] text-[11px]">◆</span>
                        <span className="text-[13.5px] font-semibold">{t.title}</span>
                        <RoleTag role={t.role} />
                        <PriorityTag priority={t.priority} />
                        {t.why && (
                          <p className="text-muted w-full pl-5 text-[12.5px] leading-relaxed">
                            {t.why}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>

        {tasks.length > 0 && (
          <section className="border-line-soft border-t py-9">
            <Eyebrow>Xulosa</Eyebrow>
            <h2 className="mt-2.5 text-[19px] font-bold tracking-tight">
              Bu bo&apos;limda {tasks.length} ta vazifa qolgan
            </h2>
            <p className="text-muted mt-2 text-[13.5px]">
              Barcha vazifalarni rol bo&apos;yicha ko&apos;rish uchun{' '}
              <Link href="/vazifalar" className="text-accent font-semibold underline">
                Vazifalar
              </Link>{' '}
              bo&apos;limiga o&apos;ting.
            </p>
          </section>
        )}
      </main>
    </>
  );
}
