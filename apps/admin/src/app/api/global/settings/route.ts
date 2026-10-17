// GET   /api/global/settings — amaldagi sozlamalar (standart + farqlar)
// PATCH /api/global/settings — sozlamalarni saqlash (faqat farqlar yoziladi)
//
// Kargo tarifi kelishuv bilan o'zgaradi, kurs esa har kuni — shuning uchun
// bularni kod deploy qilmasdan shu endpoint orqali o'zgartirish mumkin.

import { requirePermission } from '@/lib/api-guard';
import { apiError, apiOk } from '@/lib/auth/errors';
import {
  getGlobalSettingsForAdmin,
  globalSettingsSchema,
  saveGlobalSettings,
} from '@/lib/global-settings-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { err } = await requirePermission('settings.manage');
  if (err) return err;
  return apiOk(await getGlobalSettingsForAdmin());
}

export async function PATCH(req: NextRequest) {
  const { err, userId } = await requirePermission('settings.manage');
  if (err) return err;

  const body = await req.json().catch(() => null);
  const parsed = globalSettingsSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return apiError(
      400,
      'VALIDATION',
      `${issue?.path.join('.') ?? 'qiymat'}: ${issue?.message ?? "noto'g'ri"}`,
    );
  }

  return apiOk(await saveGlobalSettings(parsed.data, userId));
}
