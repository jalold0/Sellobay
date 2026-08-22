// Global sozlamalarni bazadan o'qish (web tarafi — faqat O'QISH).
// Yozish admin panelida. Standart + farqlar birlashtirish core-domain'da.

import { resolveGlobalSettings, type GlobalSettingsOverride } from '@ecom/core-domain';

import { prisma } from '@/lib/db';

const SETTING_ID = 'default';

export async function getGlobalSettings() {
  const row = await prisma.globalSetting
    .findUnique({ where: { id: SETTING_ID }, select: { config: true } })
    // Jadval bo'lmasa yoki baza javob bermasa — standart bilan ishlashda davom etamiz,
    // aks holda butun buyurtmalar ro'yxati yiqiladi.
    .catch(() => null);
  return resolveGlobalSettings((row?.config as GlobalSettingsOverride | undefined) ?? null);
}
