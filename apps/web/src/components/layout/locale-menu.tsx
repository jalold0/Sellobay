'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ecom/ui';
import { usePathname, useRouter } from 'next/navigation';

import { LocaleTrigger } from './locale-switcher';

const LOCALES = [
  { code: 'uz', label: "O'zbek", flag: '🇺🇿' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
] as const;

/**
 * Til menyusi — `LocaleSwitcher` tugmasi bosilganda yuklanadi va darhol ochiq holda
 * chiziladi (o'sha fayldagi izoh). Keyin oddiy Radix menyusi kabi ishlaydi.
 */
export function LocaleMenu({ current, label }: { current: string; label: string }) {
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
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <LocaleTrigger current={current} aria-label={label} />
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
