import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

import { type Locale, type MockProduct } from '../../lib/mock-data';

interface Props {
  locale: Locale;
  products: MockProduct[];
  title?: string;
  subtitle?: string;
  ctaHref?: string;
}

// Redesign: editorial split — 1.4fr/1fr, katta kampaniya kartasi + 2 kichik karta
export function FeaturedCollection({ ctaHref = '/catalog?featured=true' }: Props) {
  const t = useTranslations('home');

  return (
    <section>
      <div className="grid gap-5 lg:h-[520px] lg:grid-cols-[1.4fr_1fr]">
        {/* Katta karta — kolleksiya */}
        <Link
          href={ctaHref}
          className="group relative block min-h-[320px] overflow-hidden rounded-[20px]"
        >
          <Image
            src="https://images.unsplash.com/photo-1445205170230-053b83016050?w=1400&q=80&auto=format&fit=crop"
            alt={t('editorial.titleLine1')}
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(10,10,12,0.75)] to-transparent to-55%" />
          <div className="absolute inset-x-9 bottom-9">
            <div className="text-brand-gold-light text-[11px] font-bold uppercase tracking-[0.2em]">
              {t('editorial.eyebrow')}
            </div>
            <div className="mt-2 font-serif text-2xl font-semibold leading-[1.15] text-white md:text-[34px]">
              {t('editorial.titleLine1')}
              <br />
              {t('editorial.titleLine2')}
            </div>
            <div className="border-brand-gold mt-[18px] inline-flex border-b-[1.5px] pb-[3px] text-[13.5px] font-semibold text-white">
              {t('editorial.link')} →
            </div>
          </div>
        </Link>

        {/* O'ng ustun — rasm karta + crimson SALE karta */}
        <div className="grid grid-rows-2 gap-5">
          <Link
            href="/catalog?category=clothing"
            className="group relative block min-h-[200px] overflow-hidden rounded-[20px]"
          >
            <Image
              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80&auto=format&fit=crop"
              alt={t('editorial.womenTitle')}
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(10,10,12,0.7)] to-transparent to-60%" />
            <div className="absolute bottom-6 left-7">
              <div className="font-serif text-[22px] font-semibold text-white">
                {t('editorial.womenTitle')}
              </div>
              <div className="mt-[3px] text-[12.5px] text-white/75">
                {t('editorial.womenCount')}
              </div>
            </div>
          </Link>

          <Link
            href="/sale"
            className="from-primary to-brand-crimson-deep relative flex min-h-[200px] flex-col justify-center overflow-hidden rounded-[20px] bg-gradient-to-br px-7"
          >
            <div className="text-brand-gold-light text-[11px] font-bold uppercase tracking-[0.2em]">
              {t('editorial.saleEyebrow')}
            </div>
            <div className="mt-2 font-serif text-[26px] font-semibold leading-[1.2] text-white">
              {t('editorial.saleTitleLine1')}
              <br />
              {t('editorial.saleTitleLine2')}
            </div>
            <div className="text-primary mt-4 inline-flex self-start rounded-full bg-white px-[22px] py-2.5 text-[13px] font-bold">
              {t('editorial.saleCta')}
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
