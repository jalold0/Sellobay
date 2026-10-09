// FCM HTTP v1 mijozi.
//
// Service account (Firebase → Project settings → Service accounts) JSON'i
// `FIREBASE_SERVICE_ACCOUNT` env'ida turadi (xom JSON yoki base64). Bu MAXFIY
// kalit: kodga, repoga va logga tushmasligi kerak.
//
// Sozlanmagan bo'lsa hamma narsa jimgina o'tkazib yuboriladi — push
// ixtiyoriy va buyurtma oqimini hech qachon buzmasligi kerak.

import { importPKCS8, SignJWT } from 'jose';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TIMEOUT_MS = 4000;

export interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

export interface PushMessage {
  title: string;
  body: string;
  /** FCM `data` — FAQAT satr qiymatlari. */
  data?: Record<string, string>;
}

/** `ok` — yuborildi; `invalid-token` — token o'lik (o'chirish kerak); `error` — vaqtinchalik. */
export type SendResult = 'ok' | 'invalid-token' | 'error';

/** Env qiymatini o'qiydi: xom JSON yoki base64. Yaroqsiz bo'lsa `null`. */
export function parseServiceAccount(raw: string | undefined): ServiceAccount | null {
  if (!raw) return null;
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  try {
    const parsed = JSON.parse(text) as Partial<ServiceAccount>;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
    // Vercel env'da satr oxirlari `\n` matni bo'lib kelishi mumkin.
    return {
      project_id: parsed.project_id,
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, '\n'),
    };
  } catch {
    return null;
  }
}

export interface FcmClient {
  send(token: string, message: PushMessage): Promise<SendResult>;
}

export function createFcmClient(
  account: ServiceAccount,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): FcmClient {
  let cached: { value: string; expiresAt: number } | null = null;

  async function accessToken(): Promise<string> {
    if (cached && cached.expiresAt - 60_000 > now()) return cached.value;

    const key = await importPKCS8(account.private_key, 'RS256');
    const iat = Math.floor(now() / 1000);
    const assertion = await new SignJWT({ scope: SCOPE })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuer(account.client_email)
      .setSubject(account.client_email)
      .setAudience(TOKEN_URL)
      .setIssuedAt(iat)
      .setExpirationTime(iat + 3600)
      .sign(key);

    const res = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`FCM auth ${res.status}`);
    const json = (await res.json()) as { access_token: string; expires_in: number };
    cached = { value: json.access_token, expiresAt: now() + json.expires_in * 1000 };
    return cached.value;
  }

  return {
    async send(token, message) {
      try {
        const res = await fetchImpl(
          `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${await accessToken()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token,
                notification: { title: message.title, body: message.body },
                data: message.data,
                android: { priority: 'HIGH' },
              },
            }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
          },
        );
        if (res.ok) return 'ok';
        // 404 UNREGISTERED — token o'lik; 400 INVALID_ARGUMENT — token shakli noto'g'ri.
        // Boshqa 400'lar (masalan, noto'g'ri `data`) tokenni o'chirmasligi kerak.
        const detail = (await res.text().catch(() => '')).toUpperCase();
        if (res.status === 404 || detail.includes('UNREGISTERED')) return 'invalid-token';
        if (res.status === 400 && detail.includes('REGISTRATION TOKEN')) return 'invalid-token';
        return 'error';
      } catch {
        return 'error';
      }
    },
  };
}
