// GET  /api/admin-users — panel xodimlari ro'yxati.
// POST /api/admin-users — yangi xodim: ism, email, rollar -> vaqtinchalik parol (bir marta ko'rsatiladi).
//
// Faqat `staff.manage` (bosh admin) — ADR 0019.

import { requirePermission } from '@/lib/api-guard';
import { apiError, apiOk } from '@/lib/auth/errors';
import { StaffError, createStaffSchema, createStaff, listStaff } from '@/lib/staff-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { err } = await requirePermission('staff.manage');
  if (err) return err;
  return apiOk({ items: await listStaff() });
}

export async function POST(req: NextRequest) {
  const { err, userId, roles } = await requirePermission('staff.manage');
  if (err) return err;

  const parsed = createStaffSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri kiritma");
  }
  try {
    const result = await createStaff(parsed.data, { id: userId, roles });
    return apiOk(result, { status: 201 });
  } catch (e) {
    if (e instanceof StaffError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
