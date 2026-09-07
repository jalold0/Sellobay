// Group Buy (guruh xaridi) biznes-servisi (application qatlami).
// HTTP'ga bog'liq emas: route (interface) faqat parse/auth/rate-limit qilib
// shu yerga keladi. Sof qoidalar @ecom/core-domain/group-buy da.
//
// Ilgari bu funksiyalar `lib/group-buy.ts` da MOCK ma'lumot qaytarardi:
// qatnashchilar soni qo'lda yozilgan, taymer har sahifa yangilanganda
// qaytadan boshlanardi, "Qo'shilish" hech qayerga saqlanmasdi. Endi
// hammasi GroupBuy/GroupBuyMember jadvallaridan o'qiladi.

import {
  canJoin,
  discountPercent,
  effectiveStatus,
  seatsLeft,
  statusAfterJoin,
  type GroupBuyStatusKey,
  type JoinRejection,
} from '@ecom/core-domain';
import { isRealProductImageUrl } from '@ecom/utils';
import * as Sentry from '@sentry/nextjs';

import { prisma } from '@/lib/db';

import type { LocalizedText } from './mock-data';
import type { Prisma } from '@ecom/database';

export class GroupBuyError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'GroupBuyError';
  }
}

/** Mijozga ko'rsatiladigan guruh xaridi. Barcha son DB'dan keladi. */
export interface GroupDealView {
  id: string;
  productSlug: string;
  name: LocalizedText;
  imageUrl?: string;
  soloPrice: number;
  groupPrice: number;
  discountPercent: number;
  targetSize: number;
  currentSize: number;
  seatsLeft: number;
  status: GroupBuyStatusKey;
  /** ISO — klient qolgan vaqtni shundan hisoblaydi (sahifa yangilanishi ta'sir qilmaydi). */
  expiresAt: string;
  /** Joriy foydalanuvchi a'zomi. Login qilmagan bo'lsa — false. */
  joined: boolean;
}

const dealSelect = {
  id: true,
  soloPrice: true,
  groupPrice: true,
  targetSize: true,
  status: true,
  expiresAt: true,
  product: {
    select: {
      slug: true,
      name: true,
      images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
    },
  },
  _count: { select: { members: true } },
} satisfies Prisma.GroupBuySelect;

type DealRow = Prisma.GroupBuyGetPayload<{ select: typeof dealSelect }>;

function toView(row: DealRow, joinedIds: Set<string>, now: Date): GroupDealView {
  const solo = Number(row.soloPrice);
  const group = Number(row.groupPrice);
  const currentSize = row._count.members;
  const imageUrl = row.product.images[0]?.url ?? '';
  const state = {
    status: row.status as GroupBuyStatusKey,
    targetSize: row.targetSize,
    currentSize,
    expiresAt: row.expiresAt,
  };
  return {
    id: row.id,
    productSlug: row.product.slug,
    name: row.product.name as LocalizedText,
    imageUrl: isRealProductImageUrl(imageUrl) ? imageUrl : undefined,
    soloPrice: solo,
    groupPrice: group,
    discountPercent: discountPercent(solo, group),
    targetSize: row.targetSize,
    currentSize,
    seatsLeft: seatsLeft(state),
    status: effectiveStatus(state, now),
    expiresAt: row.expiresAt.toISOString(),
    joined: joinedIds.has(row.id),
  };
}

/**
 * Faol guruh xaridlari. Muddati o'tmagan OPEN guruhlar + endigina to'lgan
 * (COMPLETED) guruhlar ko'rsatiladi. Bo'sh bo'lsa — BO'SH massiv qaytadi
 * (mock ko'rsatilmaydi: sahifa "hozircha guruh yo'q" holatini chiqaradi).
 */
/** To'lgan guruh ro'yxatda shu muddat davomida ko'rinib turadi. */
const COMPLETED_VISIBLE_DAYS = 7;

export async function listActiveDeals(userId: string | null): Promise<GroupDealView[]> {
  const now = new Date();
  // Ilgari `status: 'COMPLETED'` shartsiz turardi — ya'ni to'lgan guruh
  // ro'yxatdan HECH QACHON chiqmasdi va sahifa vaqt o'tishi bilan eski
  // guruhlar bilan to'lib borardi (kod izohi esa "endigina to'lgan" deb
  // da'vo qilardi).
  const completedSince = new Date(now.getTime() - COMPLETED_VISIBLE_DAYS * 24 * 60 * 60 * 1000);

  let rows: DealRow[];
  try {
    rows = await prisma.groupBuy.findMany({
      where: {
        OR: [
          { status: 'OPEN', expiresAt: { gt: now } },
          { status: 'COMPLETED', completedAt: { gte: completedSince } },
        ],
        product: { status: 'ACTIVE', deletedAt: null },
      },
      // Tugashiga eng kam vaqt qolgani birinchi — mijoz uchun eng dolzarbi.
      orderBy: [{ status: 'asc' }, { expiresAt: 'asc' }],
      take: 24,
      select: dealSelect,
    });
  } catch (e) {
    // Deploy tartibi himoyasi: kod migratsiyadan OLDIN chiqib ketsa,
    // GroupBuy jadvali hali yo'q (P2021) va sahifa 500 beradi. Bunday holda
    // ro'yxatni BO'SH ko'rsatamiz — soxta ma'lumot emas, shunchaki "guruh
    // yo'q". Xato jim qolmaydi: Sentry'ga signal ketadi.
    Sentry.captureException(e);
    return [];
  }

  // Joriy foydalanuvchining a'zoligini BITTA so'rovda olamiz (N+1 yo'q).
  let joinedIds = new Set<string>();
  if (userId && rows.length > 0) {
    const mine = await prisma.groupBuyMember.findMany({
      where: { userId, groupBuyId: { in: rows.map((r) => r.id) } },
      select: { groupBuyId: true },
    });
    joinedIds = new Set(mine.map((m) => m.groupBuyId));
  }

  return rows.map((r) => toView(r, joinedIds, now));
}

const REJECTION_MESSAGE: Record<JoinRejection, string> = {
  ALREADY_MEMBER: 'Siz bu guruhga allaqachon qo‘shilgansiz',
  NOT_OPEN: 'Bu guruh yopilgan',
  EXPIRED: 'Guruh muddati tugagan',
  FULL: 'Guruhda joy qolmagan',
};

const REJECTION_STATUS: Record<JoinRejection, number> = {
  ALREADY_MEMBER: 409,
  NOT_OPEN: 409,
  EXPIRED: 409,
  FULL: 409,
};

export interface JoinResult {
  deal: GroupDealView;
  /** Shu qo'shilish guruhni to'ldirdimi. */
  completed: boolean;
}

/**
 * Guruhga qo'shilish. ATOMIK: a'zo yozuvi va guruh statusi bitta
 * tranzaksiyada. Ikki marta bosish / parallel so'rov `@@unique([groupBuyId,
 * userId])` bilan DB darajasida to'xtatiladi — sun'iy hisoblagich emas.
 */
export async function joinDeal(dealId: string, userId: string): Promise<JoinResult> {
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const row = await tx.groupBuy.findUnique({
      where: { id: dealId },
      select: { ...dealSelect, completedAt: true },
    });
    if (!row) throw new GroupBuyError(404, 'NOT_FOUND', 'Guruh topilmadi');

    const alreadyMember =
      (await tx.groupBuyMember.count({ where: { groupBuyId: dealId, userId } })) > 0;

    const state = {
      status: row.status as GroupBuyStatusKey,
      targetSize: row.targetSize,
      currentSize: row._count.members,
      expiresAt: row.expiresAt,
    };

    const rejection = canJoin(state, { alreadyMember, now });
    if (rejection) {
      throw new GroupBuyError(REJECTION_STATUS[rejection], rejection, REJECTION_MESSAGE[rejection]);
    }

    await tx.groupBuyMember.create({ data: { groupBuyId: dealId, userId } });

    // Oxirgi joy to'lgan bo'lsa — guruhni yopamiz.
    const nextStatus = statusAfterJoin(state);
    if (nextStatus !== state.status) {
      await tx.groupBuy.update({
        where: { id: dealId },
        data: { status: nextStatus, completedAt: now },
      });
    }

    const fresh = await tx.groupBuy.findUniqueOrThrow({
      where: { id: dealId },
      select: dealSelect,
    });
    return { fresh, completed: nextStatus === 'COMPLETED' };
  });

  return {
    deal: toView(result.fresh, new Set([dealId]), now),
    completed: result.completed,
  };
}

/**
 * Guruhdan chiqish — faqat guruh hali OPEN bo'lsa. To'lgan guruhdan chiqish
 * boshqalarning kelishilgan narxini buzadi, shuning uchun taqiqlanadi.
 */
export async function leaveDeal(dealId: string, userId: string): Promise<GroupDealView> {
  const now = new Date();

  const fresh = await prisma.$transaction(async (tx) => {
    const row = await tx.groupBuy.findUnique({
      where: { id: dealId },
      select: { status: true },
    });
    if (!row) throw new GroupBuyError(404, 'NOT_FOUND', 'Guruh topilmadi');
    if (row.status !== 'OPEN') {
      throw new GroupBuyError(409, 'NOT_OPEN', 'Yopilgan guruhdan chiqib bo‘lmaydi');
    }

    const removed = await tx.groupBuyMember.deleteMany({
      where: { groupBuyId: dealId, userId },
    });
    if (removed.count === 0) {
      throw new GroupBuyError(404, 'NOT_MEMBER', 'Siz bu guruhda emassiz');
    }

    return tx.groupBuy.findUniqueOrThrow({ where: { id: dealId }, select: dealSelect });
  });

  return toView(fresh, new Set(), now);
}
