// POST /api/uploads/delivery-proof — yetkazib berish isboti surati.
//
// Chek yuklashdan (`/api/uploads/receipt`) ikki jihati bilan farq qiladi:
//
//  1. Mehmonga OCHIQ EMAS. Chekni login qilmagan mijoz ham yuboradi
//     (checkout kirish talab qilmaydi), bu yerda esa yuklovchi doim
//     tizimga kirgan kuryer. Shuning uchun himoya rate-limit emas,
//     rolga asoslangan: `assertCourier`.
//  2. Surat YOPIQ saqlanadi va javobda ochiq havola qaytmaydi — faqat
//     ichki yo'l. Unda mijozning uyi, eshigi, ba'zan o'zi ham tushadi;
//     ochiq manzil bo'lsa, havolani bilgan har kim ko'rardi.
//
// Yo'l `POST /api/courier/deliveries/[id]/status` ga `proofPhotoUrl`
// sifatida yuboriladi va o'sha yerda yetkazishga biriktiriladi.

import {
  FOLDER,
  MAX_DELIVERY_PROOF_BYTES,
  StorageNotConfiguredError,
  checkImageBytes,
  putPrivateImage,
} from '@ecom/storage';
import * as Sentry from '@sentry/nextjs';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { assertCourier, CourierError } from '@/lib/courier-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  try {
    assertCourier(user.roles);
  } catch (e) {
    if (e instanceof CourierError) return apiError(e.status, e.code, e.message);
    throw e;
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
  const check = checkImageBytes(bytes, MAX_DELIVERY_PROOF_BYTES);
  if (!check.ok) return apiError(400, 'VALIDATION', check.error);

  try {
    const stored = await putPrivateImage(FOLDER.deliveryProofs, bytes, check.image);
    return apiOk({ pathname: stored.pathname });
  } catch (e) {
    // Saqlash sozlanmagani — bizning konfiguratsiya xatomiz, kuryerning emas.
    if (e instanceof StorageNotConfiguredError) {
      Sentry.captureException(e);
      return apiError(
        503,
        'STORAGE_UNAVAILABLE',
        'Surat yuklash vaqtincha ishlamayapti. Birozdan keyin urinib ko`ring.',
      );
    }
    throw e;
  }
}
