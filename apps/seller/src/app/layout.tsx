import '@ecom/ui/globals.css';

import type { Metadata, Viewport } from 'next';
import type * as React from 'react';

import { Shell } from '../components/layout/shell';
import { InstallPrompt } from '../components/pwa/install-prompt';
import { ServiceWorkerRegister } from '../components/pwa/service-worker-register';
import { Providers } from '../providers';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002'),
  title: { default: 'Sellobay Sotuvchi paneli', template: '%s | Sellobay Sotuvchi' },
  description: 'Sellobay marketplace sotuvchi paneli — do`koningizni boshqaring',
  applicationName: 'Sellobay Sotuvchi',
  appleWebApp: {
    capable: true,
    title: 'Sellobay Sotuvchi',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/icon.svg',
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
    other: [{ rel: 'mask-icon', url: '/icon.svg', color: '#8B0020' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#8B0020',
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
