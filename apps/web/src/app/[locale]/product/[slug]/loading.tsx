import { Skeleton } from '@ecom/ui';

// Tovar sahifasi shakli: chapda galereya, o'ngda nom/narx/tanlov/tugmalar.
export default function ProductLoading() {
  return (
    <div className="space-y-10" aria-busy="true">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-16 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-40" />
          <div className="flex gap-2 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-12 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
