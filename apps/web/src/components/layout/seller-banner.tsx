import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

// Redesign: ink karta 1.2fr/1fr — eyebrow, Playfair sarlavha, 3 gold-✓, crimson pill CTA
export function SellerBanner() {
  const t = useTranslations('home.sellerCta');

  return (
    <section className="bg-brand-ink relative grid overflow-hidden rounded-[20px] lg:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col justify-center p-8 md:p-14">
        <div className="flex items-center gap-2.5">
          <div className="bg-brand-gold h-[1.5px] w-8" />
          <span className="text-brand-gold-light text-[11.5px] font-bold uppercase tracking-[0.2em]">
            {t('eyebrow')}
          </span>
        </div>

        <h2 className="mt-4 font-serif text-3xl font-semibold leading-[1.2] text-white md:text-4xl">
          {t('titleLine1')}
          <br />
          {t('titleLine2')}
        </h2>

        <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3 text-[13px] text-white/75">
          {(['perk1', 'perk2', 'perk3'] as const).map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-brand-gold">✓</span>
              {t(k)}
            </div>
          ))}
        </div>

        <Link
          href="/register?role=seller"
          className="bg-primary hover:bg-primary/90 mt-8 inline-flex self-start rounded-full px-[30px] py-3.5 text-[14.5px] font-bold text-white transition"
        >
          {t('cta')}
        </Link>
      </div>

      <div className="relative min-h-[240px] lg:min-h-[320px]">
        <Image
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1000&q=80&auto=format&fit=crop"
          alt={t('eyebrow')}
          fill
          sizes="(max-width: 1024px) 100vw, 40vw"
          className="object-cover opacity-85"
        />
        <div className="from-brand-ink absolute inset-0 bg-gradient-to-r to-transparent to-40%" />
      </div>
    </section>
  );
}
