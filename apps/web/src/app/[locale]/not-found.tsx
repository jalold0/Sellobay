import { Button } from '@ecom/ui';
import { Compass, Home, Search } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <div className="text-[120px] font-black leading-none text-primary/20 md:text-[160px]">404</div>
      <div className="-mt-8">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Sahifa topilmadi</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground md:text-base">
          Bu sahifa o&apos;chirilgan, ko&apos;chirilgan yoki hech qachon mavjud bo&apos;lmagan. Lekin xavotir olmang —
          minglab boshqa mahsulot sizni kutmoqda!
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild className="gap-2">
          <Link href="/">
            <Home className="h-4 w-4" /> Bosh sahifa
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/catalog">
            <Compass className="h-4 w-4" /> Katalog
          </Link>
        </Button>
      </div>

      <div className="mt-6 w-full max-w-sm">
        <form action="/catalog" className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            placeholder="Yoki qidirishni boshlang..."
            className="h-11 w-full rounded-full border border-input bg-background pl-10 pr-4 text-sm outline-none focus:border-primary"
          />
        </form>
      </div>
    </div>
  );
}
