import { ArrowRight } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/cn';

export interface SectionTitleProps {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
  LinkComponent?: React.ComponentType<{ href: string; className?: string; children: React.ReactNode }>;
}

const NativeLink = (props: { href: string; className?: string; children: React.ReactNode }) => (
  <a href={props.href} className={props.className}>
    {props.children}
  </a>
);

export function SectionTitle({
  title,
  description,
  actionHref,
  actionLabel,
  className,
  LinkComponent = NativeLink,
}: SectionTitleProps) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div>
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actionHref && actionLabel && (
        <LinkComponent
          href={actionHref}
          className="group inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {actionLabel}
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </LinkComponent>
      )}
    </div>
  );
}
