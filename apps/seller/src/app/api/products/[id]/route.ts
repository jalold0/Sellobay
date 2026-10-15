// Sotuvchining bitta tovari (audit Y1 — ilgari faqat yaratish va ro'yxat bor edi).
//
//   PATCH — tahrirlash: nom, tavsif, narx, eski narx.
//     • nom/tavsif o'zgarsa sotuvdagi tovar qayta tekshiruvga ketadi (PENDING_REVIEW) —
//       moderatsiyadan o'tgan matnni jimgina almashtirib bo'lmasin;
//     • faqat narx o'zgarsa tovar sotuvda qoladi (narx — sotuvchining biznes qarori).
//   POST { action } — holat:
//     • archive   — sotuvdan olish (DRAFT/PENDING_REVIEW/ACTIVE/OUT_OF_STOCK → ARCHIVED);
//     • resubmit  — rad etilgan yoki arxivdagi tovarni qayta tekshiruvga yuborish (→ PENDING_REVIEW).
//
// Hamma o'zgarish faqat FAOL sotuvchiga va faqat o'z tovariga; jurnalga yoziladi.

import { isValidCompareAtPrice, normalizeProductSpecs, readProductSpecs } from '@ecom/core-domain';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { moneySchema, optionalMoneySchema } from '@/lib/product-input';
import { requireSeller } from '@/lib/seller-access';

import type { Prisma, ProductStatus } from '@ecom/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z
  .object({
    nameUz: z.string().trim().min(2).max(200).optional(),
    nameRu: z.string().trim().min(2).max(200).optional(),
    nameEn: z.string().trim().min(2).max(200).optional(),
    descriptionUz: z.string().trim().max(5000).optional(),
    basePrice: moneySchema.optional(),
    compareAtPrice: optionalMoneySchema,
    specs: z.unknown().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'O‘zgartirish uchun hech narsa berilmagan',
  });

const actionSchema = z.object({ action: z.enum(['archive', 'resubmit']) });

const ACTIONS: Record<
  z.infer<typeof actionSchema>['action'],
  { from: ProductStatus[]; to: ProductStatus; wrongState: string }
> = {
  archive: {
    from: ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'OUT_OF_STOCK'],
    to: 'ARCHIVED',
    wrongState: 'Tovar allaqachon arxivda',
  },
  resubmit: {
    from: ['DRAFT', 'ARCHIVED'],
    to: 'PENDING_REVIEW',
    wrongState: 'Faqat rad etilgan yoki arxivdagi tovar qayta yuboriladi',
  },
};

type LocalizedJson = { uz?: string; ru?: string; en?: string };

async function loadOwnProduct(userId: string, productId: string) {
  const { seller, err } = await requireSeller(userId, 'write');
  if (err) return { err, product: null };
  if (!/^[a-f0-9-]{36}$/i.test(productId)) {
    return { err: apiError(400, 'VALIDATION', "Mahsulot ID noto'g'ri"), product: null };
  }
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: {
      id: true,
      sellerId: true,
      status: true,
      name: true,
      description: true,
      basePrice: true,
      compareAtPrice: true,
      specs: true,
    },
  });
  // Boshqa sotuvchining tovari — "topilmadi" (mavjudligini ham oshkor qilmaymiz).
  if (!product || product.sellerId !== seller.id) {
    return { err: apiError(404, 'NOT_FOUND', 'Mahsulot topilmadi'), product: null };
  }
  return { err: null, product };
}

function audit(
  tx: Prisma.TransactionClient,
  userId: string,
  productId: string,
  action: string,
  meta: Prisma.InputJsonValue,
) {
  return tx.auditLog.create({
    data: { userId, action, resource: 'Product', resourceId: productId, meta },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');
  const { err, product } = await loadOwnProduct(user.id, params.id);
  if (err) return err;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }
  const input = parsed.data;
  const specs = input.specs === undefined ? null : normalizeProductSpecs(input.specs);
  if (specs && !specs.ok) return apiError(400, 'VALIDATION', specs.error);
  if (product.status === 'ARCHIVED') {
    return apiError(409, 'ARCHIVED', 'Arxivdagi tovarni avval qayta yuboring');
  }

  const price = input.basePrice ?? product.basePrice.toFixed(2);
  const compareAt =
    input.compareAtPrice !== undefined
      ? input.compareAtPrice
      : product.compareAtPrice
        ? product.compareAtPrice.toFixed(2)
        : null;
  if (!isValidCompareAtPrice(price, compareAt)) {
    return apiError(400, 'VALIDATION', 'Eski narx yangi narxdan katta bo‘lishi kerak');
  }

  const name = (product.name ?? {}) as LocalizedJson;
  const description = (product.description ?? {}) as LocalizedJson;
  const nextName = {
    uz: input.nameUz ?? name.uz ?? '',
    ru: input.nameRu ?? name.ru ?? input.nameUz ?? name.uz ?? '',
    en: input.nameEn ?? name.en ?? input.nameUz ?? name.uz ?? '',
  };
  const contentChanged =
    nextName.uz !== name.uz ||
    nextName.ru !== name.ru ||
    nextName.en !== name.en ||
    (input.descriptionUz !== undefined && input.descriptionUz !== description.uz) ||
    // Xususiyat ham mijozga ko'rinadigan matn — o'zgarsa qayta tekshiruv.
    (specs?.ok === true &&
      JSON.stringify(specs.specs) !== JSON.stringify(readProductSpecs(product.specs)));

  // Sotuvdagi tovar matni o'zgarsa — qayta moderatsiya (dev'da avto-tasdiq yaratishdagi kabi).
  const autoApprove =
    process.env.SELLER_PRODUCT_AUTOAPPROVE === 'true' || process.env.NODE_ENV !== 'production';
  const live = product.status === 'ACTIVE' || product.status === 'OUT_OF_STOCK';
  const nextStatus: ProductStatus =
    contentChanged && live && !autoApprove ? 'PENDING_REVIEW' : product.status;

  const done = await prisma.$transaction(async (tx) => {
    const moved = await tx.product.updateMany({
      where: { id: product.id, status: product.status },
      data: {
        name: nextName,
        ...(input.descriptionUz !== undefined
          ? {
              description: {
                uz: input.descriptionUz,
                ru: description.ru || input.descriptionUz,
                en: description.en || input.descriptionUz,
              },
            }
          : {}),
        basePrice: price,
        compareAtPrice: compareAt,
        ...(specs?.ok ? { specs: specs.specs as unknown as Prisma.InputJsonValue } : {}),
        status: nextStatus,
      },
    });
    if (moved.count === 0) return false;
    await audit(tx, user.id, product.id, 'product.seller_edit', {
      contentChanged,
      priceFrom: product.basePrice.toFixed(2),
      priceTo: price,
      statusFrom: product.status,
      statusTo: nextStatus,
    });
    return true;
  });
  if (!done) return apiError(409, 'CONCURRENT_UPDATE', 'Tovar holati boshqa jarayonda o‘zgardi');

  return apiOk({
    product: { id: product.id, status: nextStatus },
    sentToReview: nextStatus === 'PENDING_REVIEW' && product.status !== 'PENDING_REVIEW',
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');
  const { err, product } = await loadOwnProduct(user.id, params.id);
  if (err) return err;

  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', "action 'archive' yoki 'resubmit' bo'lishi kerak");
  }
  const rule = ACTIONS[parsed.data.action];
  if (!rule.from.includes(product.status)) {
    return apiError(409, 'INVALID_STATE', rule.wrongState);
  }

  const done = await prisma.$transaction(async (tx) => {
    const moved = await tx.product.updateMany({
      where: { id: product.id, status: product.status },
      data: { status: rule.to },
    });
    if (moved.count === 0) return false;
    await audit(tx, user.id, product.id, `product.seller_${parsed.data.action}`, {
      from: product.status,
      to: rule.to,
    });
    return true;
  });
  if (!done) return apiError(409, 'CONCURRENT_UPDATE', 'Tovar holati boshqa jarayonda o‘zgardi');

  return apiOk({ product: { id: product.id, status: rule.to } });
}
