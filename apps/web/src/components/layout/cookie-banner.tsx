'use client';

import { Button } from '@ecom/ui';
import { Cookie, X } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

const STORAGE_KEY = 'ecom_cookie_consent_v1';

export function CookieBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Sahifa to'liq yuklangandan keyin ko'rsatish
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = (mode: 'all' | 'essential') => {
    window.localStorage.setItem(STORAGE_KEY, mode);
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 md:bottom-4">
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-3 rounded-2xl border bg-background p-4 shadow-2xl md:flex-row md:items-center">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Cookie size={18} />
        </div>
        <p className="flex-1 text-sm text-muted-foreground">
          Biz sayt ishlashini yaxshilash uchun cookie ishlatamiz. Davom etib, siz{' '}
          <Link href="/cookies" className="text-primary hover:underline">
            cookie siyosati
          </Link>
          ga rozilik bildirasiz.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => accept('essential')}>
            Faqat zaruriy
          </Button>
          <Button size="sm" onClick={() => accept('all')}>
            Hammasini qabul qilish
          </Button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent"
            aria-label="Yopish"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
