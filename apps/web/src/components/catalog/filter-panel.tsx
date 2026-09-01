'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import * as React from 'react';

interface Props {
  label: string;
  children: React.ReactNode;
}

/**
 * Filtrlar paneli.
 *
 * Desktopda — odatdagi yon ustun, doim ochiq.
 *
 * Telefonda — yopiq. Ilgari filtrlar mahsulotlardan YUQORIDA joylashardi va
 * xaridor birinchi mahsulotni ko'rish uchun oltita kategoriya, o'nlab brend va
 * narx maydonlarini aylanib o'tishi kerak edi. Uzum, Wildberries va Ozon —
 * uchalasi ham mobil filtrlarni tugma ortiga yashiradi.
 */
export function FilterPanel({ label, children }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="border-border text-brand-ink mb-4 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[14px] font-semibold lg:hidden"
      >
        {open ? <X size={16} /> : <SlidersHorizontal size={16} />}
        {label}
      </button>

      <div className={open ? 'block' : 'hidden lg:block'}>{children}</div>
    </>
  );
}
