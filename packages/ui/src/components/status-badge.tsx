import * as React from 'react';

import { cn } from '../lib/cn';

export type StatusTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'pending'
  | 'muted';

const toneClasses: Record<StatusTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700',
  info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
  pending: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
  muted: 'bg-muted text-muted-foreground border-transparent',
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  dot?: boolean;
}

export function StatusBadge({
  tone = 'neutral',
  dot = true,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            tone === 'success' && 'bg-emerald-500',
            tone === 'warning' && 'bg-amber-500',
            tone === 'danger' && 'bg-red-500',
            tone === 'info' && 'bg-sky-500',
            tone === 'pending' && 'bg-violet-500',
            tone === 'neutral' && 'bg-slate-500',
            tone === 'muted' && 'bg-muted-foreground',
          )}
        />
      )}
      {children}
    </span>
  );
}

// Domain-specific helpers — markazlashtirilgan, kelajakda yangi status qo'shilsa shu yerda.
export const ORDER_STATUS_TONE: Record<string, StatusTone> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PAID: 'info',
  PROCESSING: 'info',
  PACKED: 'info',
  SHIPPED: 'info',
  OUT_FOR_DELIVERY: 'pending',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  RETURNED: 'danger',
  REFUNDED: 'muted',
};

export const PAYMENT_STATUS_TONE: Record<string, StatusTone> = {
  PENDING: 'warning',
  AUTHORIZED: 'info',
  PAID: 'success',
  PARTIALLY_REFUNDED: 'warning',
  REFUNDED: 'muted',
  FAILED: 'danger',
  CANCELLED: 'muted',
};

export const PRODUCT_STATUS_TONE: Record<string, StatusTone> = {
  DRAFT: 'muted',
  PENDING_REVIEW: 'warning',
  ACTIVE: 'success',
  ARCHIVED: 'neutral',
  OUT_OF_STOCK: 'danger',
};

export const SELLER_STATUS_TONE: Record<string, StatusTone> = {
  PENDING: 'warning',
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  BLOCKED: 'danger',
};
