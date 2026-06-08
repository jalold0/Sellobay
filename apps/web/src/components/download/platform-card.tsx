'use client';

import { Button, Card } from '@ecom/ui';
import { CheckCircle2, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { PwaInstallButton } from './install-button';

interface Props {
  icon: LucideIcon;
  title: string;
  badge?: string;
  steps?: string[];
  primary?: { label: string; href?: string; onClick?: () => void; icon?: LucideIcon };
  secondary?: { label: string; href: string; icon?: LucideIcon };
  pwaButton?: boolean;
  recommended?: boolean;
  accent?: 'primary' | 'rose' | 'sky' | 'emerald' | 'violet' | 'amber';
}

const accents: Record<NonNullable<Props['accent']>, string> = {
  primary: 'bg-primary text-primary-foreground',
  rose: 'bg-rose-500 text-white',
  sky: 'bg-sky-500 text-white',
  emerald: 'bg-emerald-500 text-white',
  violet: 'bg-violet-500 text-white',
  amber: 'bg-amber-500 text-white',
};

export function PlatformCard({
  icon: Icon,
  title,
  badge,
  steps,
  primary,
  secondary,
  pwaButton,
  recommended,
  accent = 'primary',
}: Props) {
  return (
    <Card
      className={`relative overflow-hidden p-5 ${recommended ? 'border-primary ring-primary/20 ring-2' : ''}`}
    >
      {recommended ? (
        <div className="bg-primary text-primary-foreground absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold">
          TAVSIYA
        </div>
      ) : null}
      <div className="flex items-start gap-4">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${accents[accent]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold">{title}</h3>
            {badge ? (
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
                {badge}
              </span>
            ) : null}
          </div>
          {steps ? (
            <ol className="mt-3 space-y-1.5">
              {steps.map((s, i) => (
                <li key={i} className="text-muted-foreground flex items-start gap-2 text-xs">
                  <span className="bg-muted text-foreground grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {pwaButton ? <PwaInstallButton size="sm" /> : null}
            {primary ? (
              primary.href ? (
                <Button asChild size="sm">
                  <a
                    href={primary.href}
                    target={primary.href.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                  >
                    {primary.icon ? <primary.icon className="mr-1.5 h-3.5 w-3.5" /> : null}
                    {primary.label}
                  </a>
                </Button>
              ) : (
                <Button onClick={primary.onClick} size="sm">
                  {primary.icon ? <primary.icon className="mr-1.5 h-3.5 w-3.5" /> : null}
                  {primary.label}
                </Button>
              )
            ) : null}
            {secondary ? (
              <Button asChild variant="outline" size="sm">
                <a
                  href={secondary.href}
                  target={secondary.href.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                >
                  {secondary.icon ? <secondary.icon className="mr-1.5 h-3.5 w-3.5" /> : null}
                  {secondary.label}
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function FeatureItem({
  icon: _Icon,
  title,
  desc,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-card flex items-start gap-3 rounded-xl border p-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-muted-foreground text-xs">{desc}</div>
      </div>
    </div>
  );
}
