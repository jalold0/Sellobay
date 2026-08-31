// Chekni serverga yuklash.
//
// Rasm avval brauzerda kichraytiriladi (telefon skrinshoti 5-8 MB bo'lishi
// mumkin), so'ng /api/uploads/receipt ga yuboriladi. Kichraytirish mantiqi
// @ecom/storage/browser da — sotuvchi paneli ham aynan shuni ishlatadi.

import { downscaleImageFile } from '@ecom/storage/browser';

export interface ReceiptUpload {
  /** Bazaga yoziladigan ichki yo'l — buyurtma bilan birga yuboriladi. */
  pathname: string;
  /** Faqat shu brauzerda ko'rsatish uchun manzil (serverga bog'liq emas). */
  previewUrl: string;
}

/**
 * Chekni yuklaydi. Chek YOPIQ saqlangani uchun javobda ochiq havola emas,
 * ichki yo'l qaytadi; ko'rsatish uchun lokal `blob:` manzili ishlatiladi.
 */
export async function uploadReceipt(file: File): Promise<ReceiptUpload> {
  // Chekdagi raqamlar o'qilishi kifoya — 1400px yetarli.
  const prepared = await downscaleImageFile(file, { maxDim: 1400, fileName: 'chek.jpg' });
  const body = new FormData();
  body.append('file', prepared);

  const res = await fetch('/api/uploads/receipt', {
    method: 'POST',
    credentials: 'same-origin',
    body,
  });
  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: { pathname?: string };
    error?: { message?: string };
  } | null;

  if (!res.ok || !json?.success || !json.data?.pathname) {
    throw new Error(json?.error?.message ?? 'Chek yuklanmadi');
  }
  return { pathname: json.data.pathname, previewUrl: URL.createObjectURL(prepared) };
}
