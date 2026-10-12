// Rate limiting — hisoblagich `@ecom/auth` da (web, admin, seller uchun umumiy);
// bu yerda faqat web'ning 429 javobi.

import { checkRateLimit, clientIpFromHeaders, type LimitConfig } from '@ecom/auth';

import { apiError } from '@/lib/auth/errors';

import type { NextRequest } from 'next/server';

/** So'rov IP'sini aniqlash (Vercel: x-forwarded-for birinchi qiymat). */
export function clientIp(req: NextRequest): string {
  return clientIpFromHeaders(req.headers);
}

/**
 * Route handler boshida chaqiriladi. Limit oshsa — 429 Response qaytaradi
 * (Retry-After header bilan), aks holda null (davom etish mumkin).
 *
 *   const limited = await enforceRateLimit(req, 'login', { limit: 10, windowSec: 60 });
 *   if (limited) return limited;
 */
export async function enforceRateLimit(
  req: NextRequest,
  name: string,
  cfg: LimitConfig,
  extraId?: string,
): Promise<Response | null> {
  const id = extraId ? `${clientIp(req)}:${extraId}` : clientIp(req);
  const result = await checkRateLimit(name, id, cfg);
  if (result.ok) return null;
  const res = apiError(
    429,
    'RATE_LIMIT',
    `Juda ko'p urinish. ${result.retryAfterSec} soniyadan keyin qayta urinib ko'ring.`,
  );
  res.headers.set('Retry-After', String(result.retryAfterSec));
  return res;
}
