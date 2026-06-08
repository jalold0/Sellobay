import '@ecom/ui/globals.css';

import type { Metadata, Viewport } from 'next';
import type * as React from 'react';

import { Shell } from '../components/layout/shell';
import { InstallPrompt } from '../components/pwa/install-prompt';
import { ServiceWorkerRegister } from '../components/pwa/service-worker-register';
import { Providers } from '../providers';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'),
  title: {
    default: 'Admin Panel — E-Commerce',
    template: '%s | Admin',
  },
  description: 'E-Commerce ekosistemasini boshqaruv markazi',
  applicationName: 'E-Commerce Admin',
  appleWebApp: {
    capable: true,
    title: 'E-Commerce Admin',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
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
