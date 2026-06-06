'use client';

import { cn } from '@ecom/ui';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { adminNav } from '../../lib/nav';

const labelMap = new Map(adminNav.map((n) => [n.href, n.label]));

function humanize(segment: string): string {
  const decoded = decodeURIComponent(segment);
  return decoded.charAt(0).toUpperCase() + decoded.slice(1);
}

export function Breadcrumbs({ overrides }: { overrides?: Record<string, string> }) {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);

  const crumbs: Array<{ href: string; label: string; last: boolean }> = parts.map((seg, idx) => {
    const href = '/' + parts.slice(0, idx + 1).join('/');
    const label = overrides?.[href] ?? labelMap.get(href) ?? humanize(seg);
    return { href, label, last: idx === parts.length - 1 };
  });

  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
      <Link href="/" className="flex items-center hover:text-foreground">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((c) => (
        <span key={c.href} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          {c.last ? (
            <span className={cn('font-medium text-foreground')}>{c.label}</span>
          ) : (
            <Link href={c.href} className="hover:text-foreground">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
