'use client';

import { Button } from '@ecom/ui';
import { Download, X } from 'lucide-react';
import * as React from 'react';

import { SellobayMark } from '../brand/sellobay-mark';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'sellobay_seller_pwa_install_dismissed_v2';
const DISMISS_DAYS = 14;

export function InstallPrompt() {
  const [event, setEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    const dismissed = window.localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() - Number(dismissed) < DISMISS_DAYS * 86_400_000) return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 5000);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  const install = async () => {
    if (!event) return;
    await event.prompt();
    const result = await event.userChoice;
    if (result.outcome === 'accepted') {
      setVisible(false);
      setEvent(null);
    }
  };

  const dismiss = () => {
    setVisible(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
  };

  if (!visible || !event) return null;

  return (
    <div
      role="dialog"
      className="bg-card fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border p-4 shadow-2xl md:left-auto md:right-4 md:max-w-sm"
    >
      <button
        onClick={dismiss}
        className="text-muted-foreground hover:bg-accent absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full"
        aria-label="Yopish"
        type="button"
      >
        <X size={14} />
      </button>
      <div className="flex items-start gap-3">
        <SellobayMark size={48} className="shrink-0 shadow-md" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Sellobay Sotuvchi panelni o&apos;rnating</div>
          <div className="text-muted-foreground mt-0.5 text-xs">
            Tezda buyurtmalarni boshqaring — push xabarlar, offline rejim.
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={install} size="sm" className="gap-1">
              <Download size={14} /> O&apos;rnatish
            </Button>
            <Button onClick={dismiss} size="sm" variant="ghost">
              Keyinroq
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
