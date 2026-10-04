'use client';

// Sharh yozish — mahsulot sahifasidagi «Sharhlar» tabida.
//
// Yozish huquqini SERVER aytadi (`/api/products/{slug}/reviews` dagi
// `eligibility`): mahsulot yetkazib olinganmi va avval sharh
// yozilganmi. Qoidani bu yerda takrorlasak, ikkisi vaqt o'tib ajralib
// ketardi va foydalanuvchi serverda rad etiladigan tugmani bosardi.
//
// Huquq KLIENTDA so'raladi: mahsulot sahifasi keshlanadi
// (`unstable_cache`), huquq esa har foydalanuvchiga boshqacha.

import { Button, Textarea, toast } from '@ecom/ui';
import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface Eligibility {
  canReview: boolean;
  hasPurchased: boolean;
  existingReviewId: string | null;
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

interface Props {
  productId: string;
  slug: string;
}

export function ReviewForm({ productId, slug }: Props) {
  const t = useTranslations('reviews');
  // Hook'lar ERTA qaytishlardan OLDIN chaqirilishi shart.
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [eligibility, setEligibility] = React.useState<Eligibility | null>(null);
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState(0);
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    fetch(`/api/products/${slug}/reviews?limit=1`, { credentials: 'same-origin' })
      .then((r) => r.json() as Promise<ApiResult<{ eligibility: Eligibility | null }>>)
      .then((json) => {
        if (active && json.success && json.data) setEligibility(json.data.eligibility);
      })
      .catch(() => {
        // Huquq aniqlanmasa tugma ko'rsatilmaydi — taxmin qilmaymiz.
      });
    return () => {
      active = false;
    };
  }, [slug]);

  // Mehmon yoki sotib olmagan mijoz — hech narsa ko'rsatilmaydi.
  if (!eligibility) return null;

  if (!eligibility.canReview) {
    return eligibility.existingReviewId ? (
      <p className="text-muted-foreground text-xs">{t('alreadyWrote')}</p>
    ) : null;
  }

  const submit = async () => {
    if (rating < 1) {
      toast({ title: t('ratingRequired'), variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productId,
          rating,
          title: title.trim() || null,
          body: body.trim() || null,
        }),
      });
      const json = (await res.json()) as ApiResult<unknown>;
      if (!json.success) {
        toast({ title: json.error?.message ?? 'Xato', variant: 'destructive' });
        return;
      }
      toast({ title: t('sent'), variant: 'success' });
      setOpen(false);
      setEligibility({ canReview: false, hasPurchased: true, existingReviewId: 'new' });
      // Sharhlar ro'yxati va yulduzcha SERVERDA chiziladi — sahifani
      // qayta so'raymiz (baho ham qayta hisoblangan).
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t('formTitle')}
      </Button>
    );
  }

  return (
    <div className="bg-card space-y-3 rounded-xl border p-4">
      <div>
        <div className="text-sm font-semibold">{t('ratingLabel')}</div>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              aria-label={`${i}`}
              className="p-1"
            >
              <Star
                size={26}
                className={
                  i <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'
                }
              />
            </button>
          ))}
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        placeholder={t('titleLabel')}
        className="border-border w-full rounded-lg border px-3 py-2 text-sm"
      />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        rows={4}
        placeholder={t('bodyLabel')}
      />

      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={busy}>
          {t('submit')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
          {tCommon('cancel')}
        </Button>
      </div>
    </div>
  );
}
