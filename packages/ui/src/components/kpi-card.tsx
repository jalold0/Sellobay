import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/cn';

export interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  delta?: number; // foiz: +12.5 yoki -3.2
  hint?: string;
  icon?: LucideIcon;
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  loading?: boolean;
}

const accentBg: Record<NonNullable<KpiCardProps['accent']>, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
};

export function KpiCard({
  label,
  value,
  delta,
  hint,
  icon: Icon,
  accent = 'primary',
  loading,
  className,
  ...props
}: KpiCardProps) {
  const positive = typeof delta === 'number' && delta >= 0;
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-sm transition hover:shadow-md',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {Icon ? (
          <div className={cn('grid h-9 w-9 place-items-center rounded-md', accentBg[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div className={cn('text-2xl font-bold tracking-tight', loading && 'animate-pulse bg-muted text-transparent rounded')}>
          {loading ? '—' : value}
        </div>
        {typeof delta === 'number' && !loading ? (
          <div
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
              positive
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </div>
        ) : null}
      </div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
