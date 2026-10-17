// POST /api/payouts/run — to'lovlarni HOZIR hisoblash (to'lov kunini kutmasdan). Masalan,
// kun o'tkazib yuborilgan bo'lsa yoki sotuvchi bilan kelishilgan bo'lsa. Faqat qaytarish
// muddati o'tgan savdolar yig'iladi — qoida cron bilan bir xil (ADR 0015).

import { runSellerPayouts } from '@ecom/order-ops';

import { requirePermission } from '@/lib/api-guard';
import { writeAudit } from '@/lib/audit';
import { apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const { err, userId } = await requirePermission('payouts.manage');
  if (err) return err;

  const result = await runSellerPayouts(prisma, new Date(), { force: true });
  for (const p of result.created) {
    await writeAudit({
      userId,
      action: 'payout.create',
      resource: 'SellerPayout',
      resourceId: p.payoutId,
      meta: { sellerId: p.sellerId, amount: p.amount, manual: true },
    });
  }
  return apiOk({ created: result.created.length });
}
