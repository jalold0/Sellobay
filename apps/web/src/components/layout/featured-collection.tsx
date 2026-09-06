import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

import { type MockProduct } from '../../lib/mock-data';

interface Props {
  /** Chegirmadagi mahsulotlar — o'ng pastdagi kartadagi foiz shundan hisoblanadi. */
  saleProducts: MockProduct[];
  ctaHref?: string;
}

// Redesign: editorial split — 1.4fr/1fr, katta kampaniya kartasi + 2 kichik karta
//
// Bu blok ataylab dekorativ (rasmlar — editorial banner), lekin ilgari unda
// ikkita to'qima DA'VO bor edi: katta kartada "25 ta asosiy buyum"
// (kolleksiyada bunday son yo'q) va SALE kartasida "Faqat 48 soat / −50%
// gacha" (na 48 soatlik oyna, na 50% chegirma mavjud edi). Raqamli da'volar
// olib tashlandi, chegirma foizi esa mahsulotlardan hisoblanadi.
//
// Ilgari komponent `locale`, `products`, `title`, `subtitle` proplarini ham
// qabul qilardi va ularning BIRORTASINI ishlatmasdi — olib tashlandi.
export function FeaturedCollection({ saleProducts, ctaHref = '/catalog?featured=true' }: Props) {
  const t = useTranslations('home');

  const maxDiscount = saleProducts.reduce((max, p) => {
    if (!p.oldPrice || p.oldPrice <= p.price) return max;
    return Math.max(max, Math.round(100 - (p.price / p.oldPrice) * 100));
  }, 0);

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
              {maxDiscount > 0 ? (
                <>
                  <br />
                  {t('editorial.saleDiscount', { percent: maxDiscount })}
                </>
              ) : null}
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
