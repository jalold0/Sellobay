import '@ecom/ui/globals.css';

import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = { title: 'E-Commerce — Telegram' };

export default function TmaLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
