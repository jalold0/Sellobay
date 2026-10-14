import { Skeleton } from '@ecom/ui';

// Katalogning o'z shakli: yo'l, sarlavha, filtrlar, tovar to'ri — sahifa kelganda
// hech narsa siljimaydi. Ilgari hamma bo'lim uchun bitta umumiy skelet bor edi.
export default function CatalogLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-3 pt-2">
        <Skeleton className="h-3.5 w-40" />
        <div className="flex items-baseline gap-3">
          <Skeleton className="h-8 w-48 md:h-9" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="ml-auto h-9 w-32 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
