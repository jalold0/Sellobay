'use client';

import { ChevronDown, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

// Ochiladigan menyu (Radix DropdownMenu + floating-ui, ~45 KB) birinchi bosishda yuklanadi.
// Ilgari u har sahifada yuklanib, gidratatsiya qilinardi — tilni esa kamdan-kam odam
// almashtiradi. Kursor/fokus/barmoq kelganda oldindan yuklanadi; modul tayyor bo'lguncha
// shu tugma o'z joyida turadi, keyin menyu ochiq holda uning o'rniga chiziladi.
const loadMenu = () => import('./locale-menu');
type LocaleMenuType = Awaited<ReturnType<typeof loadMenu>>['LocaleMenu'];

type TriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { current: string };

/** Menyu tugmasi — lazy menyu ichida ham aynan shu (asChild orqali) ishlatiladi. */
export const LocaleTrigger = React.forwardRef<HTMLButtonElement, TriggerProps>(
  ({ current, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/30"
      {...props}
    >
      <Globe size={13} />
      <span className="uppercase tracking-wider">{current}</span>
      <ChevronDown size={12} className="opacity-70" />
    </button>
  ),
);
LocaleTrigger.displayName = 'LocaleTrigger';

export function LocaleSwitcher({ current }: { current: string }) {
  const t = useTranslations('localeSwitcher');
  const [Menu, setMenu] = React.useState<LocaleMenuType | null>(null);
  const preload = () => void loadMenu();

  // Nom ko'rinadigan matnni («uz») o'z ichiga olishi kerak (WCAG 2.5.3).
  const label = `${t('label')}: ${current}`;

  if (Menu) return <Menu current={current} label={label} />;
  return (
    <LocaleTrigger
      current={current}
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={false}
      onTouchStart={preload}
      onPointerEnter={preload}
      onFocus={preload}
      onClick={() => void loadMenu().then((m) => setMenu(() => m.LocaleMenu))}
    />
  );
}
