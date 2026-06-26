'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">500</h1>
      <p className="text-muted-foreground">Xatolik yuz berdi</p>
      <button onClick={reset} className="text-primary underline underline-offset-4">
        Qayta urinish
      </button>
    </div>
  );
}
