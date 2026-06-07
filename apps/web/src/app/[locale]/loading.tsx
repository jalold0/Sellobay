import { Skeleton } from '@ecom/ui';

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-1/3" />
      <Skeleton className="h-5 w-1/2" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-xl border bg-card p-3">
            <Skeleton className="aspect-square w-full rounded-md" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
