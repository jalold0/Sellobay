'use client';

import { downscaleImageFile } from '@ecom/storage/browser';
import { Button, toast } from '@ecom/ui';
import { ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import * as React from 'react';

interface Props {
  /** Yuklangan rasm manzillari. Birinchisi — asosiy rasm. */
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
}

async function uploadProductImage(file: File): Promise<string> {
  // Katalogda rasm eng katta 1600px ko'rsatiladi — undan kattasi foyda bermaydi,
  // lekin yuklashni sekinlashtiradi.
  const prepared = await downscaleImageFile(file, { maxDim: 1600, fileName: 'mahsulot.jpg' });
  const body = new FormData();
  body.append('file', prepared);

  const res = await fetch('/api/uploads/product-image', {
    method: 'POST',
    credentials: 'same-origin',
    body,
  });
  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: { url?: string };
    error?: { message?: string };
  } | null;

  if (!res.ok || !json?.success || !json.data?.url) {
    throw new Error(json?.error?.message ?? 'Rasm yuklanmadi');
  }
  return json.data.url;
}

/**
 * Mahsulot rasmlarini yuklash.
 *
 * Ilgari bu yerda 4 ta URL maydoni turardi — ya'ni sotuvchi rasmni avval
 * boshqa saytga joylab, havolasini nusxalashi kerak edi. Real sotuvchi buni
 * qilmaydi, shuning uchun endi telefon yoki kompyuterdan to'g'ridan-to'g'ri
 * fayl tanlanadi.
 */
export function ProductImageUploader({ value, onChange, max = 4 }: Props) {
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const remaining = max - value.length;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const picked = Array.from(files).slice(0, remaining);
    if (picked.length < files.length) {
      toast({ title: `Faqat ${max} tagacha rasm qo'shish mumkin`, variant: 'warning' });
    }

    setBusy(true);
    const uploaded: string[] = [];
    for (const file of picked) {
      try {
        uploaded.push(await uploadProductImage(file));
      } catch (e) {
        // Har bir fayl alohida: bittasi tushmasa qolganlari baribir yuklanadi.
        toast({
          title: e instanceof Error ? e.message : 'Rasm yuklanmadi',
          description: file.name,
          variant: 'destructive',
        });
      }
    }
    setBusy(false);
    if (uploaded.length > 0) onChange([...value, ...uploaded]);
  };

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  /** Tanlangan rasmni birinchi o'ringa — ya'ni asosiy rasmga aylantiradi. */
  const makePrimary = (index: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    if (item) next.unshift(item);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-[11px]">
        Telefon yoki kompyuterdan rasm tanlang. Birinchi rasm — <strong>asosiy</strong>: katalogda
        va qidiruvda o&apos;sha ko&apos;rinadi. JPEG, PNG yoki WEBP, {max} tagacha.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {value.map((url, i) => (
          <div
            key={url}
            className={`group relative aspect-square overflow-hidden rounded-lg border-2 ${
              i === 0 ? 'border-primary/60' : 'border-border'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Rasm ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="bg-primary absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[9px] font-semibold text-white">
                Asosiy
              </span>
            )}
            <div className="absolute inset-x-1.5 bottom-1.5 flex gap-1 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => makePrimary(i)}
                  className="flex-1 rounded bg-black/70 px-1 py-1 text-[9px] font-medium text-white hover:bg-black"
                  title="Asosiy qilish"
                >
                  <Star className="mx-auto h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                className="flex-1 rounded bg-black/70 px-1 py-1 text-[9px] font-medium text-white hover:bg-red-600"
                title="O`chirish"
              >
                <Trash2 className="mx-auto h-3 w-3" />
              </button>
            </div>
          </div>
        ))}

        {remaining > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="border-border hover:border-primary/60 text-muted-foreground flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed text-[10px] transition disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Yuklanmoqda...
              </>
            ) : (
              <>
                <ImagePlus className="h-5 w-5" />
                Rasm qo&apos;shish
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          // Bir xil faylni qayta tanlash ham ishlashi uchun maydonni tozalaymiz.
          e.target.value = '';
        }}
      />

      {value.length === 0 && !busy && (
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <ImagePlus className="mr-2 h-4 w-4" /> Rasm tanlash
        </Button>
      )}
    </div>
  );
}
