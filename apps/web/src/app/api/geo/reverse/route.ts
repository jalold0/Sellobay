// GET /api/geo/reverse?lat=&lng=&lang= — xaritadagi nuqtaning manzil matni.
//
// Web checkout va profil manzillari xaritasi uchun. Mantiq va manba
// (OpenStreetMap Nominatim) `@/lib/geo-server` da.

import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { reverseGeocode } from '@/lib/geo-server';
import { enforceRateLimit } from '@/lib/rate-limit';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  // O'zbekiston atrofi — boshqa joy so'ralmaydi (xizmatni begona yuklamadan himoya).
  lat: z.coerce.number().min(37).max(46),
  lng: z.coerce.number().min(55).max(74),
  lang: z.enum(['uz', 'ru', 'en']).default('uz'),
});

export async function GET(req: NextRequest) {
  // Pin surilganda klient kutib turib so'raydi; daqiqasiga 30 tadan ortig'i — suiiste'mol.
  const limited = await enforceRateLimit(req, 'geo-reverse', { limit: 30, windowSec: 60 });
  if (limited) return limited;

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return apiError(400, 'VALIDATION', 'Nuqta O`zbekiston hududida emas');

  const { lat, lng, lang } = parsed.data;
  return apiOk(await reverseGeocode(lat, lng, lang));
}
