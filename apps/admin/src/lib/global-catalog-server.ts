// Global katalog biznes-servisi (application qatlami) — Xitoy tovarini katalogga import qilish.
//
// MODEL: alohida "GlobalProduct" YO'Q. Oddiy `Product` yaratiladi, unga Xitoyga oid
// ma'lumot 1-1 `GlobalSource` yozuvi sifatida ulanadi. Shu sabab katalog, savat,
// checkout, wishlist va qidiruv global tovar bilan ham o'zgarishsiz ishlaydi.
//
// NARX: `basePrice` — mijoz ko'radigan YAKUNIY so'm narxi. U @ecom/core-domain
// dvigatelida hisoblanadi (yuk, agent, boj, kurs zaxirasi, marja, ekvayring gross-up).
// Bu yerda formula TAKRORLANMAYDI.

import {
  DEFAULT_GLOBAL_CONFIG,
  estimateWeightKg,
  parseSourcingLink,
  priceGlobalItem,
  weightGuaranteeCeilingKg,
  type GlobalPriceBreakdown,
  type GlobalPricingConfig,
  type WeightCategory,
} from '@ecom/core-domain';
import { Prisma } from '@ecom/database';
import { slugify } from '@ecom/utils';
import { z } from 'zod';

import { prisma } from '@/lib/db';

export class GlobalCatalogError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'GlobalCatalogError';
  }
}

/** Kafolat koridori: ko'rsatilgan narx shu og'irlikkacha amal qiladi. */
export const WEIGHT_GUARANTEE_PCT = 0.2;

const WEIGHT_CATEGORIES = [
  'TSHIRT',
  'OUTERWEAR',
  'SHOES',
  'BAG',
  'ACCESSORY',
  'SMALL_ELECTRONICS',
  'COSMETICS',
  'TOY',
  'HOME',
  'OTHER',
] as const;

const localizedText = z.object({
  uz: z.string().min(1, 'Nomi (uz) majburiy').max(300),
  ru: z.string().max(300).optional(),
  en: z.string().max(300).optional(),
});

/** Narx hisobiga ta'sir qiladigan maydonlar — preview ham, import ham shuni ishlatadi. */
const pricingFields = {
  priceCny: z.number().positive().max(1_000_000),
  chinaDomesticCny: z.number().min(0).max(100_000).optional(),
  weightCategory: z.enum(WEIGHT_CATEGORIES).default('OTHER'),
  manualWeightKg: z.number().positive().max(500).optional(),
  dimsCm: z
    .object({
      l: z.number().positive().max(500),
      w: z.number().positive().max(500),
      h: z.number().positive().max(500),
    })
    .optional(),
  freightMode: z.enum(['AUTO', 'AVIA']).default('AUTO'),
  marginPct: z.number().min(0).max(5).optional(),
};

export const previewGlobalPriceSchema = z.object(pricingFields);
export type PreviewGlobalPriceInput = z.infer<typeof previewGlobalPriceSchema>;

export const importGlobalProductSchema = z.object({
  url: z.string().min(5).max(2000),
  name: localizedText,
  description: localizedText.partial().optional(),
  images: z.array(z.string().url().max(1000)).max(12).default([]),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  /** Darhol sotuvga chiqsinmi yoki qoralama bo'lib tursinmi. */
  publish: z.boolean().default(false),
  ...pricingFields,
});
export type ImportGlobalProductInput = z.infer<typeof importGlobalProductSchema>;

export const repriceGlobalProductSchema = z.object({
  /** Xitoyda ko'rilgan yangi narx. */
  priceCny: z.number().positive().max(1_000_000).optional(),
  /** Kargo tortgan HAQIQIY og'irlik (bir dona) — taxminning o'rnini egallaydi. */
  actualWeightKg: z.number().positive().max(500).optional(),
  weightCategory: z.enum(WEIGHT_CATEGORIES).optional(),
  marginPct: z.number().min(0).max(5).optional(),
  freightMode: z.enum(['AUTO', 'AVIA']).optional(),
  isAvailable: z.boolean().optional(),
});
export type RepriceGlobalProductInput = z.infer<typeof repriceGlobalProductSchema>;

type Operator = { id: string; roles?: string[] } | null;

const OPERATOR_ROLES = ['ADMIN', 'SUPER_ADMIN'];

function assertOperator(user: Operator): asserts user is { id: string; roles: string[] } {
  if (!user) throw new GlobalCatalogError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');
  if (!user.roles?.some((r) => OPERATOR_ROLES.includes(r))) {
    throw new GlobalCatalogError(403, 'FORBIDDEN', "Ruxsat yo'q (faqat admin)");
  }
}

// ===================================================================
// Narx hisobi — import ham, preview ham, qayta hisoblash ham shu yerdan
// ===================================================================

export interface GlobalPriceComputation {
  breakdown: GlobalPriceBreakdown;
  /** Bir dona uchun ishlatilgan og'irlik (kg) va uning manbai. */
  weight: ReturnType<typeof estimateWeightKg>;
  /** Ko'rsatilgan narx shu og'irlikkacha kafolatlanadi (kg). */
  guaranteeCeilingKg: number;
  config: GlobalPricingConfig;
}

/**
 * Bitta dona uchun yakuniy so'm narxini hisoblaydi.
 * Katalogda mahsulot narxi har doim 1 dona uchun ko'rsatiladi.
 */
export function computeGlobalPrice(
  input: PreviewGlobalPriceInput & { actualWeightKg?: number | null },
  baseConfig: GlobalPricingConfig = DEFAULT_GLOBAL_CONFIG,
): GlobalPriceComputation {
  const weight = estimateWeightKg({
    category: input.weightCategory as WeightCategory,
    qty: 1,
    actualWeightKg: input.actualWeightKg ?? null,
    manualWeightKg: input.manualWeightKg ?? null,
  });

  const config: GlobalPricingConfig =
    input.marginPct === undefined ? baseConfig : { ...baseConfig, marginPct: input.marginPct };

  const breakdown = priceGlobalItem(
    {
      priceCny: input.priceCny,
      qty: 1,
      weightKg: weight.kg,
      dimsCm: input.dimsCm,
      chinaDomesticCny: input.chinaDomesticCny,
      mode: input.freightMode,
      weightIsEstimated: weight.isEstimated,
    },
    config,
  );

  return {
    breakdown,
    weight,
    guaranteeCeilingKg: weightGuaranteeCeilingKg(
      breakdown.chargeableKg,
      breakdown.weightIsEstimated,
      WEIGHT_GUARANTEE_PCT,
    ),
    config,
  };
}

export function previewGlobalPrice(input: PreviewGlobalPriceInput, user: Operator) {
  assertOperator(user);
  const c = computeGlobalPrice(input);
  return {
    totalUzs: c.breakdown.totalUzs,
    chargeableKg: c.breakdown.chargeableKg,
    weightKg: c.weight.kg,
    weightSource: c.weight.source,
    guaranteeCeilingKg: c.guaranteeCeilingKg,
    leadTimeDays: c.breakdown.leadTimeDays,
    costs: c.breakdown.costs,
  };
}

// ===================================================================
// Import
// ===================================================================

/** Bir xil slug bo'lsa oxiriga -2, -3 ... qo'shadi. */
async function uniqueSlug(base: string): Promise<string> {
  const root = base || 'global-tovar';
  const taken = await prisma.product.findMany({
    where: { slug: { startsWith: root } },
    select: { slug: true },
  });
  if (!taken.some((p) => p.slug === root)) return root;
  for (let i = 2; i < 500; i += 1) {
    const candidate = `${root}-${i}`;
    if (!taken.some((p) => p.slug === candidate)) return candidate;
  }
  throw new GlobalCatalogError(409, 'SLUG_EXHAUSTED', 'Slug band — nomni o‘zgartiring');
}

function skuFor(platform: string, itemId: string | null): string {
  const suffix = itemId ?? Math.floor(Math.random() * 99_999_999).toString();
  return `GL-${platform.slice(0, 3).toUpperCase()}-${suffix}`;
}

export async function importGlobalProduct(input: ImportGlobalProductInput, user: Operator) {
  assertOperator(user);

  const link = parseSourcingLink(input.url);
  if (!link.ok) {
    throw new GlobalCatalogError(400, `LINK_${link.error}`, 'Havola qabul qilinmadi');
  }
  if (link.needsResolve || !link.itemId) {
    throw new GlobalCatalogError(
      400,
      'LINK_NEEDS_RESOLVE',
      'Qisqa havola — brauzerda ochib, to‘liq mahsulot havolasini kiriting',
    );
  }

  const duplicate = await prisma.globalSource.findFirst({
    where: { platform: link.platform, externalItemId: link.itemId },
    select: { id: true, productId: true, product: { select: { slug: true } } },
  });
  if (duplicate) {
    throw new GlobalCatalogError(
      409,
      'ALREADY_IMPORTED',
      `Bu tovar allaqachon katalogda: /${duplicate.product.slug}`,
    );
  }

  const priced = computeGlobalPrice(input);
  const slug = await uniqueSlug(slugify(input.name.uz));

  const created = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        slug,
        sku: skuFor(link.platform, link.itemId),
        name: input.name as unknown as Prisma.InputJsonValue,
        description: (input.description ?? {}) as unknown as Prisma.InputJsonValue,
        status: input.publish ? 'ACTIVE' : 'DRAFT',
        basePrice: new Prisma.Decimal(priced.breakdown.totalUzs.toFixed(2)),
        currency: 'UZS',
        // Katalogda gramm sifatida saqlanadi — mavjud Product maydoni
        weightGrams: Math.round(priced.breakdown.chargeableKg * 1000),
        publishedAt: input.publish ? new Date() : null,
        ...(input.brandId ? { brandId: input.brandId } : {}),
        ...(input.categoryId ? { categories: { create: [{ categoryId: input.categoryId }] } } : {}),
        ...(input.images.length
          ? {
              images: {
                create: input.images.map((url, i) => ({ url, position: i, isPrimary: i === 0 })),
              },
            }
          : {}),
      },
      select: { id: true, slug: true, sku: true, status: true },
    });

    const source = await tx.globalSource.create({
      data: {
        productId: product.id,
        platform: link.platform,
        sourceUrl: input.url.trim().slice(0, 2000),
        normalizedUrl: link.normalizedUrl,
        externalItemId: link.itemId,
        priceCny: new Prisma.Decimal(input.priceCny),
        chinaDomesticCny:
          input.chinaDomesticCny === undefined ? null : new Prisma.Decimal(input.chinaDomesticCny),
        lastSeenPriceCny: new Prisma.Decimal(input.priceCny),
        priceCheckedAt: new Date(),
        weightCategory: input.weightCategory,
        manualWeightKg:
          input.manualWeightKg === undefined ? null : new Prisma.Decimal(input.manualWeightKg),
        estimatedWeightKg: new Prisma.Decimal(priced.weight.kg.toFixed(3)),
        lengthCm: input.dimsCm ? new Prisma.Decimal(input.dimsCm.l) : null,
        widthCm: input.dimsCm ? new Prisma.Decimal(input.dimsCm.w) : null,
        heightCm: input.dimsCm ? new Prisma.Decimal(input.dimsCm.h) : null,
        defaultFreightMode: input.freightMode,
        marginPct: input.marginPct === undefined ? null : new Prisma.Decimal(input.marginPct),
        priceBreakdown: {
          input: { ...input, images: undefined },
          config: priced.config,
          result: priced.breakdown,
          guaranteeCeilingKg: priced.guaranteeCeilingKg,
        } as unknown as Prisma.InputJsonValue,
        pricedAt: new Date(),
      },
      select: { id: true },
    });

    return { product, sourceId: source.id };
  });

  return {
    productId: created.product.id,
    globalSourceId: created.sourceId,
    slug: created.product.slug,
    sku: created.product.sku,
    status: created.product.status,
    priceUzs: priced.breakdown.totalUzs,
    chargeableKg: priced.breakdown.chargeableKg,
    weightSource: priced.weight.source,
    guaranteeCeilingKg: priced.guaranteeCeilingKg,
  };
}

// ===================================================================
// Ro'yxat va qayta hisoblash
// ===================================================================

export async function listGlobalProducts(user: Operator, take = 100) {
  assertOperator(user);

  const rows = await prisma.globalSource.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(take, 300),
    select: {
      id: true,
      platform: true,
      normalizedUrl: true,
      externalItemId: true,
      priceCny: true,
      lastSeenPriceCny: true,
      priceCheckedAt: true,
      weightCategory: true,
      estimatedWeightKg: true,
      actualWeightKg: true,
      weightSamples: true,
      defaultFreightMode: true,
      isAvailable: true,
      createdAt: true,
      product: {
        select: { id: true, slug: true, sku: true, name: true, status: true, basePrice: true },
      },
    },
  });

  return {
    items: rows.map((r) => ({
      id: r.id,
      productId: r.product.id,
      slug: r.product.slug,
      sku: r.product.sku,
      name: r.product.name,
      productStatus: r.product.status,
      priceUzs: Number(r.product.basePrice),
      platform: r.platform,
      normalizedUrl: r.normalizedUrl,
      externalItemId: r.externalItemId,
      priceCny: Number(r.priceCny),
      lastSeenPriceCny: r.lastSeenPriceCny === null ? null : Number(r.lastSeenPriceCny),
      priceCheckedAt: r.priceCheckedAt?.toISOString() ?? null,
      weightCategory: r.weightCategory,
      estimatedWeightKg: Number(r.estimatedWeightKg),
      actualWeightKg: r.actualWeightKg === null ? null : Number(r.actualWeightKg),
      weightSamples: r.weightSamples,
      freightMode: r.defaultFreightMode,
      isAvailable: r.isAvailable,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/**
 * Narxni qayta hisoblaydi. Ikki holatda ishlatiladi:
 *  - Xitoyda narx o'zgargan (`priceCny`),
 *  - kargo tovarni tortgan (`actualWeightKg`) — taxmin o'lchov bilan almashadi
 *    va zaxira endi qo'llanmaydi, ya'ni narx odatda PASAYADI.
 */
export async function repriceGlobalProduct(
  globalSourceId: string,
  input: RepriceGlobalProductInput,
  user: Operator,
) {
  assertOperator(user);

  const source = await prisma.globalSource.findUnique({
    where: { id: globalSourceId },
    select: {
      id: true,
      productId: true,
      priceCny: true,
      chinaDomesticCny: true,
      weightCategory: true,
      manualWeightKg: true,
      actualWeightKg: true,
      weightSamples: true,
      lengthCm: true,
      widthCm: true,
      heightCm: true,
      defaultFreightMode: true,
      marginPct: true,
      product: { select: { basePrice: true } },
    },
  });
  if (!source) throw new GlobalCatalogError(404, 'NOT_FOUND', 'Tovar topilmadi');

  const priceCny = input.priceCny ?? Number(source.priceCny);
  const actualWeightKg =
    input.actualWeightKg ?? (source.actualWeightKg === null ? null : Number(source.actualWeightKg));
  const dims =
    source.lengthCm && source.widthCm && source.heightCm
      ? { l: Number(source.lengthCm), w: Number(source.widthCm), h: Number(source.heightCm) }
      : undefined;

  const priced = computeGlobalPrice({
    priceCny,
    chinaDomesticCny:
      source.chinaDomesticCny === null ? undefined : Number(source.chinaDomesticCny),
    weightCategory: (input.weightCategory ?? source.weightCategory) as WeightCategory,
    manualWeightKg: source.manualWeightKg === null ? undefined : Number(source.manualWeightKg),
    actualWeightKg,
    dimsCm: dims,
    freightMode: input.freightMode ?? source.defaultFreightMode,
    marginPct:
      input.marginPct ?? (source.marginPct === null ? undefined : Number(source.marginPct)),
  });

  const previousUzs = Number(source.product.basePrice);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: source.productId },
      data: {
        basePrice: new Prisma.Decimal(priced.breakdown.totalUzs.toFixed(2)),
        weightGrams: Math.round(priced.breakdown.chargeableKg * 1000),
      },
    });

    return tx.globalSource.update({
      where: { id: source.id },
      data: {
        priceCny: new Prisma.Decimal(priceCny),
        lastSeenPriceCny: new Prisma.Decimal(priceCny),
        priceCheckedAt: new Date(),
        estimatedWeightKg: new Prisma.Decimal(priced.weight.kg.toFixed(3)),
        ...(input.actualWeightKg !== undefined
          ? {
              actualWeightKg: new Prisma.Decimal(input.actualWeightKg),
              weightSamples: { increment: 1 },
            }
          : {}),
        ...(input.weightCategory ? { weightCategory: input.weightCategory } : {}),
        ...(input.freightMode ? { defaultFreightMode: input.freightMode } : {}),
        ...(input.marginPct !== undefined
          ? { marginPct: new Prisma.Decimal(input.marginPct) }
          : {}),
        ...(input.isAvailable !== undefined ? { isAvailable: input.isAvailable } : {}),
        priceBreakdown: {
          config: priced.config,
          result: priced.breakdown,
          guaranteeCeilingKg: priced.guaranteeCeilingKg,
        } as unknown as Prisma.InputJsonValue,
        pricedAt: new Date(),
      },
      select: { id: true, weightSamples: true, actualWeightKg: true },
    });
  });

  return {
    id: updated.id,
    previousUzs,
    priceUzs: priced.breakdown.totalUzs,
    diffUzs: priced.breakdown.totalUzs - previousUzs,
    chargeableKg: priced.breakdown.chargeableKg,
    weightSource: priced.weight.source,
    weightSamples: updated.weightSamples,
    guaranteeCeilingKg: priced.guaranteeCeilingKg,
  };
}
