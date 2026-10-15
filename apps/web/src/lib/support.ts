// Qo'llab-quvvatlash va ijtimoiy tarmoq kanallari — yagona manba (audit TRU-01).
//
// Ilgari footer, mobil menyu, yordam, kontaktlar va kuzatish sahifalarida qotib yozilgan
// o'rin egalari turardi: `+998 71 200 00 00`, `support@example.uz`, `@ecom_uz_bot`,
// `https://instagram.com`. Mijoz ularga yozar, javob olmasdi.
//
// Endi hammasi ENV dan. Sozlanmagan kanal UMUMAN ko'rsatilmaydi — bo'sh yoki soxta
// tugmadan ko'ra yo'q tugma yaxshi.

/** ENV qiymatlari lug`ati — testda oddiy obyekt beriladi. */
type EnvLike = Record<string, string | undefined>;

export interface SupportContacts {
  /** Ko'rsatish uchun: `+998 71 200 00 00` ko'rinishida (ENV qanday yozilgan bo'lsa). */
  phone: string | null;
  email: string | null;
  /** Telegram foydalanuvchi nomi, `@` siz: `sellobay_support`. */
  telegram: string | null;
}

export interface SocialLinks {
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  telegram: string | null;
}

function clean(v: string | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

/** `@name`, `name` yoki `https://t.me/name` → `name`. Yaroqsiz bo'lsa — null. */
export function telegramHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(?:https?:\/\/)?(?:t\.me\/)?@?([A-Za-z0-9_]{4,32})\/?$/);
  return m?.[1] ?? null;
}

/** `tel:` havolasi — bo'shliq, qavs va tire olib tashlanadi, `+` qoladi. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, '')}`;
}

/** Faqat to'liq https havola — `https://instagram.com` kabi bosh sahifa qabul qilinmaydi. */
function profileUrl(raw: string | undefined): string | null {
  const v = clean(raw);
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' || u.pathname.replace(/\/+$/, '') === '') return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function supportContacts(env: EnvLike = process.env): SupportContacts {
  return {
    phone: clean(env.SUPPORT_PHONE),
    email: clean(env.SUPPORT_EMAIL),
    telegram: telegramHandle(env.SUPPORT_TELEGRAM),
  };
}

export function socialLinks(env: EnvLike = process.env): SocialLinks {
  const tg = telegramHandle(env.SOCIAL_TELEGRAM ?? env.SUPPORT_TELEGRAM);
  return {
    instagram: profileUrl(env.SOCIAL_INSTAGRAM),
    facebook: profileUrl(env.SOCIAL_FACEBOOK),
    youtube: profileUrl(env.SOCIAL_YOUTUBE),
    telegram: tg ? `https://t.me/${tg}` : null,
  };
}

/** Kamida bitta kanal sozlanganmi. */
export function hasSupport(c: SupportContacts): boolean {
  return Boolean(c.phone || c.email || c.telegram);
}
