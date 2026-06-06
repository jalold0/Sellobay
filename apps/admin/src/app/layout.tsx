import '@ecom/ui/globals.css';

import type { Metadata } from 'next';
import type * as React from 'react';

import { Shell } from '../components/layout/shell';
import { Providers } from '../providers';

export const metadata: Metadata = {
  title: {
    default: 'Admin Panel — E-Commerce',
    template: '%s | Admin',
  },
  description: "E-Commerce ekosistemasini boshqaruv markazi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
