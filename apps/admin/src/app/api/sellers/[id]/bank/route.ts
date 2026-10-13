// PUT /api/sellers/:id/bank — sotuvchining bank rekvizitlari (ADR 0015: oyiga 2 marta to'lov).
//
// Ilgari rekvizit faqat ro'yxatdan o'tishda kiritilardi va keyin o'zgartirib bo'lmasdi — to'lov
// «rekvizit yo'q» deb to'xtab qolardi. Hisob raqami pul qayerga ketishini belgilaydi, shuning
// uchun uni sotuvchi panelidan emas, admin shartnoma/ma'lumotnoma bo'yicha kiritadi va har
// o'zgarish jurnalga yoziladi. To'langan to'lovlar o'zgarmaydi (rekvizit nusxasi to'lovda
// saqlanadi); hali o'tkazilmaganlari yangi rekvizitni oladi.

import { z } from 'zod';

import { assertAdmin } from '@/lib/api-guard';
import { writeAudit } from '@/lib/audit';
import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Ro'yxatdan o'tish formasi bilan bir xil qoida (apps/web validators).
const schema = z.object({
  bankName: z.string().trim().min(2, 'Bank nomini yozing').max(80),
  bankAccount: z
    .string()
    .trim()
    .regex(/^\d{20}$/, 'Hisob raqami 20 raqamdan iborat bo‘lishi kerak'),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { err, userId } = await assertAdmin();
  if (err) return err;

  if (!/^[a-f0-9-]{36}$/i.test(params.id)) {
    return apiError(400, 'VALIDATION', "Sotuvchi ID noto'g'ri");
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri so'rov");
  }
  const { bankName, bankAccount } = parsed.data;

  const done = await prisma.$transaction(async (tx) => {
    const prev = await tx.seller.findUnique({
      where: { id: params.id },
      select: { bankAccount: true },
    });
    if (!prev) return false;
    await tx.seller.update({ where: { id: params.id }, data: { bankName, bankAccount } });
    // Hali o'tkazilmagan to'lovlar — yangi (tekshirilgan) rekvizit bilan; to'langanlari o'zgarmaydi.
    await tx.sellerPayout.updateMany({
      where: { sellerId: params.id, status: 'PENDING' },
      data: { bankName, bankAccount },
    });
    await writeAudit(
      {
        userId,
        action: 'seller.bank',
        resource: 'Seller',
        resourceId: params.id,
        // Jurnalda to'liq raqam emas — oxirgi 4 raqam (qayerga o'zgargani ko'rinadi).
        meta: {
          bankName,
          from: prev.bankAccount ? `••${prev.bankAccount.slice(-4)}` : null,
          to: `••${bankAccount.slice(-4)}`,
        },
      },
      tx,
    );
    return true;
  });
  if (!done) return apiError(404, 'NOT_FOUND', 'Sotuvchi topilmadi');
  return apiOk({ seller: { id: params.id, bankName, accountTail: bankAccount.slice(-4) } });
}
