'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ecom/ui';
import { ChevronDown, Globe } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const LOCALES = [
  { code: 'uz', label: "O'zbek", flag: '🇺🇿' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
] as const;

export function LocaleSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const switchTo = (code: string) => {
    if (code === current) return;
    const segments = pathname.split('/');
    if (LOCALES.some((l) => l.code === segments[1])) {
      segments[1] = code;
    } else {
      segments.splice(1, 0, code);
    }
    router.push(segments.join('/') || `/${code}`);
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/30"
        aria-label="Til tanlash"
      >
        <Globe size={13} />
        <span className="uppercase tracking-wider">{current}</span>
        <ChevronDown size={12} className="opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-[160px]">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => switchTo(l.code)}
            className={l.code === current ? 'bg-accent font-medium' : ''}
          >
            <span className="mr-2 text-base leading-none">{l.flag}</span>
            <span>{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
