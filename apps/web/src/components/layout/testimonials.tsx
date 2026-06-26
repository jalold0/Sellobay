import { SectionTitle } from '@ecom/ui';
import { Quote, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

interface Testimonial {
  key: 'madina' | 'akmal' | 'nilufar';
  avatar: string;
  rating: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    key: 'madina',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=85&auto=format&fit=crop',
    rating: 5,
  },
  {
    key: 'akmal',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=85&auto=format&fit=crop',
    rating: 5,
  },
  {
    key: 'nilufar',
    avatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=85&auto=format&fit=crop',
    rating: 5,
  },
];

export function Testimonials() {
  const t = useTranslations('testimonials');

  return (
    <section className="space-y-6">
      <SectionTitle title={t('title')} description={t('subtitle')} />
      <div className="grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((item) => {
          const name = t(`items.${item.key}.name`);
          return (
            <article
              key={item.key}
              className="bg-card border-border relative flex flex-col rounded-2xl border p-6 transition-shadow hover:shadow-lg"
            >
              <Quote
                className="text-brand-bordeaux/15 absolute right-5 top-5 h-12 w-12"
                strokeWidth={2.5}
              />

              <div className="flex gap-0.5">
                {Array.from({ length: item.rating }).map((_, i) => (
                  <Star key={i} size={14} className="fill-brand-gold text-brand-gold" />
                ))}
              </div>

              <p className="text-foreground relative z-10 mt-4 flex-1 text-sm leading-relaxed">
                {t(`items.${item.key}.quote`)}
              </p>

              <div className="border-border mt-5 flex items-center gap-3 border-t pt-4">
                <div className="ring-brand-gold/20 relative h-11 w-11 overflow-hidden rounded-full ring-2">
                  <Image src={item.avatar} alt={name} fill sizes="44px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="text-foreground text-sm font-semibold">{name}</div>
                  <div className="text-muted-foreground text-[11px]">
                    {t(`items.${item.key}.role`)}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
