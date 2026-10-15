/**
 * Sellobay'ning ochiq aloqa ma'lumotlari — saytdagi yagona manba.
 *
 * Footer, mobil menyu, yordam/aloqa sahifalari va `/api/config`
 * (mobil ilova) shu yerdan o'qiydi. Raqam yoki pochta o'zgarsa — faqat
 * shu faylni tahrirlang.
 */
export const SUPPORT_CONTACT = {
  /** E.164 — `tel:` havolasi uchun. */
  phone: '+998956859995',
  /** Ko'rsatish uchun. */
  phoneDisplay: '+998 95 685 99 95',
  email: 'sellobay@gmail.com',
} as const;

export const SUPPORT_TEL_HREF = `tel:${SUPPORT_CONTACT.phone}`;
export const SUPPORT_MAILTO_HREF = `mailto:${SUPPORT_CONTACT.email}`;
