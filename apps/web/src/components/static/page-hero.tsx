import { type LucideIcon } from 'lucide-react';
import * as React from 'react';

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  accent?: 'primary' | 'rose' | 'emerald' | 'amber' | 'sky' | 'violet';
}

const accents: Record<NonNullable<Props['accent']>, string> = {
  primary: 'from-primary via-primary to-rose-500',
  rose: 'from-rose-500 via-rose-600 to-orange-500',
  emerald: 'from-emerald-500 to-teal-600',
  amber: 'from-amber-500 to-orange-600',
  sky: 'from-sky-500 to-blue-600',
  violet: 'from-violet-500 to-purple-600',
};

export function PageHero({ icon: Icon, title, description, children, accent = 'primary' }: Props) {
  return (
    <section
      className={`overflow-hidden rounded-3xl bg-gradient-to-br ${accents[accent]} px-6 py-10 text-white md:px-12 md:py-14`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          {Icon && (
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <Icon className="h-6 w-6" />
            </div>
          )}
          <h1 className="text-3xl font-black tracking-tight md:text-5xl">{title}</h1>
          {description && <p className="max-w-2xl text-white/90 md:text-lg">{description}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
