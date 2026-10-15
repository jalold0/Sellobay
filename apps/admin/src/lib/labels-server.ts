// Posilka yorliqlari (ADR 0017) — omborda chop etilib posilkaga yopishtiriladi.
//
// Yorliqdagi QR'ni kuryer skanerlaydi: posilka unga biriktiriladi va «olindi» bo'ladi.
// Mijozning topshirish kodi (PIN) bu yerda YO'Q — yorliq qo'lma-qo'l o'tadi.

import { formatParcelCode, parcelQrPayload } from '@ecom/core-domain';
import { ensureDeliveryCodes } from '@ecom/order-ops';

import { prisma } from '@/lib/db';

import type { Prisma } from '@ecom/database';

/** Bitta chop etishda eng ko'pi bilan nechta yorliq (A4'da 21 tadan). */
export const MAX_LABELS = 200;

const labelSelect = {
  id: true,
  status: true,
  courierId: true,
  parcelCode: true,
  destinationAddress: true,
  createdAt: true,
  order: {
    select: {
      id: true,
      number: true,
      grandTotal: true,
      placedAt: true,
      shippingAddress: { select: { recipientName: true, phone: true, region: true, city: true } },
      items: { select: { quantity: true } },
      payments: {
        where: { provider: 'CASH_ON_DELIVERY', status: 'PENDING' },
        select: { id: true },
        take: 1,
      },
    },
  },
} satisfies Prisma.DeliverySelect;

type LabelRow = Prisma.DeliveryGetPayload<{ select: typeof labelSelect }>;

/** Telefonning faqat oxirgi 4 raqami — yorliq begona qo'llarda ham bo'ladi. */
function phoneTail(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function toLabel(d: LabelRow, parcelCode: string) {
  const addr = d.order.shippingAddress;
  return {
    deliveryId: d.id,
    status: d.status,
    claimed: d.courierId !== null,
    parcelCode: formatParcelCode(parcelCode),
    qrPayload: parcelQrPayload(parcelCode),
    orderId: d.order.id,
    orderNumber: d.order.number,
    placedAt: d.order.placedAt.toISOString(),
    // Ism to'liq emas: familiya o'rniga bosh harf (kuryerga tanish uchun yetarli).
    recipient: addr ? shortName(addr.recipientName) : null,
    phoneTail: phoneTail(addr?.phone),
    area: [addr?.region, addr?.city].filter(Boolean).join(', ') || d.destinationAddress,
    pieces: d.order.items.reduce((n, i) => n + i.quantity, 0),
    /** Naqd olinadigan summa — kuryer yorliqqa qarab ham biladi. */
    codAmount: d.order.payments.length > 0 ? d.order.grandTotal.toString() : null,
  };
}

function shortName(full: string): string {
  const [first, ...rest] = full.trim().split(/\s+/);
  const initial = rest[0]?.[0];
  return initial ? `${first} ${initial}.` : (first ?? '');
}

export type ParcelLabel = ReturnType<typeof toLabel>;

/** Kodsiz (eski) yetkazishlarga kod beradi va yorliq ko'rinishiga o'giradi. */
async function withCodes(rows: LabelRow[]): Promise<ParcelLabel[]> {
  const out: ParcelLabel[] = [];
  for (const d of rows) {
    const code = d.parcelCode ?? (await ensureDeliveryCodes(prisma, d.id))?.parcelCode;
    if (code) out.push(toLabel(d, code));
  }
  return out;
}

/**
 * Chop etishga tayyor yetkazishlar: o'z kuryerimiz olib boradigan, hali omborda
 * (kuryer olmagan) va buyurtmasi yopilmagan.
 */
export async function listPendingLabels(): Promise<ParcelLabel[]> {
  const rows = await prisma.delivery.findMany({
    where: {
      kind: 'OUTBOUND',
      carrier: null,
      status: 'ASSIGNED',
      order: { status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED', 'DELIVERED'] } },
    },
    orderBy: { createdAt: 'asc' },
    take: MAX_LABELS,
    select: labelSelect,
  });
  return withCodes(rows);
}

/** Tanlangan yetkazishlarning yorliqlari (berilgan tartibda). */
export async function labelsFor(deliveryIds: string[]): Promise<ParcelLabel[]> {
  const rows = await prisma.delivery.findMany({
    where: { id: { in: deliveryIds.slice(0, MAX_LABELS) }, kind: 'OUTBOUND', carrier: null },
    select: labelSelect,
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return withCodes(deliveryIds.map((id) => byId.get(id)).filter((r): r is LabelRow => !!r));
}
