// GET /api/orders/receipt-image?p=<pathname> — to'lov chekini ko'rsatish.
//
// Chek Vercel Blob'da YOPIQ (private) saqlanadi, ya'ni uning to'g'ridan-to'g'ri
// internet manzili yo'q. Rasmni faqat shu route uzatadi va u har so'rovda admin
// sessiyasini tekshiradi. Shu sababli chek havolasi tasodifan tarqalib ketsa
// ham (skrinshot, log, brauzer tarixi) begona odam uni ocha olmaydi.

import { readPrivateImage, StorageNotConfiguredError } from '@ecom/storage';

import { apiError } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');
  if (!user.roles?.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r))) {
    return apiError(403, 'FORBIDDEN', "Ruxsat yo'q (faqat admin)");
  }

  const pathname = req.nextUrl.searchParams.get('p');
  // `p` klientdan keladi, shuning uchun u faqat cheklar papkasini ko'rsata olishi
  // kerak — aks holda do'kondagi boshqa fayllarni ham shu route orqali o'qish
  // mumkin bo'lib qolardi.
  if (!pathname || !pathname.startsWith('receipts/') || pathname.includes('..')) {
    return apiError(400, 'VALIDATION', "Noto'g'ri manzil");
  }

  let image;
  try {
    image = await readPrivateImage(pathname);
  } catch (e) {
    if (e instanceof StorageNotConfiguredError) {
      console.error('[orders/receipt-image]', e.message);
      return apiError(503, 'STORAGE_UNAVAILABLE', 'Fayl saqlash sozlanmagan');
    }
    throw e;
  }
  if (!image) return apiError(404, 'NOT_FOUND', 'Chek topilmadi');

  return new Response(image.stream, {
    headers: {
      'Content-Type': image.contentType,
      'Content-Length': String(image.size),
      // Chek — shaxsiy hujjat: proxy va CDN keshlamasin.
      'Cache-Control': 'private, no-store',
      // Brauzer turini o'zi taxmin qilib HTML deb ochib yubormasin.
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
