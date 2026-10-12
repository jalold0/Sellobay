// Rate limiting — sezgir endpointlar uchun (login/OTP/register/orders). Web, admin va seller
// ilovalari shu bitta hisoblagichdan foydalanadi (ilgari faqat web'da edi — admin va seller
// login'ida urinishlar cheklanmagan edi, audit O8).
// Backend tanlovi avtomatik:
//   • UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN berilgan bo'lsa —
//     Upstash Redis REST (serverless instanslar orasida UMUMIY hisoblagich).
//   • Aks holda — in-memory Map (har bir warm lambda instansi o'zicha;
//     burst himoyasi uchun yetarli baseline, prod'da Upstash tavsiya).
// Fixed-window algoritm: kalit = nom:IP:oynaBoshi. Qo'shimcha paket YO'Q
// (Upstash oddiy fetch orqali chaqiriladi). HTTP javobini ilova o'zi quradi.

export interface LimitConfig {
  /** Oyna ichida ruxsat etilgan maksimal so'rovlar. */
  limit: number;
  /** Oyna uzunligi (soniya). */
  windowSec: number;
}

export interface LimitResult {
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
export function clientIpFromHeaders(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return headers.get('x-real-ip') ?? 'unknown';
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
