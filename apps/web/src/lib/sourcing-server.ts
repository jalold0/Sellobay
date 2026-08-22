// Global sourcing biznes-servisi (application qatlami) — "Havola orqali buyurtma".
// HTTP'ga bog'liq emas: route (interface) faqat parse/auth/rate-limit qilib shu yerga keladi.
// Narx hisobi @ecom/core-domain/global-pricing da — bu yerda takrorlanmaydi.
//
// Oqim: mijoz havola yuboradi (NEW) → operator tekshiradi (IN_REVIEW) →
//       narx taklif qiladi (QUOTED) → mijoz qabul/rad etadi (ACCEPTED/REJECTED) →
//       to'lovdan keyin Order'ga aylanadi (ORDERED).

import {
  DEFAULT_GLOBAL_CONFIG,
  parseSourcingLink,
  priceGlobalItem,
  type FreightMode,
  type GlobalPricingConfig,
  type SourcingPlatform,
} from '@ecom/core-domain';
import { Prisma } from '@ecom/database';
import { z } from 'zod';

import { prisma } from '@/lib/db';

export class SourcingError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'SourcingError';
  }
}

/** Taklif shuncha soatdan keyin kuchini yo'qotadi (kurs va Xitoy narxi o'zgaradi). */
export const QUOTE_TTL_HOURS = 48;

/** Bitta mijozda bir vaqtda ochiq turishi mumkin bo'lgan so'rovlar soni (spam himoyasi). */
export const MAX_OPEN_REQUESTS = 15;

/** Mijoz javobini kutayotgan / ish jarayonidagi statuslar. */
const OPEN_STATUSES = ['NEW', 'IN_REVIEW', 'QUOTED', 'ACCEPTED'] as const;

const OPERATOR_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;

type CurrentUser = { id: string; roles?: string[] } | null;

function assertOperator(user: CurrentUser): asserts user is { id: string; roles: string[] } {
  if (!user) throw new SourcingError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');
  const roles = user.roles ?? [];
  if (!roles.some((r) => (OPERATOR_ROLES as readonly string[]).includes(r))) {
    throw new SourcingError(403, 'FORBIDDEN', 'Bu amal uchun ruxsat yo‘q');
  }
}

function generateRequestNumber(): string {
  const year = 2026; // statik — server timezone'iga bog'lanmaymiz (orders-server bilan bir xil qoida)
  const rand = Math.floor(Math.random() * 99_999_999)
    .toString()
    .padStart(8, '0');
  return `SRQ-${year}-${rand}`;
}

// ===================================================================
// Sxemalar
// ===================================================================

export const createSourcingRequestSchema = z.object({
  url: z.string().min(5, 'Havolani kiriting').max(2000),
  qty: z.number().int().positive().max(999).default(1),
  freightMode: z.enum(['AUTO', 'AVIA']).default('AUTO'),
  variantNote: z.string().max(300).optional(),
  customerNote: z.string().max(1000).optional(),
});
export type CreateSourcingRequestInput = z.infer<typeof createSourcingRequestSchema>;

export const quoteSourcingRequestSchema = z.object({
  /** Taobao'dagi dona narxi (CNY). */
  priceCny: z.number().positive().max(1_000_000),
  /** Bir donaning og'irligi (kg). */
  weightKg: z.number().positive().max(1000),
  /** O'lchamlari (sm) — hajmiy og'irlik uchun. */
  dimsCm: z
    .object({
      l: z.number().positive().max(500),
      w: z.number().positive().max(500),
      h: z.number().positive().max(500),
    })
    .optional(),
  /** Xitoy ichki dostavkasi (CNY) — butun pozitsiya uchun. */
  chinaDomesticCny: z.number().min(0).max(100_000).optional(),
  /** Operator yuk turini o'zgartirishi mumkin (masalan tovar avia'ga taqiqlangan). */
  freightMode: z.enum(['AUTO', 'AVIA']).optional(),
  /** Aniqlangan haqiqiy son (masalan minimal partiya sababli). */
  qty: z.number().int().positive().max(999).optional(),
  /** Shu so'rov uchun maxsus marja (0.25 = 25%). Berilmasa — standart. */
  marginPct: z.number().min(0).max(5).optional(),
  operatorNote: z.string().max(1000).optional(),
});
export type QuoteSourcingRequestInput = z.infer<typeof quoteSourcingRequestSchema>;

export const respondToQuoteSchema = z.object({
  action: z.enum(['ACCEPT', 'REJECT']),
  reason: z.string().max(500).optional(),
});

export const markUnavailableSchema = z.object({
  reason: z.string().min(3).max(500),
});

// ===================================================================
// O'qish uchun mapping (Decimal → number, mijozga xavfsiz maydonlar)
// ===================================================================

type SourcingRow = Awaited<ReturnType<typeof prisma.sourcingRequest.findFirst>>;

function num(v: Prisma.Decimal | null): number | null {
  return v === null ? null : Number(v);
}

function toPublic(r: NonNullable<SourcingRow>) {
  return {
    id: r.id,
    number: r.number,
    status: r.status,
    platform: r.platform,
    sourceUrl: r.sourceUrl,
    normalizedUrl: r.normalizedUrl,
    externalItemId: r.externalItemId,
    needsResolve: r.needsResolve,
    qty: r.qty,
    freightMode: r.freightMode,
    variantNote: r.variantNote,
    customerNote: r.customerNote,
    quotedTotal: num(r.quotedTotal),
    quotedUnit: num(r.quotedUnit),
    leadTimeMinDays: r.leadTimeMinDays,
    leadTimeMaxDays: r.leadTimeMaxDays,
    quoteExpiresAt: r.quoteExpiresAt?.toISOString() ?? null,
    quotedAt: r.quotedAt?.toISOString() ?? null,
    operatorNote: r.operatorNote,
    orderId: r.orderId,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Operator ko'radigan to'liq ko'rinish — tannarx va hisob-kitob bilan. */
function toOperator(r: NonNullable<SourcingRow>) {
  return {
    ...toPublic(r),
    userId: r.userId,
    quotedPriceCny: num(r.quotedPriceCny),
    quotedWeightKg: num(r.quotedWeightKg),
    breakdown: r.quotedBreakdown,
  };
}

export type PublicSourcingRequest = ReturnType<typeof toPublic>;

/** Taklif muddati o'tganmi (DB'da EXPIRED bo'lmasa ham). */
function isQuoteExpired(r: { status: string; quoteExpiresAt: Date | null }, now: Date): boolean {
  return r.status === 'QUOTED' && r.quoteExpiresAt !== null && r.quoteExpiresAt < now;
}

// ===================================================================
// Mijoz amallari
// ===================================================================

export async function createSourcingRequest(
  input: CreateSourcingRequestInput,
  currentUser: CurrentUser,
) {
  if (!currentUser) throw new SourcingError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const link = parseSourcingLink(input.url);
  if (!link.ok) {
    const messages: Record<typeof link.error, string> = {
      INVALID_URL: 'Havola noto‘g‘ri — to‘liq manzilni nusxalab qo‘ying',
      UNSUPPORTED_HOST: 'Hozircha faqat Taobao, Tmall, 1688 va Weidian havolalari qabul qilinadi',
      NO_ITEM_ID: 'Bu havolada tovar topilmadi — mahsulot sahifasining havolasini yuboring',
    };
    throw new SourcingError(400, `LINK_${link.error}`, messages[link.error]);
  }

  const openCount = await prisma.sourcingRequest.count({
    where: { userId: currentUser.id, status: { in: [...OPEN_STATUSES] } },
  });
  if (openCount >= MAX_OPEN_REQUESTS) {
    throw new SourcingError(
      429,
      'TOO_MANY_OPEN',
      `Sizda ${MAX_OPEN_REQUESTS} ta ochiq so‘rov bor — avval ularga javob bering`,
    );
  }

  // Bir xil tovarni ikki marta yubormaslik: ochiq so'rov bo'lsa o'shani qaytaramiz.
  const duplicate = await prisma.sourcingRequest.findFirst({
    where: {
      userId: currentUser.id,
      normalizedUrl: link.normalizedUrl,
      status: { in: [...OPEN_STATUSES] },
    },
  });
  if (duplicate) return { request: toPublic(duplicate), duplicate: true };

  const created = await prisma.sourcingRequest.create({
    data: {
      number: generateRequestNumber(),
      userId: currentUser.id,
      sourceUrl: input.url.trim().slice(0, 2000),
      normalizedUrl: link.normalizedUrl,
      platform: link.platform as SourcingPlatform,
      externalItemId: link.itemId,
      needsResolve: link.needsResolve,
      qty: input.qty,
      freightMode: input.freightMode,
      variantNote: input.variantNote?.trim() || null,
      customerNote: input.customerNote?.trim() || null,
    },
  });

  return { request: toPublic(created), duplicate: false };
}

export async function listUserSourcingRequests(userId: string) {
  const rows = await prisma.sourcingRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const now = new Date();
  return {
    items: rows.map((r) => {
      const pub = toPublic(r);
      // Muddati o'tgan taklif mijozga EXPIRED bo'lib ko'rinadi (DB'ni yozmasdan).
      return isQuoteExpired(r, now) ? { ...pub, status: 'EXPIRED' as const } : pub;
    }),
  };
}

export async function getUserSourcingRequest(id: string, userId: string) {
  const row = await prisma.sourcingRequest.findFirst({ where: { id, userId } });
  if (!row) throw new SourcingError(404, 'NOT_FOUND', 'So‘rov topilmadi');
  const pub = toPublic(row);
  return isQuoteExpired(row, new Date()) ? { ...pub, status: 'EXPIRED' as const } : pub;
}

/** Mijoz taklifni qabul qiladi yoki rad etadi. */
export async function respondToQuote(
  id: string,
  userId: string,
  input: z.infer<typeof respondToQuoteSchema>,
) {
  const row = await prisma.sourcingRequest.findFirst({ where: { id, userId } });
  if (!row) throw new SourcingError(404, 'NOT_FOUND', 'So‘rov topilmadi');

  if (row.status !== 'QUOTED') {
    throw new SourcingError(409, 'NOT_QUOTED', 'Bu so‘rovda javob kutilayotgan taklif yo‘q');
  }
  if (isQuoteExpired(row, new Date())) {
    // Muddati o'tgani DB'da ham qayd etilsin — navbatda osilib qolmasin
    await prisma.sourcingRequest.update({ where: { id }, data: { status: 'EXPIRED' } });
    throw new SourcingError(409, 'QUOTE_EXPIRED', 'Taklif muddati tugagan — yangi hisob so‘rang');
  }

  const updated = await prisma.sourcingRequest.update({
    where: { id },
    data: {
      status: input.action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
      respondedAt: new Date(),
      ...(input.action === 'REJECT' && input.reason ? { customerNote: input.reason } : {}),
    },
  });
  return toPublic(updated);
}

/** Mijoz o'z so'rovini bekor qiladi (hali ORDERED bo'lmagan bo'lsa). */
export async function cancelSourcingRequest(id: string, userId: string) {
  const row = await prisma.sourcingRequest.findFirst({ where: { id, userId } });
  if (!row) throw new SourcingError(404, 'NOT_FOUND', 'So‘rov topilmadi');
  if (row.status === 'ORDERED') {
    throw new SourcingError(409, 'ALREADY_ORDERED', 'Buyurtma berilgan — bekor qilib bo‘lmaydi');
  }
  const updated = await prisma.sourcingRequest.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });
  return toPublic(updated);
}

// ===================================================================
// Operator amallari
// ===================================================================

export async function listSourcingQueue(
  currentUser: CurrentUser,
  filter: { status?: string; take?: number } = {},
) {
  assertOperator(currentUser);
  const rows = await prisma.sourcingRequest.findMany({
    where: filter.status ? { status: filter.status as never } : {},
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    take: Math.min(filter.take ?? 100, 200),
  });
  return { items: rows.map(toOperator) };
}

/**
 * Operator narx taklif qiladi. Hisob core-domain'da — bu yerda faqat
 * kirish ma'lumotlari yig'iladi va natija saqlanadi.
 */
export async function quoteSourcingRequest(
  id: string,
  input: QuoteSourcingRequestInput,
  currentUser: CurrentUser,
  config: GlobalPricingConfig = DEFAULT_GLOBAL_CONFIG,
) {
  assertOperator(currentUser);

  const row = await prisma.sourcingRequest.findUnique({ where: { id } });
  if (!row) throw new SourcingError(404, 'NOT_FOUND', 'So‘rov topilmadi');
  if (row.status === 'ORDERED' || row.status === 'CANCELLED') {
    throw new SourcingError(409, 'CLOSED', 'Bu so‘rov yopilgan');
  }

  const qty = input.qty ?? row.qty;
  const mode = (input.freightMode ?? row.freightMode) as FreightMode;
  const effectiveConfig: GlobalPricingConfig =
    input.marginPct === undefined ? config : { ...config, marginPct: input.marginPct };

  const breakdown = priceGlobalItem(
    {
      priceCny: input.priceCny,
      qty,
      weightKg: input.weightKg,
      dimsCm: input.dimsCm,
      chinaDomesticCny: input.chinaDomesticCny,
      mode,
    },
    effectiveConfig,
  );

  const now = new Date();
  const updated = await prisma.sourcingRequest.update({
    where: { id },
    data: {
      status: 'QUOTED',
      qty,
      freightMode: mode,
      quotedPriceCny: new Prisma.Decimal(input.priceCny),
      quotedWeightKg: new Prisma.Decimal(breakdown.chargeableKg.toFixed(3)),
      quotedTotal: new Prisma.Decimal(breakdown.totalUzs.toFixed(2)),
      quotedUnit: new Prisma.Decimal(breakdown.unitUzs.toFixed(2)),
      // Audit: qaysi kurs/tarif/marja bilan hisoblanganini saqlaymiz — keyin bahslashmaslik uchun
      quotedBreakdown: {
        input: { ...input, qty, mode },
        config: effectiveConfig,
        result: breakdown,
      } as unknown as Prisma.InputJsonValue,
      leadTimeMinDays: breakdown.leadTimeDays[0],
      leadTimeMaxDays: breakdown.leadTimeDays[1],
      quotedAt: now,
      quotedById: currentUser.id,
      quoteExpiresAt: new Date(now.getTime() + QUOTE_TTL_HOURS * 60 * 60 * 1000),
      operatorNote: input.operatorNote?.trim() || null,
      respondedAt: null,
    },
  });

  return toOperator(updated);
}

/** Operator: tovar topilmadi / sotuvda yo'q / taqiqlangan toifa. */
export async function markSourcingUnavailable(
  id: string,
  reason: string,
  currentUser: CurrentUser,
) {
  assertOperator(currentUser);
  const row = await prisma.sourcingRequest.findUnique({ where: { id } });
  if (!row) throw new SourcingError(404, 'NOT_FOUND', 'So‘rov topilmadi');

  const updated = await prisma.sourcingRequest.update({
    where: { id },
    data: { status: 'UNAVAILABLE', operatorNote: reason.trim() },
  });
  return toOperator(updated);
}

/** Operator so'rovni "tekshiryapman" holatiga o'tkazadi (mijoz kutayotganini bilsin). */
export async function markSourcingInReview(id: string, currentUser: CurrentUser) {
  assertOperator(currentUser);
  const row = await prisma.sourcingRequest.findUnique({ where: { id } });
  if (!row) throw new SourcingError(404, 'NOT_FOUND', 'So‘rov topilmadi');
  if (row.status !== 'NEW') {
    throw new SourcingError(409, 'INVALID_STATE', 'Faqat yangi so‘rovni tekshiruvga olish mumkin');
  }
  const updated = await prisma.sourcingRequest.update({
    where: { id },
    data: { status: 'IN_REVIEW' },
  });
  return toOperator(updated);
}
