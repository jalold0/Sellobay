'use client';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@ecom/ui';
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initDataUnsafe?: { user?: { first_name?: string; id?: number } };
        ready: () => void;
        expand: () => void;
      };
    };
  }
}

export default function TmaHome() {
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setUserName(tg.initDataUnsafe?.user?.first_name ?? null);
    }
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Salom{userName ? `, ${userName}` : ''}!</h1>
      <p className="text-muted-foreground text-sm">Telegram orqali xarid qiling.</p>

      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-sm">Mahsulot #{i + 1}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square rounded-md bg-muted" />
              <Button size="sm" className="w-full mt-2">
                Savatga
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
