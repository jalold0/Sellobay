'use client';

import { TooltipProvider, Toaster } from '@ecom/ui';
import * as React from 'react';

import { QueryProvider } from './query-provider';
import { SessionProvider } from './session-provider';
import { ThemeProvider } from './theme-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system">
      <QueryProvider>
        <SessionProvider>
          <TooltipProvider delayDuration={150}>
            {children}
            <Toaster />
          </TooltipProvider>
        </SessionProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
