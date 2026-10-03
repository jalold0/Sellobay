// To'lov integratsiyasi skeleti — Click va Payme.
//
// ⚠️ ULANISH UCHUN ENV O'ZGARUVCHILARI KERAK (Vercel + .env):
//   CLICK_SERVICE_ID, CLICK_MERCHANT_ID, CLICK_SECRET_KEY, CLICK_MERCHANT_USER_ID
//   PAYME_MERCHANT_ID, PAYME_KEY (kassa kaliti)
//   NEXT_PUBLIC_APP_URL  (masalan https://sellobay.uz) — return_url uchun
//
// Merchant hisob ochilgach shu kalitlarni qo'ying — kod tayyor.

export type PaymentProvider =
  | 'CLICK'
  | 'PAYME'
  | 'UZUM_BANK'
  | 'UZCARD'
  | 'HUMO'
  | 'CASH_ON_DELIVERY';

/** Onlayn (redirect bilan) to'lov qiladigan provayderlar */
export const ONLINE_PROVIDERS: PaymentProvider[] = ['CLICK', 'PAYME'];

export function isOnlineProvider(p: PaymentProvider): boolean {
  return ONLINE_PROVIDERS.includes(p);
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
}

/**
 * Click Checkout redirect URL.
 * Hujjat: https://docs.click.uz/click-api-request/
 * amount — so'mda. transaction_param — bizning order id (webhook'da qaytadi).
 */
export function buildClickUrl(params: { orderId: string; amountSom: number }): string {
  const serviceId = process.env.CLICK_SERVICE_ID ?? '';
  const merchantId = process.env.CLICK_MERCHANT_ID ?? '';
  const returnUrl = `${appUrl()}/orders/success`;
  const qs = new URLSearchParams({
    service_id: serviceId,
    merchant_id: merchantId,
    amount: String(params.amountSom),
    transaction_param: params.orderId,
    return_url: returnUrl,
  });
  return `https://my.click.uz/services/pay?${qs.toString()}`;
}

/**
 * Payme Checkout redirect URL (GET — base64 kodlangan parametrlar).
 * Hujjat: https://developer.help.paycom.uz/initsializatsiya-platezhey/
 * a — tiyinda (so'm × 100). ac.order_id — bizning order id.
 */
export function buildPaymeUrl(params: { orderId: string; amountSom: number }): string {
  const merchantId = process.env.PAYME_MERCHANT_ID ?? '';
  const endpoint = (process.env.PAYME_ENDPOINT || 'https://checkout.paycom.uz').replace(/\/$/, '');
  const amountTiyin = Math.round(params.amountSom * 100);
  const returnUrl = `${appUrl()}/orders/success`;
  const raw = `m=${merchantId};ac.order_id=${params.orderId};a=${amountTiyin};c=${returnUrl}`;
  const encoded = Buffer.from(raw, 'utf8').toString('base64');
  return `${endpoint}/${encoded}`;
}

/**
 * Provayder ishlashga TAYYORMI — kerakli env o'zgaruvchilari qo'yilganmi.
 *
 * Kalitsiz `buildClickUrl` baribir manzil quradi, lekin unda `service_id`
 * bo'sh bo'ladi va mijoz buzuq to'lov sahifasiga tushadi. Shuning uchun
 * sozlanmagan usul mijozga UMUMAN taklif qilinmasligi kerak — mana shu
 * funksiya buni hal qiladi (`GET /api/config` shu ro'yxatni beradi).
 */
export function isProviderConfigured(provider: PaymentProvider): boolean {
  switch (provider) {
    case 'CLICK':
      return Boolean(process.env.CLICK_SERVICE_ID && process.env.CLICK_MERCHANT_ID);
    case 'PAYME':
      return Boolean(process.env.PAYME_MERCHANT_ID);
    case 'CASH_ON_DELIVERY':
      // Naqd pul hech qanday integratsiya talab qilmaydi.
      return true;
    default:
      // UZCARD (qo'lda karta) alohida tekshiriladi — `isManualCardAvailable()`,
      // chunki u karta ro'yxatiga va chek yuklashga bog'liq.
      return false;
  }
}

/** Hozir ishlaydigan to'lov usullari. */
export function availableProviders(): PaymentProvider[] {
  return (['CLICK', 'PAYME', 'CASH_ON_DELIVERY'] as const).filter(isProviderConfigured);
}

/** Provayder + order'dan checkout URL quradi (online bo'lmasa null) */
export function buildCheckoutUrl(
  provider: PaymentProvider,
  order: { id: string; amountSom: number },
): string | null {
  switch (provider) {
    case 'CLICK':
      return buildClickUrl({ orderId: order.id, amountSom: order.amountSom });
    case 'PAYME':
      return buildPaymeUrl({ orderId: order.id, amountSom: order.amountSom });
    default:
      return null; // CASH_ON_DELIVERY va boshqalar — redirect yo'q
  }
}
