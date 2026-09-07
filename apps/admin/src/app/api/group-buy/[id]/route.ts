// PATCH /api/group-buy/:id — guruhni bekor qilish (CANCELLED).
//
// Boshqa o'zgartirishlarga ataylab ruxsat berilmaydi: guruh ochilgach unga
// mijozlar qo'shilgan bo'lishi mumkin va ular ko'rgan narx/shart o'zgarmasligi
// kerak. Xato ochilgan guruhni bekor qilish — yagona to'g'ri amal.

import { z } from 'zod';

import { assertAdmin } from '@/lib/api-guard';
import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ action: z.literal('cancel') });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { err } = await assertAdmin();
  if (err) return err;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(400, 'VALIDATION', "Noto'g'ri amal");

  const group = await prisma.groupBuy.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, _count: { select: { members: true } } },
  });
  if (!group) return apiError(404, 'NOT_FOUND', 'Guruh topilmadi');

  if (group.status !== 'OPEN') {
    // To'lgan guruhni bekor qilish a'zolar kelishilgan narxini bekor qiladi —
    // bunga ruxsat bermaymiz.
    return apiError(409, 'NOT_OPEN', 'Faqat ochiq guruhni bekor qilish mumkin');
  }

  await prisma.groupBuy.update({
    where: { id: group.id },
    data: { status: 'CANCELLED' },
  });

  return apiOk({ id: group.id, status: 'CANCELLED', affectedMembers: group._count.members });
}
