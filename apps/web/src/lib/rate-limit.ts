// Rate limiting — sezgir endpointlar uchun (login/OTP/register/orders).
// Backend tanlovi avtomatik:
//   • UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN berilgan bo'lsa —
//     Upstash Redis REST (serverless instanslar orasida UMUMIY hisoblagich).
//   • Aks holda — in-memory Map (har bir warm lambda instansi o'zicha;
//     burst himoyasi uchun yetarli baseline, prod'da Upstash tavsiya).
// Fixed-window algoritm: kalit = nom:IP:oynaBoshi. Qo'shimcha paket YO'Q
// (Upstash oddiy fetch orqali chaqiriladi).

import type { NextRequest } from 'next/server';

import { apiError } from '@/lib/auth/errors';

interface LimitConfig {
  /** Oyna ichida ruxsat etilgan maksimal so'rovlar. */
  limit: number;
  /** Oyna uzunligi (soniya). */
  windowSec: number;
}

interface LimitResult {
  ok: boolean;
  retryAfterSec: number;
}

// ─── In-memory backend (fallback) ──────────────────────────────────────
const memoryCounters = new Map<string, { count: number; expiresAt: number }>();

function memoryIncr(key: string, windowSec: number): number {
  const now = Date.now();
  // Yengil tozalash — har chaqiruvda eskirganlarni o'chirish (Map kichik qoladi)
  if (memoryCounters.size > 5_000) {
    for (const [k, v] of memoryCounters) {
      if (v.expiresAt <= now) memoryCounters.delete(k);
    }
  }
  const entry = memoryCounters.get(key);
  if (!entry || entry.expiresAt <= now) {
    memoryCounters.set(key, { count: 1, expiresAt: now + windowSec * 1000 });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

// ─── Upstash Redis REST backend ────────────────────────────────────────
function upstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

/** INCR + birinchi bo'lsa EXPIRE (pipeline, bitta HTTP chaqiruv). */
async function upstashIncr(key: string, windowSec: number): Promise<number | null> {
  const cfg = upstashConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(windowSec), 'NX'],
      ]),
      // Redis javob bermasa so'rovni bloklab qo'ymaslik uchun qisqa timeout
      signal: AbortSignal.timeout(1_500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ result?: number }>;
    const count = data?.[0]?.result;
    return typeof count === 'number' ? count : null;
  } catch {
    // Redis ishlamasa — fail-open (limiter xizmatni o'chirmasligi kerak)
    return null;
  }
}

// ─── Umumiy API ────────────────────────────────────────────────────────

/** So'rov IP'sini aniqlash (Vercel: x-forwarded-for birinchi qiymat). */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Fixed-window limit tekshiruvi. `name` — endpoint nomi (masalan 'login'),
 * `id` — odatda IP (kerak bo'lsa telefon/email qo'shib berish mumkin).
 */
export async function checkRateLimit(
  name: string,
  id: string,
  cfg: LimitConfig,
): Promise<LimitResult> {
  const windowStart = Math.floor(Date.now() / (cfg.windowSec * 1000));
  const key = `rl:${name}:${id}:${windowStart}`;

  const redisCount = await upstashIncr(key, cfg.windowSec);
  const count = redisCount ?? memoryIncr(key, cfg.windowSec);

  if (count <= cfg.limit) return { ok: true, retryAfterSec: 0 };
  const retryAfterSec = cfg.windowSec - (Math.floor(Date.now() / 1000) % cfg.windowSec);
  return { ok: false, retryAfterSec };
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
