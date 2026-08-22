// Global sozlamalarni bazadan o'qish/yozish (admin).
//
// Bazada FAQAT standartdan farqlar saqlanadi; birlashtirish core-domain'dagi
// `resolveGlobalSettings` da. Buzuq qiymat kelsa standart qoladi — narx nolga tushmaydi.

import { resolveGlobalSettings, type GlobalSettingsOverride } from '@ecom/core-domain';
import { z } from 'zod';

import type { Prisma } from '@ecom/database';

import { prisma } from '@/lib/db';

export const SETTING_ID = 'default';

const tariffSchema = z
  .object({
    usdPerKg: z.number().positive().max(1000).optional(),
    seriesUsdPerKg: z.number().positive().max(1000).optional(),
    seriesMinQty: z.number().int().positive().max(100_000).optional(),
    minChargeableKg: z.number().min(0).max(1000).optional(),
    roundStepKg: z.number().min(0).max(100).optional(),
    volumetricDivisor: z.number().min(100).max(100_000).optional(),
    leadTimeDays: z
      .tuple([z.number().int().min(1).max(365), z.number().int().min(1).max(365)])
      .optional(),
  })
  .strict();

export const globalSettingsSchema = z
  .object({
    pricing: z
      .object({
        cnyPerUsd: z.number().positive().max(1000).optional(),
        uzsPerUsd: z.number().positive().max(10_000_000).optional(),
        fxBufferPct: z.number().min(0).max(1).optional(),
        agentFeePct: z.number().min(0).max(1).optional(),
        customsPct: z.number().min(0).max(2).optional(),
        paymentFeePct: z.number().min(0).max(0.5).optional(),
        marginPct: z.number().min(0).max(5).optional(),
        roundToUzs: z.number().min(0).max(1_000_000).optional(),
        weightRiskPct: z.number().min(0).max(1).optional(),
      })
      .strict()
      .optional(),
    freight: z
      .object({ AUTO: tariffSchema.optional(), AVIA: tariffSchema.optional() })
      .strict()
      .optional(),
    variance: z
      .object({
        absorbPct: z.number().min(0).max(1).optional(),
        cancelPct: z.number().min(0).max(5).optional(),
      })
      .strict()
      .optional(),
    weightGuaranteePct: z.number().min(0).max(2).optional(),
    categoryWeightKg: z.record(z.string(), z.number().positive().max(500)).optional(),
  })
  .strict();

export type GlobalSettingsInput = z.infer<typeof globalSettingsSchema>;

/** Bazadagi xom farqlar (validatsiyadan o'tmagan bo'lishi mumkin — resolve chidamli). */
export async function loadGlobalSettingsOverride(): Promise<GlobalSettingsOverride | null> {
  const row = await prisma.globalSetting.findUnique({
    where: { id: SETTING_ID },
    select: { config: true },
  });
  return (row?.config as GlobalSettingsOverride | undefined) ?? null;
}

/** Amaldagi to'liq sozlamalar (standart + farqlar). */
export async function getGlobalSettings() {
  return resolveGlobalSettings(await loadGlobalSettingsOverride());
}

/** Admin panel uchun: amaldagi qiymatlar + qaysi maydonlar qo'lda o'zgartirilgani. */
export async function getGlobalSettingsForAdmin() {
  const override = await loadGlobalSettingsOverride();
  const row = await prisma.globalSetting.findUnique({
    where: { id: SETTING_ID },
    select: { updatedAt: true, updatedById: true },
  });
  return {
    effective: resolveGlobalSettings(override),
    override: override ?? {},
    updatedAt: row?.updatedAt?.toISOString() ?? null,
    updatedById: row?.updatedById ?? null,
  };
}

export async function saveGlobalSettings(input: GlobalSettingsInput, operatorId: string) {
  const config = input as unknown as Prisma.InputJsonValue;
  await prisma.globalSetting.upsert({
    where: { id: SETTING_ID },
    create: { id: SETTING_ID, config, updatedById: operatorId },
    update: { config, updatedById: operatorId },
  });
  return getGlobalSettingsForAdmin();
}
