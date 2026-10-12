// Login urinishlarini cheklash (audit O8). Hisoblagich `@ecom/auth` da — web bilan umumiy.

import { checkRateLimit, clientIpFromHeaders, type LimitConfig } from '@ecom/auth';

import { apiError } from '@/lib/auth/errors';

import type { NextRequest } from 'next/server';

/** Limit oshsa — 429 javob (Retry-After bilan), aks holda null. */
export async function enforceRateLimit(
  req: NextRequest,
  name: string,
  cfg: LimitConfig,
  extraId?: string,
): Promise<Response | null> {
  const ip = clientIpFromHeaders(req.headers);
  const result = await checkRateLimit(`admin:${name}`, extraId ? `${ip}:${extraId}` : ip, cfg);
  if (result.ok) return null;
  const res = apiError(
    429,
    'RATE_LIMIT',
    `Juda ko'p urinish. ${result.retryAfterSec} soniyadan keyin qayta urinib ko'ring.`,
  );
  res.headers.set('Retry-After', String(result.retryAfterSec));
  return res;
}
