'use client';

import { Button } from '@ecom/ui';
import { ArrowDown, Plus, Share2, X } from 'lucide-react';
import * as React from 'react';

const DISMISS_KEY = 'ecom_ios_install_dismissed_v1';
const DISMISS_DAYS = 14;

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

// iOS Safari'da PWA o'rnatish uchun maxsus overlay.
// Apple `beforeinstallprompt`ni qo'llab-quvvatlamaydi — manual ko'rsatma ko'rsatamiz.
export function IosInstallSheet() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = window.navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    if (!isIOS) return;
    // Safari'da bo'lishi kerak (Chrome iOS — CriOS, FxiOS uchun ham PWA mavjud emas)
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (!isSafari) return;

    // Allaqachon standalone — chiqarmaslik
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((window.navigator as NavigatorWithStandalone).standalone === true) return;

    const dismissed = window.localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() - Number(dismissed) < DISMISS_DAYS * 86_400_000) return;

    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setVisible(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop — bosilganda yopiladi; dialog Escape bilan ham yopiladi */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className="animate-in fade-in fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
        onClick={dismiss}
      />
      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-label="iPhone'ga o'rnatish"
        className="animate-in slide-in-from-bottom-full fixed inset-x-0 bottom-0 z-[61] duration-300"
      >
        <div className="bg-card mx-auto max-w-md rounded-t-3xl border-t p-5 pb-8 shadow-2xl">
          <button
            onClick={dismiss}
            className="bg-muted text-muted-foreground hover:bg-accent absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full"
            aria-label="Yopish"
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/sellobay-icon-64.png"
              alt="Sellobay"
              className="h-14 w-14 shrink-0 rounded-2xl shadow-lg"
            />
            <div>
              <div className="text-base font-bold">Sellobay</div>
              <div className="text-muted-foreground text-xs">Telefonga o&apos;rnating</div>
            </div>
          </div>

          {/* Steps */}
          <ol className="mt-5 space-y-3">
            <li className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold">
                1
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium">
                  Pastdagi{' '}
                  <span className="bg-muted inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs">
                    <Share2 size={12} /> Share
                  </span>{' '}
                  tugmasini bosing
                </div>
                <div className="text-muted-foreground mt-0.5 text-xs">
                  Safari'ning pastki panelida (yoki yuqorida)
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold">
                2
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium">
                  <span className="bg-muted inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs">
                    <Plus size={12} /> Add to Home Screen
                  </span>{' '}
                  ni tanlang
                </div>
                <div className="text-muted-foreground mt-0.5 text-xs">
                  Ro&apos;yxatda pastroqda turishi mumkin
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold">
                3
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium">
                  O&apos;ng yuqorida{' '}
                  <span className="bg-muted rounded px-1.5 py-0.5 text-xs">Add</span> ni bosing
                </div>
                <div className="text-muted-foreground mt-0.5 text-xs">
                  Tayyor! Bosh ekranda ikonka paydo bo&apos;ladi
                </div>
              </div>
            </li>
          </ol>

          {/* Animated arrow pointing to Share button */}
          <div className="mt-5 flex flex-col items-center gap-1">
            <Share2 size={28} className="text-primary" />
            <ArrowDown size={20} className="text-primary animate-bounce" />
            <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
              Share tugmasi bu yerda
            </div>
          </div>

          <Button onClick={dismiss} variant="ghost" className="mt-4 w-full" size="sm">
            Keyinroq
          </Button>
        </div>
      </div>
    </>
  );
}
