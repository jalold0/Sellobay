'use client';

import { Button } from '@ecom/ui';
import { Cookie, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link } from '@/i18n/navigation';

export const COOKIE_CONSENT_KEY = 'ecom_cookie_consent_v1';

/**
 * Banner birinchi chizishdayoq server HTML'ida keladi.
 *
 * NEGA: ilgari u gidratatsiyadan 1,5 s keyin paydo bo'lardi. Matni bosh sahifadagi
 * eng katta matn bo'lgani uchun birinchi marta kirgan HAR bir foydalanuvchida LCP
 * shu kech paydo bo'lgan paragrafga surilardi (Lighthouse mobil: LCP ~5,3 s, banner
 * sarlavhasi esa ~2,7 s da tayyor edi).
 *
 * Rozilik bergan foydalanuvchida banner ko'rinmasligi uchun `CookieConsentScript`
 * bo'yashdan OLDIN `<html data-cookie-consent>` qo'yadi va banner CSS bilan yashirinadi —
 * sahifa statik qoladi (cookie o'qish uchun server render kerak emas).
 */
export function CookieBanner() {
  const t = useTranslations('cookieBanner');
  // Server va birinchi client render bir xil (ko'rinadi) — gidratatsiya mos keladi.
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    if (window.localStorage.getItem(COOKIE_CONSENT_KEY)) setVisible(false);
  }, []);

  const accept = (mode: 'all' | 'essential') => {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, mode);
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 md:bottom-4 [[data-cookie-consent]_&]:hidden">
      <div className="bg-background mx-auto flex max-w-4xl flex-col items-start gap-3 rounded-2xl border p-4 shadow-2xl md:flex-row md:items-center">
        <div className="bg-primary/10 text-primary grid h-10 w-10 shrink-0 place-items-center rounded-full">
          <Cookie size={18} />
        </div>
        <p className="text-muted-foreground flex-1 text-sm">
          {/* Havola matn ichida — har tilda gap tuzilishi boshqacha, shuning uchun
              t.rich() ishlatiladi va havola joyi tarjimada belgilanadi. */}
          {t.rich('text', {
            policy: (chunks) => (
              <Link href="/cookies" prefetch={false} className="text-primary hover:underline">
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

/**
 * Bo'yashdan oldin ishlaydi: rozilik saqlangan bo'lsa `<html data-cookie-consent>`.
 * `<CookieBanner />` dan OLDIN render qilinadi (server komponentda).
 */
export function CookieConsentScript() {
  return (
    <script
      // Statik qator, foydalanuvchi ma'lumoti yo'q. localStorage bloklangan bo'lsa — banner ko'rinadi.
      dangerouslySetInnerHTML={{
        __html: `try{if(localStorage.getItem(${JSON.stringify(COOKIE_CONSENT_KEY)}))document.documentElement.setAttribute('data-cookie-consent','')}catch(e){}`,
      }}
    />
  );
}
