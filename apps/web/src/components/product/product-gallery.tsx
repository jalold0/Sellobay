'use client';

// Mahsulot galereyasi: asosiy rasm + thumbnail'lar + chegirma badge + wishlist tugmasi.
// activeImageIdx faqat shu yerda ishlatilgani uchun lokal holat.
import { Badge } from '@ecom/ui';
import { Heart } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { productImage } from '../../lib/mock-data';
import { type ProductFullDetail } from '../../lib/product-details';

interface Props {
  gallery: ProductFullDetail['gallery'];
  name: string;
  imageSeed: string;
  discount: number;
  wishlistHas: boolean;
  onToggleWishlist: () => void;
}

export function ProductGallery({
  gallery,
  name,
  imageSeed,
  discount,
  wishlistHas,
  onToggleWishlist,
}: Props) {
  const t = useTranslations('product');
  const [activeImageIdx, setActiveImageIdx] = React.useState(0);

  return (
    <div className="space-y-3">
      <div className="bg-muted relative aspect-square overflow-hidden rounded-2xl border">
        <Image
          src={
            gallery[activeImageIdx]?.url ??
            productImage(gallery[activeImageIdx]?.seed ?? imageSeed, 800)
          }
          alt={name}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 600px"
          className="object-cover"
        />
        {discount > 0 && (
          <Badge className="absolute left-3 top-3 rounded-md bg-rose-600 text-white shadow hover:bg-rose-600">
            −{discount}%
          </Badge>
        )}
        <button
          type="button"
          onClick={onToggleWishlist}
          className="text-foreground absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow-sm transition hover:bg-white"
          aria-label={t('addToWishlist')}
        >
          <Heart size={18} className={wishlistHas ? 'fill-rose-500 text-rose-500' : ''} />
        </button>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {gallery.slice(0, 5).map((g, i) => (
          <button
            key={g.seed}
            type="button"
            onClick={() => setActiveImageIdx(i)}
            className={`relative aspect-square overflow-hidden rounded-lg border-2 transition ${
              i === activeImageIdx ? 'border-primary' : 'hover:border-input border-transparent'
            }`}
            aria-label={`${t('description')} ${i + 1}`}
          >
            <Image
              src={g.url ?? productImage(g.seed, 200)}
              alt=""
              fill
              sizes="120px"
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
