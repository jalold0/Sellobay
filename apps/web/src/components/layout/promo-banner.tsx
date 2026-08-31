import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { type MockProduct } from '../../lib/mock-data';

interface Props {
  saleProducts: MockProduct[];
}

/**
 * Bosh sahifa banneri — marketplace tuzilmasi.
 *
 * Oldingi HeroSection 620px to'liq kenglikdagi fashion foto edi va TrustStrip bilan
 * birgalikda mahsulotlarni ikkinchi ekranga surib yuborardi. Marketplace'da mahsulot
 * birinchi ekranda bo'lishi kerak, shuning uchun banner 260px va konteyner ichida.
 *
 * Chegirma foizi mock qiymat emas — sale mahsulotlaridan hisoblanadi. Sale bo'lmasa
 * foiz umuman ko'rsatilmaydi (yolg'on da'vo qilmaslik uchun).
 */
export function PromoBanner({ saleProducts }: Props) {
  const t = useTranslations('home.promo');

  const maxDiscount = saleProducts.reduce((max, p) => {
    if (!p.oldPrice || p.oldPrice <= p.price) return max;
    const pct = Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
    return pct > max ? pct : max;
  }, 0);

  return (
    <section className="flex flex-col gap-4 lg:flex-row">
      {/* Asosiy banner */}
      <div className="from-brand-bordeaux-deep via-primary to-brand-bordeaux-bright relative flex h-[240px] flex-1 items-center overflow-hidden rounded-2xl bg-gradient-to-r px-7 md:h-[260px] md:px-11">
        <div className="relative z-10 max-w-[460px]">
          <span className="text-brand-gold-light inline-block rounded-full bg-white/[0.14] px-3 py-[5px] text-[10.5px] font-extrabold uppercase tracking-[0.12em]">
            {t('eyebrow')}
          </span>
          <h2 className="mt-3.5 font-serif text-[28px] font-semibold leading-[1.12] text-white md:text-[38px]">
            {t('title')}
          </h2>
          <p className="mt-2 text-sm text-white/[0.86] md:text-[15px]">
            {maxDiscount > 0 ? (
              <>
                {t('subtitlePrefix')}{' '}
                <span className="text-brand-gold-light font-bold">
                  {t('discountUpTo', { percent: maxDiscount })}
                </span>
              </>
            ) : (
              t('subtitleNoSale')
            )}
          </p>
          <Link
            href="/sale"
            className="bg-brand-gold text-brand-bordeaux-deep mt-[18px] inline-flex h-10 items-center gap-2 rounded-[10px] px-5 text-[13.5px] font-extrabold transition hover:brightness-105"
          >
            {t('cta')}
            <ArrowRight size={15} strokeWidth={2.4} />
          </Link>
        </div>

        {/* Dekorativ oltin halqalar — foto o'rniga, chunki real mahsulot rasmi hali yo'q */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-1/2 hidden h-[420px] w-[420px] -translate-y-1/2 rounded-full border border-white/[0.08] md:block"
        >
          <div className="absolute inset-12 rounded-full border border-white/[0.07]" />
          <div className="bg-brand-gold/[0.07] absolute inset-24 rounded-full" />
        </div>
      </div>

      {/* Yon kartalar — ikkita alohida mahsulot yo'nalishi */}
      <div className="flex gap-4 lg:w-[300px] lg:flex-col">
        <Link
          href="/global"
          className="border-border hover:border-brand-gold group flex flex-1 flex-col justify-center rounded-2xl border bg-white p-5 transition"
        >
          <span className="text-brand-gold-text text-[10.5px] font-extrabold uppercase tracking-[0.12em]">
            {t('globalEyebrow')}
          </span>
          <span className="text-brand-ink mt-2 text-[17px] font-bold leading-tight">
            {t('globalTitle')}
          </span>
          <span className="text-muted-foreground mt-1.5 text-[12.5px] leading-[1.5]">
            {t('globalText')}
          </span>
          <span className="text-primary mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold">
            {t('globalCta')}
            <ArrowRight
              size={13}
              strokeWidth={2.4}
              className="transition group-hover:translate-x-0.5"
            />
          </span>
        </Link>

        <Link
          href="/group-buy"
          className="bg-brand-ink hover:ring-brand-gold/40 group flex flex-1 flex-col justify-center rounded-2xl p-5 transition hover:ring-1"
        >
          <span className="text-brand-gold text-[10.5px] font-extrabold uppercase tracking-[0.12em]">
            {t('groupEyebrow')}
          </span>
          <span className="mt-2 text-[17px] font-bold leading-tight text-white">
            {t('groupTitle')}
          </span>
          <span className="mt-1.5 text-[12.5px] leading-[1.5] text-white/60">{t('groupText')}</span>
          <span className="text-brand-gold-light mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold">
            {t('groupCta')}
            <ArrowRight
              size={13}
              strokeWidth={2.4}
              className="transition group-hover:translate-x-0.5"
            />
          </span>
        </Link>
      </div>
    </section>
  );
}
