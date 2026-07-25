import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

import { categories, pickLocale, productImage, type Locale } from '../../lib/mock-data';

interface Props {
  locale: Locale;
}

export function CategoryGrid({ locale }: Props) {
  const t = useTranslations('home');

  return (
    <section>
      {/* Eyebrow + Playfair h2 + "Barchasini ko'rish" */}
      <div className="mb-7 flex items-end justify-between">
        <div>
          <div className="text-primary text-[11.5px] font-bold uppercase tracking-[0.2em]">
            {t('categoriesTitle')}
          </div>
          <h2 className="text-brand-ink mt-2 font-serif text-2xl font-semibold md:text-[32px]">
            {t('categoriesHeadline')}
          </h2>
        </div>
        <Link
          href="/catalog"
          className="text-primary border-primary border-b-[1.5px] pb-0.5 text-[13.5px] font-semibold"
        >
          {t('viewAllLong')}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/catalog?category=${c.slug}`}
            className="group flex flex-col gap-2.5"
          >
            <div className="bg-soft relative aspect-square overflow-hidden rounded-2xl">
              <Image
                src={productImage(c.imageSeed, 400)}
                alt={pickLocale(c.name, locale)}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="text-center">
              <div className="text-brand-ink text-[13.5px] font-bold">
                {pickLocale(c.name, locale)}
              </div>
              <div className="text-muted-foreground mt-0.5 text-[11.5px]">
                {t('productCount', {
                  count: c.productCount.toLocaleString('en-US').replace(/,/g, ' '),
                })}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
