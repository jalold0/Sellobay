// Telegram Bot API — faqat kerakli qismi (oddiy fetch, qo'shimcha paket yo'q).
//
// Sozlash (ADR 0018): TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET.
// Webhook bir marta o'rnatiladi (docs/DEPLOYMENT.md, «Telegram bot»).

export function telegramConfig(): { token: string; username: string; secret: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const username = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, '');
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!token || !username || !secret) return null;
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

/** Telegram update'ining biz ishlatadigan qismi. */
export interface TelegramUpdate {
  message?: {
    chat: { id: number; type: string };
    from?: { id: number; first_name?: string; username?: string; language_code?: string };
    text?: string;
    contact?: { phone_number?: string; user_id?: number; first_name?: string };
  };
}
