// GET   /api/marketplace/settings — komissiya, xizmat haqi, topshirish muddati, to'lov kunlari
// PATCH /api/marketplace/settings — saqlash (ADR 0015)
//
// Tariflar shartnoma bilan o'zgaradi — deploy'siz shu yerdan. Yangi qiymatlar keyingi
// jo'natmalar (muddat) va keyingi yetkazilgan buyurtmalar (hisob-kitob) uchun qo'llanadi;
// allaqachon yozilganlar o'zgarmaydi.

import { DEFAULT_MARKETPLACE_SETTINGS, resolveMarketplaceSettings } from '@ecom/core-domain';
import { MARKETPLACE_SETTING_ID } from '@ecom/order-ops';
import { z } from 'zod';

import { requirePermission } from '@/lib/api-guard';
import { writeAudit } from '@/lib/audit';
import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { Prisma } from '@ecom/database';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const perModel = (schema: z.ZodNumber) => z.object({ FBS: schema, FBO: schema }).strict();

const schema = z
  .object({
    commissionPct: perModel(z.number().min(0).max(100)),
    feePerUnit: perModel(z.number().int('Butun so‘m').min(0).max(10_000_000)),
    handoverHours: perModel(
      z
        .number()
        .int('Butun soat')
        .min(1)
        .max(24 * 14),
    ),
    payoutDays: z
      .array(z.number().int().min(1).max(28, 'To‘lov kuni 1–28 oralig‘ida'))
      .min(1, 'Kamida bitta to‘lov kuni')
      .max(4)
      .refine((d) => new Set(d).size === d.length, 'Kunlar takrorlanmasin'),
  })
  .strict();

async function load() {
  const row = await prisma.globalSetting.findUnique({
    where: { id: MARKETPLACE_SETTING_ID },
    select: { config: true, updatedAt: true },
  });
  return {
    effective: resolveMarketplaceSettings(row?.config ?? null),
    defaults: DEFAULT_MARKETPLACE_SETTINGS,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}

export async function GET() {
  const { err } = await requirePermission('settings.manage');
  if (err) return err;
  return apiOk(await load());
}

export async function PATCH(req: NextRequest) {
  const { err, userId } = await requirePermission('settings.manage');
  if (err) return err;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return apiError(
      400,
      'VALIDATION',
      `${issue?.path.join('.') || 'qiymat'}: ${issue?.message ?? "noto'g'ri"}`,
    );
  }
  const config = {
    ...parsed.data,
    payoutDays: [...parsed.data.payoutDays].sort((a, b) => a - b),
  } as unknown as Prisma.InputJsonValue;

  await prisma.$transaction(async (tx) => {
    await tx.globalSetting.upsert({
      where: { id: MARKETPLACE_SETTING_ID },
      create: { id: MARKETPLACE_SETTING_ID, config, updatedById: userId },
      update: { config, updatedById: userId },
    });
    await writeAudit(
      {
        userId,
        action: 'marketplace.settings.update',
        resource: 'GlobalSetting',
        resourceId: MARKETPLACE_SETTING_ID,
        meta: { config: parsed.data },
      },
      tx,
    );
  });
  return apiOk(await load());
}
