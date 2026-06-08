'use client';

import { Button, toast } from '@ecom/ui';
import { Check, Download } from 'lucide-react';
import * as React from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Props {
  variant?: 'default' | 'secondary' | 'outline';
  size?: 'sm' | 'lg' | 'default';
  className?: string;
  children?: React.ReactNode;
}

export function PwaInstallButton({ variant = 'default', size = 'lg', className, children }: Props) {
  const [event, setEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!event) {
      toast({
        title: 'O`rnatish mavjud emas',
        description:
          "Brauzeringizning manzil qatorida 'Install' tugmasini bosing yoki menyu (⋮) → 'Install app'",
        variant: 'warning',
        duration: 5000,
      });
      return;
    }
    await event.prompt();
    const result = await event.userChoice;
    if (result.outcome === 'accepted') {
      setInstalled(true);
      setEvent(null);
    }
  };

  if (installed) {
    return (
      <Button variant="outline" size={size} disabled className={className}>
        <Check className="mr-2 h-4 w-4" /> O&apos;rnatilgan
      </Button>
    );
  }

  return (
    <Button onClick={install} variant={variant} size={size} className={className}>
      <Download className="mr-2 h-4 w-4" />
      {children ?? 'PWA o`rnatish'}
    </Button>
  );
}
