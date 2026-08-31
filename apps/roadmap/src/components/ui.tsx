import Link from 'next/link';

import {
  PRIORITY_LABEL,
  ROLE_LABEL,
  STATUS_LABEL,
  type Priority,
  type Role,
  type Status,
} from '../data/types';

const STATUS_CLASS: Record<Status, string> = {
  done: 'text-ok bg-ok/10',
  wip: 'text-wip bg-wip/10',
  planned: 'text-idle bg-idle/10',
  gap: 'text-gap bg-gap/10',
  idle: 'text-idle bg-idle/10',
};

export function StatusChip({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.09em] ${STATUS_CLASS[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

const PRIORITY_CLASS: Record<Priority, string> = {
  kritik: 'text-gap border-gap/35',
  yuqori: 'text-wip border-wip/35',
  orta: 'text-muted border-line',
  past: 'text-faint border-line',
};

export function PriorityTag({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-block shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.09em] ${PRIORITY_CLASS[priority]}`}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function RoleTag({ role }: { role: Role }) {
  return (
    <span className="bg-sunk text-muted inline-block shrink-0 rounded px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.09em]">
      {ROLE_LABEL[role]}
    </span>
  );
}

/** Tayyorlik chizig'i — foiz raqamdan tashqari shaklda ham o'qilishi uchun. */
export function Bar({ pct, tone = 'accent' }: { pct: number; tone?: 'accent' | 'ok' }) {
  return (
    <div className="bg-sunk h-1.5 w-full overflow-hidden rounded-full">
      <div
        className={`h-full rounded-full ${tone === 'ok' ? 'bg-ok' : 'bg-accent'}`}
        style={{ width: `${Math.max(pct, 2)}%` }}
      />
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-gold font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em]">
      {children}
    </div>
  );
}

export function Nav({ current }: { current: 'holat' | 'vazifalar' }) {
  const item = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-[13.5px] font-semibold transition ${
        active ? 'bg-accent text-white' : 'text-muted hover:text-ink'
      }`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="border-line bg-surface/80 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex max-w-[1040px] items-center gap-2 px-6 py-3">
        <Link href="/" className="mr-3 flex items-center gap-2">
          <span className="bg-accent grid h-7 w-7 place-items-center rounded-lg text-[13px] font-bold text-white">
            S
          </span>
          <span className="text-[14.5px] font-bold tracking-tight">Sellobay</span>
        </Link>
        {item('/', 'Holat', current === 'holat')}
        {item('/vazifalar', 'Vazifalar', current === 'vazifalar')}
      </div>
    </nav>
  );
}
