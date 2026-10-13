// GET /api/finance — sotuvchi hisobi (ADR 0015): balans, tariflar, daftar yozuvlari va to'lovlar.
//
// Hammasi hisob daftaridan (`SellerLedgerEntry`): yetkazilgan har savdo — sotuv (+), komissiya
// va xizmat haqi (−); qaytarilsa teskari yozuv; to'langanda — to'lov (−). Ilgari bu sahifa
// shartnoma stavkasidan taxminiy hisoblardi.

import { loadMarketplaceSettings, sellerBalance } from '@ecom/order-ops';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { requireSeller } from '@/lib/seller-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const { seller, err } = await requireSeller(user.id, 'read');
  if (err) return err;

  const [balance, settings, profile, entries, payouts] = await Promise.all([
    sellerBalance(prisma, seller.id),
    loadMarketplaceSettings(prisma),
    prisma.seller.findUniqueOrThrow({
      where: { id: seller.id },
      select: { defaultFulfillmentModel: true, bankAccount: true, bankName: true },
    }),
    prisma.sellerLedgerEntry.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        type: true,
        amount: true,
        availableAt: true,
        createdAt: true,
        note: true,
        payoutId: true,
        order: { select: { number: true } },
      },
    }),
    prisma.sellerPayout.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        amount: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        paidAt: true,
        reference: true,
      },
    }),
  ]);

  const model = profile.defaultFulfillmentModel;
  return apiOk({
    balance,
    tariff: {
      model,
      commissionPct: settings.commissionPct[model],
      feePerUnit: String(settings.feePerUnit[model]),
      payoutDays: settings.payoutDays,
    },
    // Hisob raqamining o'zi emas — faqat kiritilganmi (oxirgi 4 raqam bilan).
    bank: {
      name: profile.bankName,
      accountTail: profile.bankAccount ? profile.bankAccount.slice(-4) : null,
    },
    entries: entries.map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount.toFixed(2),
      availableAt: e.availableAt.toISOString(),
      createdAt: e.createdAt.toISOString(),
      note: e.note,
      inPayout: e.payoutId !== null,
      orderNumber: e.order?.number ?? null,
    })),
    payouts: payouts.map((p) => ({
      id: p.id,
      amount: p.amount.toFixed(2),
      status: p.status,
      periodStart: p.periodStart.toISOString(),
      periodEnd: p.periodEnd.toISOString(),
      paidAt: p.paidAt?.toISOString() ?? null,
      reference: p.reference,
    })),
  });
}
