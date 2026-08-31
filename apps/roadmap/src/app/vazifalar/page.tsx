import Link from 'next/link';

import { Eyebrow, Nav, PriorityTag } from '../../components/ui';
import { MODULES } from '../../data/modules';
import { PRIORITY_ORDER, ROLE_LABEL, type Role, type Task } from '../../data/types';

interface Entry {
  task: Task;
  moduleId: string;
  moduleName: string;
  featureTitle: string;
}

const ROLE_ORDER: Role[] = [
  'devops',
  'backend',
  'frontend',
  'mobil',
  'asoschi',
  'kontent',
  'dizayn',
  'operator',
];

/** Har bir rol nima uchun javob beradi — yangi hodim uchun. */
const ROLE_SCOPE: Record<Role, string> = {
  asoschi: 'Biznes qarorlari: assortiment, sheriklar, narx siyosati, investor bilan ishlash.',
  backend: 'API, biznes mantiqi, baza, to‘lov va tashqi integratsiyalar.',
  frontend: 'Veb-sayt va admin/sotuvchi panellari interfeysi.',
  mobil: 'Expo ilovalari — xaridor va kuryer.',
  dizayn: 'Interfeys dizayni, brend tizimi, maketlar.',
  operator: 'Kundalik ish: buyurtma, to‘lov tekshiruvi, sotuvchi va mijoz bilan aloqa.',
  kontent: 'Matnlar, tarjimalar, mahsulot tavsiflari, yuridik sahifalar.',
  devops: 'CI/CD, migratsiyalar, kuzatuv, infratuzilma va testlar.',
};

export default function VazifalarPage() {
  const all: Entry[] = MODULES.flatMap((m) =>
    m.features.flatMap((f) =>
      (f.tasks ?? []).map((task) => ({
        task,
        moduleId: m.id,
        moduleName: m.name,
        featureTitle: f.title,
      })),
    ),
  );

  const byRole = ROLE_ORDER.map((role) => ({
    role,
    items: all
      .filter((e) => e.task.role === role)
      .sort((a, b) => PRIORITY_ORDER[a.task.priority] - PRIORITY_ORDER[b.task.priority]),
  })).filter((g) => g.items.length > 0);

  const critical = all.filter((e) => e.task.priority === 'kritik').length;

  return (
    <>
      <Nav current="vazifalar" />
      <main className="mx-auto max-w-[1040px] px-6 pb-24">
        <header className="border-line border-b py-12">
          <Eyebrow>Vazifalar · rol bo&apos;yicha</Eyebrow>
          <h1 className="mt-3 text-[34px] font-extrabold leading-tight tracking-tight">
            Kim nima qiladi
          </h1>
          <p className="text-muted mt-4 max-w-[62ch] text-[16px] leading-relaxed">
            Jami <b className="text-ink tabular-nums">{all.length}</b> ta vazifa,{' '}
            <b className="text-gap tabular-nums">{critical}</b> tasi kritik. Har biri qaysi
            bo&apos;limdan kelib chiqqani ko&apos;rsatilgan — kontekstsiz bajarish uchun.
          </p>
        </header>

        {byRole.map(({ role, items }) => (
          <section key={role} className="border-line-soft border-t py-9">
            <div className="grid gap-6 md:grid-cols-[190px_1fr]">
              <div className="md:sticky md:top-20 md:self-start">
                <h2 className="text-[18px] font-bold tracking-tight">{ROLE_LABEL[role]}</h2>
                <p className="text-faint mt-2 text-[12.5px] leading-relaxed">{ROLE_SCOPE[role]}</p>
                <p className="text-muted mt-3 font-mono text-[11.5px] tabular-nums">
                  {items.length} ta vazifa
                </p>
              </div>

              <ul className="flex flex-col gap-2.5">
                {items.map((e) => (
                  <li
                    key={`${e.moduleId}-${e.task.title}`}
                    className="border-line bg-surface rounded-xl border p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-[14.5px] font-semibold">{e.task.title}</span>
                      <PriorityTag priority={e.task.priority} />
                    </div>
                    {e.task.why && (
                      <p className="text-muted mt-1.5 text-[13px] leading-relaxed">{e.task.why}</p>
                    )}
                    <Link
                      href={`/modul/${e.moduleId}`}
                      className="text-faint hover:text-accent mt-2.5 inline-block font-mono text-[11px] uppercase tracking-[0.08em]"
                    >
                      {e.moduleName} › {e.featureTitle}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
