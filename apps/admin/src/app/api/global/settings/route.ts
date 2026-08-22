// GET   /api/global/settings — amaldagi sozlamalar (standart + farqlar)
// PATCH /api/global/settings — sozlamalarni saqlash (faqat farqlar yoziladi)
//
// Kargo tarifi kelishuv bilan o'zgaradi, kurs esa har kuni — shuning uchun
// bularni kod deploy qilmasdan shu endpoint orqali o'zgartirish mumkin.

import type { NextRequest } from 'next/server';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getGlobalSettingsForAdmin,
  globalSettingsSchema,
  saveGlobalSettings,
} from '@/lib/global-settings-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = ['ADMIN', 'SUPER_ADMIN'];

async function guard() {
  const user = await getCurrentUser();
  if (!user) return { user: null, err: apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan') };
  if (!user.roles?.some((r) => ALLOWED.includes(r))) {
    return { user: null, err: apiError(403, 'FORBIDDEN', "Ruxsat yo'q (faqat admin)") };
  }
  return { user, err: null };
}

export async function GET() {
  const { err } = await guard();
  if (err) return err;
  return apiOk(await getGlobalSettingsForAdmin());
}

export async function PATCH(req: NextRequest) {
  const { user, err } = await guard();
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

  return apiOk(await saveGlobalSettings(parsed.data, user!.id));
}
