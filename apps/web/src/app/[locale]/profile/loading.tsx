import { Skeleton } from '@ecom/ui';

// Profil bo'limlari: chap menyu (layout) joyida qoladi, faqat kontent qismi kutadi.
export default function ProfileLoading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}
