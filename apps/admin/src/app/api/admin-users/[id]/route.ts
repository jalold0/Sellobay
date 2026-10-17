// PATCH /api/admin-users/[id] — xodim rollari va holati (faol / bloklangan). ADR 0019.

import { requirePermission } from '@/lib/api-guard';
import { apiError, apiOk } from '@/lib/auth/errors';
import { StaffError, updateStaff, updateStaffSchema } from '@/lib/staff-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { err, userId, roles } = await requirePermission('staff.manage');
  if (err) return err;

  const parsed = updateStaffSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri kiritma");
  }
  try {
    return apiOk({ staff: await updateStaff(params.id, parsed.data, { id: userId, roles }) });
  } catch (e) {
    if (e instanceof StaffError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
