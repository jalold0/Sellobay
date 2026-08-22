// Global buyurtma bosqichi o'zgarganda mijozga xabar yozish.
//
// TASHQI PROVAYDER KERAK EMAS: xabar `Notification` jadvaliga IN_APP kanali bilan
// yoziladi — mijoz ilovada/saytda ko'radi. SMS yoki push provayder ulangach,
// aynan shu yozuvlarni yuborish uchun worker qo'shiladi (kanalni almashtirish kifoya).
//
// Xabar yuborish buyurtma oqimini TO'XTATMASLIGI kerak: xato bo'lsa jimgina
// o'tkazib yuboriladi (operator ishi muhimroq).

import type { Prisma, PrismaClient } from '@ecom/database';

type Tx = PrismaClient | Prisma.TransactionClient;

const uzs = (n: number) => `${new Intl.NumberFormat('ru-RU').format(Math.round(n))} so'm`;

export type NotifyEvent =
  | { kind: 'PRICE_CHANGED'; extraChargeUzs: number }
  | { kind: 'CONFIRMED' }
  | { kind: 'PURCHASED' }
  | { kind: 'IN_CARGO'; trackNumber: string }
  | { kind: 'DELIVERED' }
  | { kind: 'CANCELLED' };

function message(event: NotifyEvent, orderNumber: string): { title: string; body: string } {
  switch (event.kind) {
    case 'PRICE_CHANGED':
      return {
        title: 'Global buyurtma: narx o‘zgardi',
        body:
          event.extraChargeUzs > 0
            ? `${orderNumber} — Xitoyda narx oshdi. Davom ettirish uchun qo‘shimcha ${uzs(event.extraChargeUzs)} kerak. Operatorimiz siz bilan bog‘lanadi.`
            : `${orderNumber} — Xitoyda narx o‘zgardi. Operatorimiz siz bilan bog‘lanadi.`,
      };
    case 'CONFIRMED':
      return {
        title: 'Global buyurtma tasdiqlandi',
        body: `${orderNumber} — narx tasdiqlandi, Xitoydagi sotuvchiga zakaz beryapmiz.`,
      };
    case 'PURCHASED':
      return {
        title: 'Tovar Xitoyda sotib olindi',
        body: `${orderNumber} — tovar sotib olindi va omborimizga yig‘ilmoqda.`,
      };
    case 'IN_CARGO':
      return {
        title: 'Buyurtmangiz yo‘lda',
        body: `${orderNumber} — kargoga topshirildi. Trek raqam: ${event.trackNumber}`,
      };
    case 'DELIVERED':
      return {
        title: 'Buyurtma yetkazildi',
        body: `${orderNumber} — buyurtmangiz yopildi. Xaridingiz bilan!`,
      };
    case 'CANCELLED':
      return {
        title: 'Global buyurtma bekor qilindi',
        body: `${orderNumber} — buyurtma bekor qilindi. Pul qaytarilishi bo‘yicha bog‘lanamiz.`,
      };
  }
}

/**
 * Mijozga IN_APP xabar yozadi. `userId` bo'lmasa (guest buyurtma) — hech narsa qilmaydi.
 * Xato yuz bersa jimgina o'tkazib yuboradi.
 */
export async function notifyGlobalCustomer(
  tx: Tx,
  params: { userId: string | null; orderNumber: string; event: NotifyEvent },
): Promise<void> {
  if (!params.userId) return;
  const { title, body } = message(params.event, params.orderNumber);

  try {
    await tx.notification.create({
      data: {
        userId: params.userId,
        channel: 'IN_APP',
        title,
        body,
        data: { scope: 'GLOBAL', event: params.event.kind, orderNumber: params.orderNumber },
        status: 'QUEUED',
      },
    });
  } catch {
    // Xabar yozilmasa ham operator ishi davom etadi
  }
}
