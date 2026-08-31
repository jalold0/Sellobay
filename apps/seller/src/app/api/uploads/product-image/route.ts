// POST /api/uploads/product-image — sotuvchi mahsulot rasmini yuklaydi.
//
// Rasm OCHIQ saqlanadi: u saytda, mobil ilovada va qidiruv natijalarida
// ko'rinishi kerak. Javobda to'g'ridan-to'g'ri manzil qaytadi va mahsulot
// saqlanganda `imageUrls` ichida yuboriladi.
//
// Kirish faqat ACTIVE sotuvchiga ochiq — /api/products dagi tekshiruv bilan bir xil.

import {
  FOLDER,
  MAX_PRODUCT_IMAGE_BYTES,
  StorageNotConfiguredError,
  checkImageBytes,
  putPublicImage,
} from '@ecom/storage';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Sotuvchi bo'yicha oddiy chegara — noto'g'ri yozilgan klient tsiklda yuklab
// kvotani yeb qo'ymasligi uchun. Hisoblagich shu instans xotirasida turadi
// (web'dagi rate-limit fallback bilan bir xil baseline); umumiy hisoblagich
// kerak bo'lsa Upstash'ga o'tkaziladi.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const uploads = new Map<string, { count: number; resetAt: number }>();

function withinLimit(sellerId: string): boolean {
  const now = Date.now();
  const entry = uploads.get(sellerId);
  if (!entry || entry.resetAt <= now) {
    uploads.set(sellerId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const seller = await prisma.seller.findUnique({ where: { ownerUserId: user.id } });
  if (!seller) {
    return apiError(403, 'NO_SELLER_PROFILE', "Sotuvchi profilingiz yo'q.");
  }
  if (seller.status !== 'ACTIVE') {
    return apiError(403, 'SELLER_NOT_ACTIVE', 'Sotuvchi hisobingiz hali tasdiqlanmagan.');
  }
  if (!withinLimit(seller.id)) {
    return apiError(
      429,
      'RATE_LIMIT',
      "Juda ko'p rasm yuklandi. Bir daqiqadan keyin urinib ko`ring.",
    );
  }

  let file: unknown;
  try {
    const form = await req.formData();
    file = form.get('file');
  } catch {
    return apiError(400, 'VALIDATION', 'Fayl yuborilmadi');
  }
  if (!(file instanceof File)) {
    return apiError(400, 'VALIDATION', 'Fayl yuborilmadi');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkImageBytes(bytes, MAX_PRODUCT_IMAGE_BYTES);
  if (!check.ok) return apiError(400, 'VALIDATION', check.error);

  try {
    const stored = await putPublicImage(FOLDER.productImages, bytes, check.image);
    return apiOk({ url: stored.url });
  } catch (e) {
    if (e instanceof StorageNotConfiguredError) {
      // Konfiguratsiya xatosi — sotuvchi aybdor emas, shuning uchun aniq aytamiz.
      console.error('[uploads/product-image]', e.message);
      return apiError(
        503,
        'STORAGE_UNAVAILABLE',
        'Rasm yuklash vaqtincha ishlamayapti. Administratorga xabar bering.',
      );
    }
    throw e;
  }
}
