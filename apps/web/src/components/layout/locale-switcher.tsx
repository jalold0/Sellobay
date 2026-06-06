'use client';

import { ChevronDown, Globe } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const LOCALES = [
  { code: 'uz', label: "O'zbek", flag: '🇺🇿' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export function LocaleSwitcher({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const activeFlag = LOCALES.find((l) => l.code === current)?.flag ?? '🇺🇿';

  const switchTo = (code: string) => {
    setOpen(false);
    if (code === current) return;
    const segments = pathname.split('/');
    if (LOCALES.some((l) => l.code === segments[1])) {
      segments[1] = code;
    } else {
      segments.splice(1, 0, code);
    }
    router.push(segments.join('/') || `/${code}`);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-accent"
      >
        <Globe size={12} />
        <span>{activeFlag}</span>
        <span className="uppercase">{current}</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border bg-background shadow-lg">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => switchTo(l.code)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent ${
                  l.code === current ? 'bg-accent font-medium' : ''
                }`}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
