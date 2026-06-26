import { View, type ViewProps } from 'react-native';

import { cn } from './cn';

export function Skeleton({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn('bg-muted animate-pulse rounded-md', className)} {...props} />;
}

/** Mahsulot kartasi skeleton — ProductCard layout'iga mos (grid loading uchun). */
export function ProductCardSkeleton() {
  return (
    <View className="border-border bg-card flex-1 overflow-hidden rounded-xl border">
      <Skeleton className="aspect-square w-full rounded-none" />
      <View className="gap-2 p-3">
        <Skeleton className="h-2.5 w-12" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <View className="mt-1 flex-row items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </View>
      </View>
    </View>
  );
}

/** Grid skeleton — N ta ProductCardSkeleton ikki ustunda. */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View className="flex-row flex-wrap gap-3 px-4">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width: '47%' }}>
          <ProductCardSkeleton />
        </View>
      ))}
    </View>
  );
}
