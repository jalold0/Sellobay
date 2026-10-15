// Qo'llab-quvvatlash va ijtimoiy tarmoq kanallari — yagona manba (audit TRU-01).
//
// Ilgari footer, mobil menyu, yordam, kontaktlar va kuzatish sahifalarida qotib yozilgan
// o'rin egalari turardi: `+998 71 200 00 00`, `support@example.uz`, `@ecom_uz_bot`,
// `https://instagram.com`. Mijoz ularga yozar, javob olmasdi.
//
// Endi Sellobay'ning haqiqiy kanallari `SELLOBAY_CHANNELS` da; ENV (SUPPORT_*, SOCIAL_*)
// berilsa, u ustun turadi. Kanal na ENV da, na bu yerda bo'lmasa — UMUMAN ko'rsatilmaydi:
// bo'sh yoki soxta tugmadan ko'ra yo'q tugma yaxshi.

/**
 * Sellobay'ning rasmiy aloqa kanallari. Raqam yoki profil o'zgarsa — shu yerni tahrirlang
 * (yoki ENV bilan bekor qiling). Hali ochilmagan tarmoqqa qiymat yozmang.
 */
export const SELLOBAY_CHANNELS = {
  phone: '+998 95 685 99 95',
  email: 'sellobay2026@gmail.com',
  instagram: 'https://www.instagram.com/sellobay.uz/',
} as const;

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
    phone: clean(env.SUPPORT_PHONE) ?? SELLOBAY_CHANNELS.phone,
    email: clean(env.SUPPORT_EMAIL) ?? SELLOBAY_CHANNELS.email,
    telegram: telegramHandle(env.SUPPORT_TELEGRAM),
  };
}

export function socialLinks(env: EnvLike = process.env): SocialLinks {
  const tg = telegramHandle(env.SOCIAL_TELEGRAM ?? env.SUPPORT_TELEGRAM);
  return {
    instagram: profileUrl(env.SOCIAL_INSTAGRAM) ?? SELLOBAY_CHANNELS.instagram,
    facebook: profileUrl(env.SOCIAL_FACEBOOK),
    youtube: profileUrl(env.SOCIAL_YOUTUBE),
    telegram: tg ? `https://t.me/${tg}` : null,
  };
}

/** Kamida bitta kanal sozlanganmi. */
export function hasSupport(c: SupportContacts): boolean {
  return Boolean(c.phone || c.email || c.telegram);
}
