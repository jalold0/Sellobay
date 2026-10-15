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

import { downscaleImageFile } from '@ecom/storage/browser';
import { Button, Textarea, toast } from '@ecom/ui';
import { ImagePlus, Loader2, Star, X } from 'lucide-react';
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

/** Bitta sharhga eng ko'pi bilan nechta surat (server ham shuni tekshiradi). */
const MAX_PHOTOS = 5;

interface Props {
  productId: string;
  slug: string;
  /** Sharh yuborilgach — ro'yxatni qayta yuklash uchun. */
  onSubmitted?: () => void;
}

export function ReviewForm({ productId, slug, onSubmitted }: Props) {
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
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);

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
          images: photos,
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
      onSubmitted?.();
    } finally {
      setBusy(false);
    }
  };

  // Surat darhol yuklanadi — yuborishda faqat manzillar ketadi.
  const addPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = MAX_PHOTOS - photos.length;
    const picked = Array.from(files).slice(0, Math.max(room, 0));
    if (picked.length === 0) return;
    setUploading(true);
    try {
      for (const original of picked) {
        const file = await downscaleImageFile(original, { fileName: 'sharh.jpg' });
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/uploads/review-image', {
          method: 'POST',
          credentials: 'same-origin',
          body: form,
        });
        const json = (await res.json().catch(() => null)) as ApiResult<{ url: string }> | null;
        if (!json?.success || !json.data) {
          toast({ title: json?.error?.message ?? t('photoUploadFailed'), variant: 'destructive' });
          break;
        }
        const url = json.data.url;
        setPhotos((prev) => (prev.length < MAX_PHOTOS ? [...prev, url] : prev));
      }
    } catch {
      toast({ title: t('photoUploadFailed'), variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
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

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {photos.map((src, i) => (
            <div key={src} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-16 w-16 rounded-lg border object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((prev) => prev.filter((p) => p !== src))}
                aria-label={`${t('removePhoto')} ${i + 1}`}
                className="bg-foreground text-background absolute -right-1.5 -top-1.5 rounded-full p-0.5"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading || busy}
              className="border-border text-muted-foreground hover:border-primary/40 hover:text-foreground flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed text-[10px] disabled:opacity-50"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
              {t('addPhotos')}
            </button>
          )}
        </div>
        <p className="text-muted-foreground text-[11px]">{t('photosHint')}</p>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => void addPhotos(e.target.files)}
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={busy || uploading}>
          {t('submit')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
          {tCommon('cancel')}
        </Button>
      </div>
    </div>
  );
}
