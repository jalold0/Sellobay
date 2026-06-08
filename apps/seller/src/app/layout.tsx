import '@ecom/ui/globals.css';

import type { Metadata, Viewport } from 'next';
import type * as React from 'react';

import { Shell } from '../components/layout/shell';
import { InstallPrompt } from '../components/pwa/install-prompt';
import { ServiceWorkerRegister } from '../components/pwa/service-worker-register';
import { Providers } from '../providers';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002'),
  title: { default: 'Sotuvchi paneli — E-Commerce', template: '%s | Sotuvchi' },
  description: 'Marketplace sotuvchi paneli',
  applicationName: 'E-Commerce Sotuvchi',
  appleWebApp: {
    capable: true,
    title: 'E-Commerce Sotuvchi',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <Providers>
          <Shell>{children}</Shell>
          <InstallPrompt />
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}
