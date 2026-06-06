import '@ecom/ui/globals.css';

import type * as React from 'react';

import { Providers } from '../../providers';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
