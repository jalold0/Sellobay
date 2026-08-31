import Link from 'next/link';

import { Bar, Eyebrow, Nav, StatusChip } from '../components/ui';
import { MODULES } from '../data/modules';
import { readiness, type Layer, type Module } from '../data/types';

const LAYER_ORDER: Layer[] = [
  'Mijoz ilovalari',
  'Kirish qatlami',
  'Domen',
  "Ma'lumot",
  'Kesishuvchi',
  'Yetkazib berish',
];

function moduleReadiness(m: Module) {
  return readiness(m.features);
}

export default function HolatPage() {
  const allFeatures = MODULES.flatMap((m) => m.features);
  const total = readiness(allFeatures);

  const gaps = MODULES.flatMap((m) =>
    m.features
      .filter((f) => f.status === 'gap')
      .flatMap((f) =>
        (f.tasks ?? [])
          .filter((t) => t.priority === 'kritik' || t.priority === 'yuqori')
          .map((t) => ({ module: m, feature: f, task: t })),
      ),
  );

  const counts = {
    done: allFeatures.filter((f) => f.status === 'done').length,
    wip: allFeatures.filter((f) => f.status === 'wip').length,
    gap: allFeatures.filter((f) => f.status === 'gap').length,
    planned: allFeatures.filter((f) => f.status === 'planned').length,
  };

  return (
    <>
      <Nav current="holat" />
      <main className="mx-auto max-w-[1040px] px-6 pb-24">
        {/* Sarlavha */}
        <header className="border-line border-b py-12">
          <Eyebrow>Ish jarayoni · 2026-08-31</Eyebrow>
          <h1 className="mt-3 text-[34px] font-extrabold leading-tight tracking-tight md:text-[42px]">
            Loyiha holati
          </h1>
          <p className="text-muted mt-4 max-w-[62ch] text-[16px] leading-relaxed">
            Har bir bo&apos;lim nima qiladi, qay darajada tayyor va nima qolgan. Baholar koddan va
            bazadan olingan — <span className="text-ink font-semibold">taxmin emas</span>.
          </p>

          <div className="mt-9 grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-[46px] font-extrabold tabular-nums leading-none tracking-tighter">
                  {total.pct}%
                </span>
                <span className="text-muted text-[14px]">umumiy tayyorlik</span>
              </div>
              <div className="mt-3 max-w-[420px]">
                <Bar pct={total.pct} />
              </div>
              <p className="text-faint mt-2 text-[12px]">
                {total.counted} ta funksiya hisobga olindi. Tayyor = 1, jarayonda = 0.5.
              </p>
            </div>
            <div className="flex gap-5 font-mono text-[11.5px]">
              <span className="text-ok">
                <b className="block text-[19px] font-bold tabular-nums">{counts.done}</b> tayyor
              </span>
              <span className="text-wip">
                <b className="block text-[19px] font-bold tabular-nums">{counts.wip}</b> jarayonda
              </span>
              <span className="text-gap">
                <b className="block text-[19px] font-bold tabular-nums">{counts.gap}</b> xavf
              </span>
              <span className="text-idle">
                <b className="block text-[19px] font-bold tabular-nums">{counts.planned}</b> rejada
              </span>
            </div>
          </div>
        </header>

        {/* Kritik bo'shliqlar */}
        {gaps.length > 0 && (
          <section className="py-11">
            <Eyebrow>Birinchi navbatda</Eyebrow>
            <h2 className="mt-2.5 text-[21px] font-bold tracking-tight">
              Eng qimmatga tushadigan bo&apos;shliqlar
            </h2>
            <div className="mt-5 flex flex-col gap-2.5">
              {gaps.map(({ module, feature, task }) => (
                <Link
                  key={`${module.id}-${feature.title}-${task.title}`}
                  href={`/modul/${module.id}`}
                  className="border-line bg-surface hover:border-accent/40 block rounded-xl border p-4 transition"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[14.5px] font-semibold">{task.title}</span>
                    <span className="text-faint font-mono text-[10.5px] uppercase tracking-[0.09em]">
                      {module.name}
                    </span>
                  </div>
                  {task.why && (
                    <p className="text-muted mt-1.5 text-[13px] leading-relaxed">{task.why}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Qatlamlar */}
        {LAYER_ORDER.map((layer) => {
          const mods = MODULES.filter((m) => m.layer === layer);
          if (mods.length === 0) return null;
          const layerR = readiness(mods.flatMap((m) => m.features));
          return (
            <section key={layer} className="border-line-soft border-t py-10">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-[19px] font-bold tracking-tight">{layer}</h2>
                <span className="text-muted font-mono text-[12px] tabular-nums">
                  {layerR.pct}% · {mods.length} modul
                </span>
              </div>
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {mods.map((m) => {
                  const r = moduleReadiness(m);
                  const worst = m.features.some((f) => f.status === 'gap');
                  return (
                    <Link
                      key={m.id}
                      href={`/modul/${m.id}`}
                      className="border-line bg-surface hover:border-accent/40 group rounded-xl border p-4 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[15px] font-bold tracking-tight">{m.name}</h3>
                        {worst && <StatusChip status="gap" />}
                      </div>
                      <p className="text-muted mt-1.5 line-clamp-2 text-[13px] leading-relaxed">
                        {m.purpose}
                      </p>
                      <div className="mt-3.5 flex items-center gap-3">
                        <Bar pct={r.pct} tone={r.pct === 100 ? 'ok' : 'accent'} />
                        <span className="text-muted shrink-0 font-mono text-[11.5px] tabular-nums">
                          {r.pct}%
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}

        <footer className="border-line text-faint mt-8 border-t pt-6 text-[12.5px] leading-relaxed">
          Ma&apos;lumot repo ichida (<code className="font-mono">apps/roadmap/src/data</code>) va
          git bilan versiyalanadi. Holatni o&apos;zgartirish uchun merge request oching — shunda
          o&apos;zgarish tarixi va sababi saqlanadi.
        </footer>
      </main>
    </>
  );
}
