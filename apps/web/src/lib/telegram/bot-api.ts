// Telegram Bot API — faqat kerakli qismi (oddiy fetch, qo'shimcha paket yo'q).
//
// Sozlash (ADR 0018): TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET.
// Webhook bir marta o'rnatiladi (docs/DEPLOYMENT.md, «Telegram bot»).

export function telegramConfig(): { token: string; username: string; secret: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const username = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, '');
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!token || !username || !secret) return null;
  // Telegram `secret_token` ga faqat A-Z a-z 0-9 _ - ruxsat beradi; boshqa belgi bilan webhook
  // o'rnatilmaydi va bot jim qoladi — yarim ishlaydigan tugma ko'rsatgandan ko'ra o'chiq turgani yaxshi.
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
    console.error('[telegram] TELEGRAM_WEBHOOK_SECRET faqat A-Z a-z 0-9 _ - bo`lishi kerak');
    return null;
  }
  return { token, username, secret };
}

/** Telegram orqali kirish yoqilganmi (uchala ENV ham bor). */
export function telegramLoginAvailable(): boolean {
  return telegramConfig() !== null;
}

export type ReplyMarkup =
  | {
      keyboard: { text: string; request_contact?: boolean }[][];
      resize_keyboard?: boolean;
      one_time_keyboard?: boolean;
    }
  | { remove_keyboard: true }
  | { inline_keyboard: { text: string; url: string }[][] };

export async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: ReplyMarkup,
): Promise<void> {
  const cfg = telegramConfig();
  if (!cfg) return;
  const res = await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup: replyMarkup }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) {
    // Token yoki chat xatosi — webhook baribir 200 qaytaradi (Telegram qayta yubormasin).
    console.error('[telegram] sendMessage', res.status);
  }
}

let webhookEnsured: Promise<boolean> | null = null;

/**
 * Webhook'ni server o'zi o'rnatadi — Vercel'dagi o'sha token va sir bilan (ADR 0018).
 *
 * NEGA: qo'lda `setWebhook` chaqirish token va sirni terminalga ko'chirishni talab qilardi;
 * birinchi urinishda sir noto'g'ri nusxalandi va bot jim qoldi. Endi sir har doim
 * `TELEGRAM_WEBHOOK_SECRET` bilan bir xil, hech kim tokenni qo'lda ishlatmaydi.
 *
 * Faqat Production'da (preview deploy prod webhook'ini o'z manziliga burib yubormasin) va
 * har server nusxasida bir marta; muvaffaqiyatsiz bo'lsa keyingi so'rovda qayta uriniladi.
 * Manzil redirect'siz bo'lishi shart — Telegram redirect'ga ergashmaydi (`siteUrl()` www).
 */
export function ensureWebhook(siteUrl: string): Promise<boolean> {
  const cfg = telegramConfig();
  if (!cfg || process.env.VERCEL_ENV !== 'production' || !siteUrl.startsWith('https://')) {
    return Promise.resolve(false);
  }
  webhookEnsured ??= fetch(`https://api.telegram.org/bot${cfg.token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: `${siteUrl}/api/telegram/webhook`,
      secret_token: cfg.secret,
      allowed_updates: ['message'],
    }),
    signal: AbortSignal.timeout(5_000),
  })
    .then(async (res) => {
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        description?: string;
      } | null;
      if (!res.ok || !body?.ok) {
        // Token/sir xatosi — matni logga (sirning o'zi emas), keyingi so'rovda qayta urinamiz.
        console.error('[telegram] setWebhook', res.status, body?.description);
        webhookEnsured = null;
        return false;
      }
      return true;
    })
    .catch(() => {
      webhookEnsured = null;
      return false;
    });
  return webhookEnsured;
}

/** Testlar uchun — server nusxasining «bir marta» holatini tozalaydi. */
export function resetWebhookEnsuredForTests(): void {
  webhookEnsured = null;
}

/** Telegram update'ining biz ishlatadigan qismi. */
export interface TelegramUpdate {
  message?: {
    chat: { id: number; type: string };
    from?: { id: number; first_name?: string; username?: string; language_code?: string };
    text?: string;
    contact?: { phone_number?: string; user_id?: number; first_name?: string };
  };
}
