import { t } from '@ecom/i18n';

import type { FcmClient, PushMessage } from './fcm';
import type { Locale } from '@ecom/i18n';

/** Faqat kerakli Prisma yuzasi — testda soxtalashtirish uchun. */
export interface PushDb {
  pushToken: {
    findMany(args: {
      where: { userId: string; appName?: string };
      select: { token: true };
    }): Promise<{ token: string }[]>;
    deleteMany(args: { where: { token: { in: string[] } } }): Promise<unknown>;
  };
  order: {
    findUnique(args: {
      where: { id: string };
      select: { number: true; userId: true; user: { select: { locale: true } } };
    }): Promise<{ number: string; userId: string | null; user: { locale: string } | null } | null>;
  };
}

export interface PushService {
  /** Foydalanuvchining barcha qurilmalariga yuboradi. HECH QACHON xato tashlamaydi. */
  sendToUser(userId: string, message: PushMessage, opts?: { appName?: string }): Promise<number>;
  /** Buyurtma holati o'zgargani haqida mijozga bildirishnoma. HECH QACHON xato tashlamaydi. */
  notifyOrderStatus(orderId: string, status: string): Promise<void>;
  /**
   * Karta cheki tekshiruvi natijasi (audit O5): mijoz shu xabarni kutib turadi — rad etilsa
   * yangi chek yuklashi kerak (aks holda 24 soatdan keyin buyurtma bekor bo'ladi).
   */
  notifyPaymentReview(orderId: string, approved: boolean): Promise<void>;
}

/**
 * Mijozga xabar beriladigan holatlar.
 *
 * `PENDING`/`PAID`/`PROCESSING`/`PACKED` — mijoz uchun shovqin: u buyurtmani
 * o'zi bergan va to'lagan. Faqat uning hayotiga ta'sir qiladigan o'zgarishlar.
 */
export const NOTIFIABLE_ORDER_STATUSES: ReadonlySet<string> = new Set([
  'CONFIRMED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
]);

function asLocale(value: string | undefined): Locale {
  return value === 'ru' || value === 'en' ? value : 'uz';
}

/** Matn foydalanuvchi tilida (`@ecom/i18n`), qo'lda yozilmaydi. */
export function buildOrderStatusMessage(
  order: { id: string; number: string },
  status: string,
  locale: string | undefined,
): PushMessage {
  const l = asLocale(locale);
  return {
    title: t('profile.ordersPage.title', l) + ' · ' + order.number,
    body: t(`order.status.${status}`, l),
    data: { type: 'order', orderId: order.id, status },
  };
}

/** Karta cheki tekshiruvi natijasi — mijoz tilida. */
export function buildPaymentReviewMessage(
  order: { id: string; number: string },
  approved: boolean,
  locale: string | undefined,
): PushMessage {
  const l = asLocale(locale);
  return {
    title: t('profile.ordersPage.title', l) + ' · ' + order.number,
    body: t(approved ? 'push.paymentConfirmed' : 'push.paymentRejected', l),
    data: { type: 'order', orderId: order.id, status: approved ? 'PAID' : 'PAYMENT_REJECTED' },
  };
}

export function createPushService(db: PushDb, client: FcmClient | null): PushService {
  async function customerOf(orderId: string) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { number: true, userId: true, user: { select: { locale: true } } },
    });
    // Mehmon buyurtmasida (`userId: null`) qurilma yo'q.
    return order?.userId ? { ...order, userId: order.userId } : null;
  }

  async function sendToUser(
    userId: string,
    message: PushMessage,
    opts?: { appName?: string },
  ): Promise<number> {
    if (!client) return 0;
    try {
      const rows = await db.pushToken.findMany({
        where: { userId, ...(opts?.appName ? { appName: opts.appName } : {}) },
        select: { token: true },
      });
      if (rows.length === 0) return 0;

      const results = await Promise.all(rows.map((r) => client.send(r.token, message)));
      const dead = rows.filter((_, i) => results[i] === 'invalid-token').map((r) => r.token);
      if (dead.length > 0) await db.pushToken.deleteMany({ where: { token: { in: dead } } });

      return results.filter((r) => r === 'ok').length;
    } catch {
      return 0;
    }
  }

  return {
    sendToUser,
    async notifyOrderStatus(orderId, status) {
      if (!client || !NOTIFIABLE_ORDER_STATUSES.has(status)) return;
      try {
        const order = await customerOf(orderId);
        if (!order) return;
        await sendToUser(
          order.userId,
          buildOrderStatusMessage(
            { id: orderId, number: order.number },
            status,
            order.user?.locale,
          ),
          // Mijoz ilovasiga: kuryer o'z qurilmasida shu hisob bilan kirgan bo'lishi mumkin.
          { appName: 'customer' },
        );
      } catch {
        // Push buyurtma oqimini buzmasligi kerak.
      }
    },
    async notifyPaymentReview(orderId, approved) {
      if (!client) return;
      try {
        const order = await customerOf(orderId);
        if (!order) return;
        await sendToUser(
          order.userId,
          buildPaymentReviewMessage(
            { id: orderId, number: order.number },
            approved,
            order.user?.locale,
          ),
          { appName: 'customer' },
        );
      } catch {
        // Push buyurtma oqimini buzmasligi kerak.
      }
    },
  };
}
