'use client';

import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import type { CategorySummary } from '../../lib/catalog';

// Panel (Radix Dialog, focus-trap, scroll-lock, ~20 KB) birinchi bosishda yuklanadi —
// ilgari u har sahifada gidratatsiya va modul bajarilishiga qo'shilardi, menyuni esa
// kamdan-kam odam ochadi. Barmoq tekkanda (touchstart) yoki kursor/fokus kelganda
// oldindan yuklab qo'yiladi — bosish paytida odatda tayyor turadi.
const loadSheet = () => import('./mobile-nav-sheet');
type MobileNavSheetType = Awaited<ReturnType<typeof loadSheet>>['MobileNavSheet'];

export function MobileNav({ categories }: { categories: CategorySummary[] }) {
  const common = useTranslations('common');
  const [open, setOpen] = React.useState(false);
  const [Sheet, setSheet] = React.useState<MobileNavSheetType | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const preload = () => void loadSheet();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="hover:bg-accent grid h-10 w-10 place-items-center rounded-md md:hidden"
        aria-label={common('menu')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onTouchStart={preload}
        onPointerEnter={preload}
        onFocus={preload}
        onClick={() =>
          void loadSheet().then((m) => {
            setSheet(() => m.MobileNavSheet);
            setOpen(true);
          })
        }
      >
        <Menu size={20} />
      </button>
      {Sheet ? (
        <Sheet
          categories={categories}
          open={open}
          onOpenChange={setOpen}
          returnFocusRef={triggerRef}
        />
      ) : null}
    </>
  );
}
