// Mijozga ko'rsatiladigan topshirish kodi (ADR 0017).
//
// Kuryer posilkani berishdan oldin mijozdan shu kodni oladi: QR'ni skanerlaydi yoki
// mijoz 4 raqamni aytadi. Kod FAQAT buyurtma egasiga (kabinet) va raqam + telefonni
// bilgan mehmonga (kuzatish sahifasi) ko'rsatiladi — kuryerga hech qachon.

import { formatParcelCode, handoverQrPayload } from '@ecom/core-domain';
import { ensureDeliveryCodes } from '@ecom/order-ops';

import { prisma } from '@/lib/db';

export interface HandoverView {
  /** Mijoz kuryerga aytadigan 4 raqam. */
  pin: string;
  /** Mijoz ekranidagi QR matni — kuryer ilovasi skanerlaydi. */
  qrPayload: string;
  /** Posilka yorlig'idagi kod — mijoz qo'lidagi posilkani solishtirishi uchun. */
  parcelCode: string;
}

/**
 * Buyurtmaning faol (yo'ldagi) yetkazishi uchun topshirish kodi yoki `null`.
 *
 * Faqat kuryer posilkani olgandan keyin ko'rinadi: undan oldin kod kerak emas, mijoz
 * esa uni «buyurtma allaqachon yo'lda» deb tushunardi. 3PL yetkazishida o'z kodi
 * bor (trek raqami), punktdan olishda kuryer yo'q.
 */
export async function handoverForOrder(orderId: string): Promise<HandoverView | null> {
  const delivery = await prisma.delivery.findFirst({
    where: {
      orderId,
      kind: 'OUTBOUND',
      carrier: null,
      status: { in: ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED'] },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  if (!delivery) return null;
  const codes = await ensureDeliveryCodes(prisma, delivery.id);
  if (!codes) return null;
  return {
    pin: codes.handoverPin,
    qrPayload: handoverQrPayload(codes.parcelCode, codes.handoverPin),
    parcelCode: formatParcelCode(codes.parcelCode),
  };
}
