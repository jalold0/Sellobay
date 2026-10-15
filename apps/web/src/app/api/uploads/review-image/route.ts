// POST /api/uploads/review-image — sharhga surat yuklash (web + mobil).
//
// Surat OCHIQ saqlanadi: sharh bilan hamma ko'radi. Javobda manzil
// qaytadi va sharh yozilganda `images` ichida yuboriladi; server u
// manzil bizning `reviews/` papkamizdan ekanini tekshiradi.
//
// Faqat tizimga kirgan mijoz yuklaydi (sharhni ham faqat u yozadi).
// Himoya — IP bo'yicha rate-limit.

import {
  FOLDER,
  MAX_REVIEW_IMAGE_BYTES,
  StorageNotConfiguredError,
  checkImageBytes,
  putPublicImage,
} from '@ecom/storage';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { enforceRateLimit } from '@/lib/rate-limit';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  // 10 daqiqada 20 ta surat — bir nechta sharh uchun ham yetadi.
  const limited = await enforceRateLimit(req, 'upload-review-image', { limit: 20, windowSec: 600 });
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
  const check = checkImageBytes(bytes, MAX_REVIEW_IMAGE_BYTES);
  if (!check.ok) return apiError(400, 'VALIDATION', check.error);

  try {
    const stored = await putPublicImage(FOLDER.reviewImages, bytes, check.image);
    return apiOk({ url: stored.url });
  } catch (e) {
    if (e instanceof StorageNotConfiguredError) {
      console.error('[uploads/review-image]', e.message);
      return apiError(
        503,
        'STORAGE_UNAVAILABLE',
        'Surat yuklash vaqtincha ishlamayapti. Sharhni suratsiz yuboring.',
      );
    }
    throw e;
  }
}
