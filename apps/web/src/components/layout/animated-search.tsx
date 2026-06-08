'use client';

import { Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

// TZ §1: Animated placeholder — har 2.5s ga o'zgaradi.
const SUGGESTIONS = [
  'Nike Air Max 270',
  'Chanel N°5 atiri',
  'ZARA ko`ylagi',
  'iPhone 16 chexol',
  'MAC Ruby Woo labbo`yog`i',
  'Adidas Ultraboost',
];

export function AnimatedSearch({ className }: { className?: string }) {
  const common = useTranslations('common');
  const locale = useLocale();
  const [idx, setIdx] = React.useState(0);
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    if (focused) return undefined;
    const t = setInterval(() => setIdx((i) => (i + 1) % SUGGESTIONS.length), 2500);
    return () => clearInterval(t);
  }, [focused]);

  return (
    <form action={`/${locale}/catalog`} className={className} role="search">
      <div className="border-input bg-background focus-within:border-primary focus-within:ring-primary/20 relative flex h-11 items-center rounded-full border transition focus-within:ring-2">
        <Search
          size={18}
          className="text-muted-foreground pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
        />
        <input
          type="search"
          name="q"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={
            focused ? `${common('search')}...` : `${common('search')} — ${SUGGESTIONS[idx]}`
          }
          className="h-full w-full rounded-full bg-transparent pl-11 pr-32 text-sm outline-none"
        />
        <button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 absolute right-1 top-1/2 h-9 -translate-y-1/2 rounded-full px-5 text-xs font-semibold transition hover:scale-[1.03]"
        >
          Qidirish
        </button>
      </div>
    </form>
  );
}
