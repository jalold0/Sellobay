// POST /api/admin-users/[id]/reset-password — xodimga yangi vaqtinchalik parol (bir marta
// ko'rsatiladi), barcha sessiyalari yopiladi, keyingi kirishda parolni almashtiradi. ADR 0019.

import { requirePermission } from '@/lib/api-guard';
import { apiError, apiOk } from '@/lib/auth/errors';
import { StaffError, resetStaffPassword } from '@/lib/staff-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { err, userId, roles } = await requirePermission('staff.manage');
  if (err) return err;
  try {
    return apiOk(await resetStaffPassword(params.id, { id: userId, roles }));
  } catch (e) {
    if (e instanceof StaffError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
