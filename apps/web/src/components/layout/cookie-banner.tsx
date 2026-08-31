'use client';

import { Button } from '@ecom/ui';
import { Cookie, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import * as React from 'react';

const STORAGE_KEY = 'ecom_cookie_consent_v1';

export function CookieBanner() {
  const t = useTranslations('cookieBanner');
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return undefined;
    // Sahifa to'liq yuklangandan keyin ko'rsatish
    const t2 = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t2);
  }, []);

  const accept = (mode: 'all' | 'essential') => {
    window.localStorage.setItem(STORAGE_KEY, mode);
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 md:bottom-4">
      <div className="bg-background mx-auto flex max-w-4xl flex-col items-start gap-3 rounded-2xl border p-4 shadow-2xl md:flex-row md:items-center">
        <div className="bg-primary/10 text-primary grid h-10 w-10 shrink-0 place-items-center rounded-full">
          <Cookie size={18} />
        </div>
        <p className="text-muted-foreground flex-1 text-sm">
          {/* Havola matn ichida — har tilda gap tuzilishi boshqacha, shuning uchun
              t.rich() ishlatiladi va havola joyi tarjimada belgilanadi. */}
          {t.rich('text', {
            policy: (chunks) => (
              <Link href="/cookies" className="text-primary hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => accept('essential')}>
            {t('essential')}
          </Button>
          <Button size="sm" onClick={() => accept('all')}>
            {t('acceptAll')}
          </Button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="text-muted-foreground hover:bg-accent grid h-8 w-8 shrink-0 place-items-center rounded-md"
            aria-label={t('close')}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
