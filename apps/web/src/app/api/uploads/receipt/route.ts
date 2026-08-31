// POST /api/uploads/receipt — to'lov chekini yuklash (web + mobile uchun umumiy).
//
// Chek YOPIQ saqlanadi: javobda ochiq havola qaytmaydi, faqat ichki yo'l
// (pathname). Buyurtma yaratishda o'sha yo'l yuboriladi va uni keyinchalik
// faqat admin, sessiyasi tekshirilgan holda, ko'ra oladi.
//
// Bu endpoint mehmon (login qilmagan) mijozga ham ochiq — checkout login talab
// qilmaydi. Shuning uchun himoya rate-limit orqali beriladi.

import {
  FOLDER,
  MAX_RECEIPT_BYTES,
  StorageNotConfiguredError,
  checkImageBytes,
  putPrivateImage,
} from '@ecom/storage';
import * as Sentry from '@sentry/nextjs';

import { apiError, apiOk } from '@/lib/auth/errors';
import { enforceRateLimit } from '@/lib/rate-limit';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Bitta IP'dan 10 daqiqada 20 ta chek — normal xarid uchun ortig'i bilan yetadi.
  const limited = await enforceRateLimit(req, 'upload-receipt', { limit: 20, windowSec: 600 });
  if (limited) return limited;

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
  const check = checkImageBytes(bytes, MAX_RECEIPT_BYTES);
  if (!check.ok) return apiError(400, 'VALIDATION', check.error);

  try {
    const stored = await putPrivateImage(FOLDER.receipts, bytes, check.image);
    return apiOk({ pathname: stored.pathname });
  } catch (e) {
    // Saqlash sozlanmagani — bu bizning konfiguratsiya xatomiz, mijozning emas.
    // Mijozga tushunarli xabar, bizga esa Sentry'ga signal ketadi (jim qolmaydi).
    if (e instanceof StorageNotConfiguredError) {
      Sentry.captureException(e);
      return apiError(
        503,
        'STORAGE_UNAVAILABLE',
        'Rasm yuklash vaqtincha ishlamayapti. Birozdan keyin urinib ko`ring.',
      );
    }
    throw e;
  }
}
