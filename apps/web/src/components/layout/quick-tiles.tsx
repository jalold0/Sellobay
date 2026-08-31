import { BadgeCheck, Clock3, PackageOpen, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

const TILES = [
  { key: 'authentic', href: '/help', Icon: BadgeCheck, tint: 'bg-[#F7E9EC] text-primary' },
  { key: 'delivery', href: '/delivery', Icon: Truck, tint: 'bg-[#EDF2EC] text-[#3F6B43]' },
  {
    key: 'returns',
    href: '/returns',
    Icon: PackageOpen,
    tint: 'bg-[#F5EFE4] text-brand-gold-text',
  },
  {
    key: 'new',
    href: '/catalog?sort=newest',
    Icon: Sparkles,
    tint: 'bg-[#F5EFE4] text-brand-gold-text',
  },
  { key: 'flash', href: '/sale', Icon: Clock3, tint: 'bg-[#F7E9EC] text-primary' },
  { key: 'secure', href: '/offer', Icon: ShieldCheck, tint: 'bg-[#EFEFF2] text-brand-charcoal' },
] as const;

/**
 * Banner ostidagi tezkor plitkalar — xizmat va'dalari.
 *
 * Ataylab raqamsiz: bularning har biri tekshirilishi mumkin bo'lgan va'da
 * ("original kafolati", "bepul qaytarish"), traksiya statistikasi emas.
 */
export function QuickTiles() {
  const t = useTranslations('home.quickTiles');

  return (
    <section className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-6">
      {TILES.map(({ key, href, Icon, tint }) => (
        <Link
          key={key}
          href={href}
          className="border-border hover:border-brand-gold flex items-center gap-2.5 rounded-xl border bg-white px-3.5 py-3 transition"
        >
          <span
            className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] ${tint}`}
          >
            <Icon size={17} strokeWidth={1.8} />
          </span>
          <span className="text-brand-ink text-[12.5px] font-semibold leading-[1.25]">
            {t(key)}
          </span>
        </Link>
      ))}
    </section>
  );
}
