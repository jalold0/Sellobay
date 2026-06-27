import * as React from 'react';

import { cn } from '../lib/cn';

export interface CategoryCardProps {
  name: string;
  emoji?: string;
  imageUrl?: string;
  href: string;
  productCount?: number;
  className?: string;
  LinkComponent?: React.ComponentType<{ href: string; className?: string; children: React.ReactNode }>;
}

const NativeLink = (props: { href: string; className?: string; children: React.ReactNode }) => (
  <a href={props.href} className={props.className}>
    {props.children}
  </a>
);

export function CategoryCard({
  name,
  emoji,
  imageUrl,
  href,
  productCount,
  className,
  LinkComponent = NativeLink,
}: CategoryCardProps) {
  return (
    <LinkComponent
      href={href}
      className={cn(
        'group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl border bg-gradient-to-br from-muted to-secondary p-4 transition hover:shadow-lg',
        className,
      )}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-500 group-hover:scale-110"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      {emoji && (
        <div className="absolute right-4 top-4 text-4xl drop-shadow-lg">{emoji}</div>
      )}
      <div className="relative z-10 text-white">
        <div className="text-lg font-bold leading-tight">{name}</div>
        {productCount !== undefined && (
          <div className="mt-1 text-xs opacity-90">{productCount.toLocaleString()} mahsulot</div>
        )}
      </div>
    </LinkComponent>
  );
}
