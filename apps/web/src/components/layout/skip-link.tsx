// Klaviatura foydalanuvchilari uchun "main"ga to'g'ridan-to'g'ri o'tish.
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only fixed left-2 top-2 z-[100] rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      Asosiy kontentga o&apos;tish
    </a>
  );
}
