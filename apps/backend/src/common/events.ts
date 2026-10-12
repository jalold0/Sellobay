/**
 * Servislar orasidagi domen hodisalari (RabbitMQ, topic exchange).
 *
 * Bu fayl SHARTNOMA: hodisa nomi = routing key. Maydonni o'chirish yoki
 * turini o'zgartirish iste'molchilarni sindiradi — faqat QO'SHISH xavfsiz.
 * Pul qiymatlari satr (`"1250000.00"`), hech qachon number (CLAUDE.md).
 */
export interface DomainEvents {
  /** auth → notification: yangi hisob. */
  'user.registered': { userId: string; locale: string; at: string };

  /**
   * auth → notification: OTP SMS yuborish.
   * Kod ochiq matnda keladi, shuning uchun xabar 60 soniyadan keyin o'chadi
   * (`expirationMs`) va hech qachon logga yozilmaydi.
   */
  'otp.requested': { phone: string; code: string; locale: string; expiresAt: string };

  /** orders → notification, analytics: buyurtma yaratildi. */
  'order.created': {
    orderId: string;
    number: string;
    userId: string | null;
    grandTotal: string;
    paymentProvider: string;
    at: string;
  };

  /** orders / admin → notification: holat o'zgardi (push shu bilan yuboriladi). */
  'order.status_changed': {
    orderId: string;
    number: string;
    userId: string | null;
    from: string;
    to: string;
    at: string;
  };

  /** payments → orders: to'lov tasdiqlandi. */
  'payment.confirmed': { orderId: string; provider: string; amount: string; at: string };
}

export type DomainEventName = keyof DomainEvents;

export const EVENTS_EXCHANGE = 'sellobay.events';
export const EVENTS_DEAD_LETTER_EXCHANGE = 'sellobay.events.dlx';
/** OTP kabi maxfiy hodisalarning umri. */
export const SENSITIVE_EVENT_TTL_MS = 60_000;
