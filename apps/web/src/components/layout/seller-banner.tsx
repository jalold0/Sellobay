import { Button } from '@ecom/ui';
import { ArrowRight, BarChart3, Check, DollarSign, Megaphone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

const PERKS: { icon: typeof DollarSign; key: 'commission' | 'analytics' | 'marketing' }[] = [
  { icon: DollarSign, key: 'commission' },
  { icon: BarChart3, key: 'analytics' },
  { icon: Megaphone, key: 'marketing' },
];

export function SellerBanner() {
  const t = useTranslations('sellerBanner');

  return (
    <section className="bg-brand-black relative overflow-hidden rounded-[2rem]">
      <div className="absolute inset-y-0 right-0 hidden w-1/2 lg:block">
        <Image
          src="https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=1600&q=85&auto=format&fit=crop"
          alt="Sellobay"
          fill
          sizes="50vw"
          className="object-cover"
        />
        <div className="from-brand-black via-brand-black/70 absolute inset-0 bg-gradient-to-r to-transparent" />
      </div>

      <div className="relative grid gap-8 px-8 py-12 md:px-12 md:py-16 lg:grid-cols-2 lg:py-20">
        <div className="text-white">
          <div className="border-brand-gold/40 bg-brand-gold/10 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5">
            <span className="text-brand-gold text-[11px] font-bold uppercase tracking-[0.18em]">
              {t('eyebrow')}
            </span>
          </div>

          <h2 className="font-display mt-5 text-3xl font-black leading-[1.1] tracking-tight md:text-4xl lg:text-5xl">
            {t('headlineLine1')}
            <br />
            <span className="text-brand-gold">{t('headlineLine2')}</span>
          </h2>

          <p className="mt-5 max-w-md text-base text-white/80 md:text-lg">{t('subtitle')}</p>

          <ul className="mt-7 space-y-3">
            {PERKS.map(({ icon: Icon, key }) => (
              <li key={key} className="flex items-center gap-3">
                <div className="bg-brand-gold/20 grid h-8 w-8 place-items-center rounded-full">
                  <Check size={14} className="text-brand-gold" strokeWidth={3} />
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-white/95">
                  <Icon size={14} className="text-brand-gold opacity-70" />
                  {t(`perks.${key}`)}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-brand-gold text-brand-black hover:bg-brand-gold/90 px-7 text-base font-bold"
            >
              <Link href="/register?role=seller">
                {t('ctaApply')}
                <ArrowRight size={18} className="ml-2" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent px-7 text-base font-semibold text-white hover:bg-white/10"
            >
              <Link href="/sell">{t('ctaLearn')}</Link>
            </Button>
          </div>

          <p className="mt-6 text-xs text-white/60">
            {t.rich('trust', {
              count: '50,000',
              strong: (chunks) => <strong className="text-white">{chunks}</strong>,
            })}
          </p>
        </div>
      </div>
    </section>
  );
}
