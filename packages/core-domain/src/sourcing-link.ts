// Xitoy platformalari havolasini tahlil qilish — sof logika, tarmoqqa chiqmaydi.
// Mijoz Taobao/Tmall/1688 havolasini tashlaydi → biz platformani va tovar ID'sini ajratamiz.
//
// NEGA CORE-DOMAIN'DA: web (havola formasi), admin (operator paneli) va mobil bir xil
// qoidalar bilan tekshirishi kerak. Bitta haqiqat manbai.

export type SourcingPlatform = 'TAOBAO' | 'TMALL' | 'ALIBABA_1688' | 'WEIDIAN' | 'OTHER';

export type SourcingLinkError =
  /** Umuman URL emas. */
  | 'INVALID_URL'
  /** URL, lekin biz qo'llab-quvvatlamaydigan sayt. */
  | 'UNSUPPORTED_HOST'
  /** Sayt to'g'ri, lekin havolada tovar ID'si yo'q (masalan qidiruv/ro'yxat sahifasi). */
  | 'NO_ITEM_ID';

export interface SourcingLinkOk {
  ok: true;
  platform: SourcingPlatform;
  /** Platformadagi tovar ID'si. Qisqa havolada `null` — operator ochib aniqlaydi. */
  itemId: string | null;
  /** Tracking parametrlaridan tozalangan kanonik havola. */
  normalizedUrl: string;
  /**
   * Qisqa havola (m.tb.cn, qr.1688.com...) — ID'ni faqat ochib ko'rish bilan bilib olinadi.
   * Rad etmaymiz: qabul qilamiz, lekin operatorga "aniqlash kerak" deb belgilaymiz.
   */
  needsResolve: boolean;
}

export interface SourcingLinkFail {
  ok: false;
  error: SourcingLinkError;
}

export type SourcingLinkResult = SourcingLinkOk | SourcingLinkFail;

/** Qisqa (redirect) havola hostlari — ID URL ichida bo'lmaydi. */
const SHORT_LINK_HOSTS = ['m.tb.cn', 'tb.cn', 'qr.1688.com', 'e.tb.cn', 'm.1688.com.cn'];

/**
 * Host → platforma. Eng aniq moslik ustun turadi, shuning uchun ro'yxat tartibi muhim
 * (`detail.tmall.com` `taobao.com`dan oldin tekshirilishi kerak emas — ular boshqa domen,
 * lekin `*.tmall.com` `taobao`ni o'z ichiga olmaydi, shuning uchun oddiy suffix moslik yetarli).
 */
const HOST_PLATFORMS: ReadonlyArray<readonly [suffix: string, platform: SourcingPlatform]> = [
  ['tmall.com', 'TMALL'],
  ['tmall.hk', 'TMALL'],
  ['taobao.com', 'TAOBAO'],
  ['1688.com', 'ALIBABA_1688'],
  ['weidian.com', 'WEIDIAN'],
];

/** Tovar ID'si saqlanadigan query parametrlari (platformalar turlicha nomlaydi). */
const ID_PARAMS = ['id', 'itemId', 'itemID', 'offerId'];

function detectPlatform(host: string): SourcingPlatform | null {
  const h = host.toLowerCase().replace(/^www\./, '');
  for (const [suffix, platform] of HOST_PLATFORMS) {
    if (h === suffix || h.endsWith('.' + suffix)) return platform;
  }
  return null;
}

function isShortLinkHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, '');
  return SHORT_LINK_HOSTS.includes(h);
}

/** Faqat raqamlardan iborat ID (barcha platformalarda numerik). */
function cleanItemId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.trim().replace(/\D/g, '');
  return digits.length >= 6 ? digits : null;
}

function extractItemId(url: URL): string | null {
  // 1) Query parametrlari: ?id=123456789
  for (const key of ID_PARAMS) {
    const found = cleanItemId(url.searchParams.get(key));
    if (found) return found;
  }
  // 2) 1688 yo'l ko'rinishi: /offer/645123456789.html
  const offerMatch = url.pathname.match(/\/offer\/(\d{6,})/);
  if (offerMatch) return offerMatch[1] ?? null;
  // 3) world.taobao.com/item/123456789.htm ko'rinishi
  const itemMatch = url.pathname.match(/\/item\/(\d{6,})/);
  if (itemMatch) return itemMatch[1] ?? null;
  return null;
}

function canonicalUrl(platform: SourcingPlatform, itemId: string): string {
  switch (platform) {
    case 'TMALL':
      return `https://detail.tmall.com/item.htm?id=${itemId}`;
    case 'ALIBABA_1688':
      return `https://detail.1688.com/offer/${itemId}.html`;
    case 'WEIDIAN':
      return `https://weidian.com/item.html?itemID=${itemId}`;
    case 'TAOBAO':
    case 'OTHER':
    default:
      return `https://item.taobao.com/item.htm?id=${itemId}`;
  }
}

/**
 * Mijoz kiritgan havolani tahlil qiladi.
 * Tarmoqqa chiqmaydi — qisqa havolalar `needsResolve: true` bilan qaytariladi.
 */
export function parseSourcingLink(input: string): SourcingLinkResult {
  const raw = input?.trim();
  if (!raw) return { ok: false, error: 'INVALID_URL' };

  // Mijozlar ko'pincha "item.taobao.com/..." deb protokolsiz tashlaydi
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return { ok: false, error: 'INVALID_URL' };
  }

  // "salom" ham `https://salom` bo'lib to'g'ri URL'ga aylanadi — bunday matnni
  // "qo'llab-quvvatlanmaydigan sayt" emas, "havola noto'g'ri" deb aytish to'g'riroq.
  if (!url.hostname.includes('.')) return { ok: false, error: 'INVALID_URL' };

  if (isShortLinkHost(url.hostname)) {
    return {
      ok: true,
      // Qisqa havola qaysi platformaga borishini oldindan bilmaymiz
      platform: url.hostname.toLowerCase().includes('1688') ? 'ALIBABA_1688' : 'TAOBAO',
      itemId: null,
      normalizedUrl: url.toString(),
      needsResolve: true,
    };
  }

  const platform = detectPlatform(url.hostname);
  if (!platform) return { ok: false, error: 'UNSUPPORTED_HOST' };

  const itemId = extractItemId(url);
  if (!itemId) return { ok: false, error: 'NO_ITEM_ID' };

  return {
    ok: true,
    platform,
    itemId,
    normalizedUrl: canonicalUrl(platform, itemId),
    needsResolve: false,
  };
}

/** Xato kodi → i18n kalit oxiri (`global.linkError.<kalit>`). */
export const SOURCING_LINK_ERROR_KEYS: Record<SourcingLinkError, string> = {
  INVALID_URL: 'invalidUrl',
  UNSUPPORTED_HOST: 'unsupportedHost',
  NO_ITEM_ID: 'noItemId',
};
