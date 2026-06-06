import { Facebook, Instagram, Mail, MapPin, Phone, Send, Youtube } from 'lucide-react';
import Link from 'next/link';

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Kompaniya',
    links: [
      { href: '/about', label: 'Biz haqimizda' },
      { href: '/careers', label: "Bo'sh ish o'rinlari" },
      { href: '/press', label: 'Matbuot' },
      { href: '/contacts', label: "Aloqa ma'lumotlari" },
    ],
  },
  {
    title: 'Mijozlar uchun',
    links: [
      { href: '/help', label: "Qo'llab-quvvatlash markazi" },
      { href: '/delivery', label: 'Yetkazib berish' },
      { href: '/returns', label: "Qaytarish va to'lash" },
      { href: '/faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Sotuvchilar',
    links: [
      { href: '/sell', label: "Sotuvchi bo'lish" },
      { href: '/seller-guide', label: "Sotuvchi qo'llanmasi" },
      { href: '/commissions', label: 'Komissiyalar' },
      { href: '/seller-rules', label: 'Sotuvchi qoidalari' },
    ],
  },
  {
    title: 'Yuridik',
    links: [
      { href: '/terms', label: 'Foydalanish shartlari' },
      { href: '/privacy', label: 'Maxfiylik siyosati' },
      { href: '/cookies', label: 'Cookie siyosati' },
      { href: '/offer', label: 'Ommaviy oferta' },
    ],
  },
];

const PAY_METHODS = ['Click', 'Payme', 'Uzum', 'Uzcard', 'Humo', 'Visa', 'Master'];

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-secondary/30">
      {/* Top: brand + columns */}
      <div className="container grid gap-10 py-12 md:grid-cols-12">
        <div className="space-y-4 md:col-span-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-rose-500 font-black text-primary-foreground">
              E
            </div>
            <span className="text-lg font-bold tracking-tight">E-Commerce Ekosistema</span>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            O&apos;zbekistondagi eng yirik ko&apos;p toifali onlayn savdo platformasi. Sevimli mahsulotlaringiz bir joyda.
          </p>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone size={14} /> <span>+998 71 200 00 00</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail size={14} /> <span>info@example.uz</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin size={14} />
              <span>Toshkent sh., Mirzo Ulug&apos;bek tumani</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            {[
              { Icon: Instagram, href: 'https://instagram.com' },
              { Icon: Facebook, href: 'https://facebook.com' },
              { Icon: Send, href: 'https://t.me' },
              { Icon: Youtube, href: 'https://youtube.com' },
            ].map(({ Icon, href }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="grid h-9 w-9 place-items-center rounded-full border bg-background text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        <div className="grid gap-8 md:col-span-8 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="mb-3 text-sm font-semibold uppercase tracking-wide">{col.title}</div>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Apps strip */}
      <div className="border-t">
        <div className="container flex flex-col items-center justify-between gap-4 py-6 md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <span className="mr-2 text-sm font-medium">To&apos;lov usullari:</span>
            {PAY_METHODS.map((m) => (
              <span
                key={m}
                className="rounded-md border bg-background px-2 py-1 text-xs font-semibold uppercase text-muted-foreground"
              >
                {m}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Mobil ilovani yuklab oling:</span>
            <a
              href="#"
              className="rounded-md border bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
            >
              App Store
            </a>
            <a
              href="#"
              className="rounded-md border bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
            >
              Google Play
            </a>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t">
        <div className="container flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted-foreground md:flex-row">
          <div>© {new Date().getFullYear()} E-Commerce Ekosistema. Barcha huquqlar himoyalangan.</div>
          <div>Made in Uzbekistan 🇺🇿</div>
        </div>
      </div>
    </footer>
  );
}
