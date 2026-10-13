// Sotuvchi hisob daftari va to'lovlar (ADR 0015).
//
//   • Yetkazilganda — har satr bo'yicha: SALE (+), COMMISSION (−), FULFILLMENT_FEE (−).
//     «Yechish mumkin» sanasi — yetkazilgan + qaytarish muddati (10 kun).
//   • Qaytarilganda — teskari yozuvlar (RETURN_*), shu sanada.
//   • To'lov kunida (oyiga 2 marta) — muddati o'tgan yozuvlar sotuvchi bo'yicha to'lovga
//     (`SellerPayout`) yig'iladi; admin bank o'tkazmasini qilib «To'landi» deydi — shunda
//     PAYOUT (−) yozuvi tushadi. Daftar yig'indisi har doim — platformaning sotuvchidan qarzi.
//
// Har yozuvning `reference` kaliti unikal — qayta chaqiruv ikki marta yozmaydi.

import {
  centsToMoney,
  isPayoutDay,
  nextPayoutDate,
  RETURN_WINDOW_DAYS,
  settleItem,
} from '@ecom/core-domain';

import { loadMarketplaceSettings } from './seller-shipments';

import type { LedgerEntryType, Prisma, PrismaClient } from '@ecom/database';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Ishorali tiyin (daftarda manfiy yozuvlar bor; `moneyToCents` faqat musbatni o'qiydi). */
const toCents = (d: Prisma.Decimal): bigint => BigInt(d.mul(100).toFixed(0));

const REVERSAL: Partial<Record<LedgerEntryType, LedgerEntryType>> = {
  SALE: 'RETURN_SALE',
  COMMISSION: 'RETURN_COMMISSION',
  FULFILLMENT_FEE: 'RETURN_FULFILLMENT_FEE',
};

export class PayoutStateError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'INVALID_TRANSITION',
    message: string,
  ) {
    super(message);
    this.name = 'PayoutStateError';
  }
}

/** Yetkazilgan buyurtma bo'yicha sotuvchi yozuvlari. Natija — yozilgan yozuvlar soni. */
export async function recordSaleLedger(
  tx: Prisma.TransactionClient,
  orderId: string,
  deliveredAt: Date,
): Promise<number> {
  const items = await tx.orderItem.findMany({
    where: { orderId, sellerId: { not: null } },
    select: {
      id: true,
      sellerId: true,
      quantity: true,
      totalPrice: true,
      sellerShipment: { select: { fulfillmentModel: true } },
      product: { select: { fulfillmentModel: true } },
    },
  });
  if (items.length === 0) return 0;

  const settings = await loadMarketplaceSettings(tx);
  const availableAt = new Date(deliveredAt.getTime() + RETURN_WINDOW_DAYS * DAY_MS);
  const rows: Prisma.SellerLedgerEntryCreateManyInput[] = [];
  for (const it of items) {
    // Model — jo'natma ochilgandagisi (keyin o'zgargan bo'lsa ham shu narxda sotilgan).
    const model = it.sellerShipment?.fulfillmentModel ?? it.product.fulfillmentModel;
    const s = settleItem(it.totalPrice.toFixed(2), it.quantity, model, settings);
    const base = { sellerId: it.sellerId!, orderId, orderItemId: it.id, availableAt };
    rows.push({ ...base, type: 'SALE', amount: s.sale, reference: `SALE:${it.id}`, note: model });
    if (s.commission !== '0.00') {
      rows.push({
        ...base,
        type: 'COMMISSION',
        amount: `-${s.commission}`,
        reference: `COMMISSION:${it.id}`,
        note: `${settings.commissionPct[model]}%`,
      });
    }
    if (s.fee !== '0.00') {
      rows.push({
        ...base,
        type: 'FULFILLMENT_FEE',
        amount: `-${s.fee}`,
        reference: `FEE:${it.id}`,
        note: `${model}, ${it.quantity} dona`,
      });
    }
  }
  const res = await tx.sellerLedgerEntry.createMany({ data: rows, skipDuplicates: true });
  return res.count;
}

/**
 * Qaytarilgan buyurtma — sotuv, komissiya va xizmat haqi teskari yoziladi. Hali to'lanmagan
 * sotuv bilan bir sanada «yechiladi» (bir-birini yopadi); allaqachon to'langan bo'lsa — darhol
 * (keyingi to'lovdan ushlanadi).
 */
export async function reverseSaleLedger(
  tx: Prisma.TransactionClient,
  orderId: string,
  now: Date = new Date(),
): Promise<number> {
  const entries = await tx.sellerLedgerEntry.findMany({
    where: { orderId, type: { in: ['SALE', 'COMMISSION', 'FULFILLMENT_FEE'] } },
    select: {
      sellerId: true,
      type: true,
      amount: true,
      orderItemId: true,
      availableAt: true,
      reference: true,
    },
  });
  if (entries.length === 0) return 0;
  const res = await tx.sellerLedgerEntry.createMany({
    data: entries.map((e) => ({
      sellerId: e.sellerId,
      type: REVERSAL[e.type]!,
      amount: e.amount.negated(),
      orderId,
      orderItemId: e.orderItemId,
      availableAt: e.availableAt > now ? e.availableAt : now,
      reference: `RETURN:${e.reference}`,
      note: 'Qaytarildi',
    })),
    skipDuplicates: true,
  });
  return res.count;
}

export interface PayoutRunResult {
  /** To'lov kuni emas va majburlanmagan — hech narsa qilinmadi. */
  skipped: boolean;
  created: Array<{ payoutId: string; sellerId: string; amount: string }>;
}

/**
 * To'lov kuni (yoki admin «hozir hisoblash» bosganda) — muddati o'tgan, hali to'lovga
 * yig'ilmagan yozuvlar sotuvchi bo'yicha to'lovga yig'iladi. Yig'indi musbat bo'lsagina
 * (manfiy qoldiq — masalan to'lovdan keyingi qaytarish — keyingi davrga o'tadi). Idempotent:
 * yig'ilgan yozuvlar qayta olinmaydi; sotuvchi bo'yicha advisory lock — parallel ishga
 * tushsa ham ikki marta yig'ilmaydi.
 */
export async function runSellerPayouts(
  db: PrismaClient,
  now: Date = new Date(),
  opts: { force?: boolean } = {},
): Promise<PayoutRunResult> {
  const settings = await loadMarketplaceSettings(db);
  if (!opts.force && !isPayoutDay(now, settings.payoutDays)) return { skipped: true, created: [] };

  const due = await db.sellerLedgerEntry.groupBy({
    by: ['sellerId'],
    where: { payoutId: null, availableAt: { lte: now } },
    _sum: { amount: true },
  });

  const created: PayoutRunResult['created'] = [];
  for (const row of due) {
    if (!row._sum.amount || row._sum.amount.lte(0)) continue;
    const payout = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payout:${row.sellerId}`}))`;
      const entries = await tx.sellerLedgerEntry.findMany({
        where: { sellerId: row.sellerId, payoutId: null, availableAt: { lte: now } },
        select: { id: true, amount: true, createdAt: true },
      });
      const cents = entries.reduce((s, e) => s + toCents(e.amount), 0n);
      if (cents <= 0n) return null;
      const seller = await tx.seller.findUniqueOrThrow({
        where: { id: row.sellerId },
        select: { bankAccount: true, bankName: true },
      });
      const amount = centsToMoney(cents);
      const p = await tx.sellerPayout.create({
        data: {
          sellerId: row.sellerId,
          amount,
          periodStart: entries.reduce((m, e) => (e.createdAt < m ? e.createdAt : m), now),
          periodEnd: now,
          bankAccount: seller.bankAccount,
          bankName: seller.bankName,
        },
        select: { id: true },
      });
      await tx.sellerLedgerEntry.updateMany({
        where: { id: { in: entries.map((e) => e.id) } },
        data: { payoutId: p.id },
      });
      return { payoutId: p.id, sellerId: row.sellerId, amount };
    });
    if (payout) created.push(payout);
  }
  return { skipped: false, created };
}

/** Admin bank o'tkazmasini qildi — to'lov PAID, daftarga PAYOUT (−) yoziladi. */
export async function markPayoutPaid(
  tx: Prisma.TransactionClient,
  input: { payoutId: string; reference: string; staffUserId: string },
  now: Date = new Date(),
): Promise<void> {
  const p = await tx.sellerPayout.findUnique({
    where: { id: input.payoutId },
    select: { sellerId: true, amount: true, status: true },
  });
  if (!p) throw new PayoutStateError('NOT_FOUND', 'To‘lov topilmadi');
  const moved = await tx.sellerPayout.updateMany({
    where: { id: input.payoutId, status: 'PENDING' },
    data: { status: 'PAID', paidAt: now, reference: input.reference, paidById: input.staffUserId },
  });
  if (moved.count === 0) {
    throw new PayoutStateError('INVALID_TRANSITION', 'To‘lov allaqachon yopilgan');
  }
  await tx.sellerLedgerEntry.create({
    data: {
      sellerId: p.sellerId,
      type: 'PAYOUT',
      amount: p.amount.negated(),
      payoutId: input.payoutId,
      availableAt: now,
      reference: `PAYOUT:${input.payoutId}`,
      note: input.reference,
      createdById: input.staffUserId,
    },
  });
}

/**
 * To'lovni bekor qilish (masalan rekvizit noto'g'ri) — yozuvlar yana to'lov kutadi va
 * keyingi hisoblashga tushadi.
 */
export async function cancelPayout(
  tx: Prisma.TransactionClient,
  input: { payoutId: string; reason: string },
): Promise<void> {
  const moved = await tx.sellerPayout.updateMany({
    where: { id: input.payoutId, status: 'PENDING' },
    data: { status: 'CANCELLED', note: input.reason },
  });
  if (moved.count === 0) {
    const exists = await tx.sellerPayout.count({ where: { id: input.payoutId } });
    throw exists
      ? new PayoutStateError(
          'INVALID_TRANSITION',
          'Faqat kutilayotgan to‘lovni bekor qilish mumkin',
        )
      : new PayoutStateError('NOT_FOUND', 'To‘lov topilmadi');
  }
  await tx.sellerLedgerEntry.updateMany({
    where: { payoutId: input.payoutId, type: { not: 'PAYOUT' } },
    data: { payoutId: null },
  });
}

/** Keyingi to'lov kuni, Toshkent kunining o'rtasi (ISO) — sana ko'rsatish uchun. */
export function payoutDayNoon(now: Date, payoutDays: number[]): string {
  return new Date(nextPayoutDate(now, payoutDays).getTime() + DAY_MS / 2).toISOString();
}

export interface SellerBalance {
  /** Qaytarish muddati hali o'tmagan (yechib bo'lmaydi). */
  pending: string;
  /** Muddati o'tgan, keyingi to'lov kunida to'lovga yig'iladi. */
  available: string;
  /** To'lovga yig'ilgan, bank o'tkazmasi kutilmoqda. */
  inPayout: string;
  /** Jami to'langan. */
  paid: string;
  /** Keyingi to'lov kuni — Toshkent kunining o'rtasi (brauzer zonasida sana siljimaydi). */
  nextPayoutAt: string;
  /** Keyingi to'lov kunida yig'iladigan summa (o'sha kungacha muddati o'tadiganlar bilan). */
  nextPayoutAmount: string;
}

const sum = (rows: Array<{ amount: Prisma.Decimal }>) =>
  centsToMoney(rows.reduce((s, r) => s + toCents(r.amount), 0n));

/** Sotuvchi balansi — panel va admin uchun bir xil hisob. */
export async function sellerBalance(
  db: Prisma.TransactionClient,
  sellerId: string,
  now: Date = new Date(),
): Promise<SellerBalance> {
  const [open, payouts, settings] = await Promise.all([
    db.sellerLedgerEntry.findMany({
      where: { sellerId, payoutId: null },
      select: { amount: true, availableAt: true },
    }),
    db.sellerPayout.findMany({
      where: { sellerId, status: { in: ['PENDING', 'PAID'] } },
      select: { amount: true, status: true },
    }),
    loadMarketplaceSettings(db),
  ]);
  const nextDay = nextPayoutDate(now, settings.payoutDays);
  return {
    pending: sum(open.filter((e) => e.availableAt > now)),
    available: sum(open.filter((e) => e.availableAt <= now)),
    inPayout: sum(payouts.filter((p) => p.status === 'PENDING')),
    paid: sum(payouts.filter((p) => p.status === 'PAID')),
    nextPayoutAt: payoutDayNoon(now, settings.payoutDays),
    nextPayoutAmount: sum(open.filter((e) => e.availableAt <= nextDay)),
  };
}
