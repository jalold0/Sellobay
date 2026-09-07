// GET /api/stats — sotuvchi paneli uchun HAQIQIY ko'rsatkichlar
// (analitika + moliya).
//
// Ilgari ikkala sahifa ham mock ustida edi: "Daromad +9.4%", "Konversiya
// 3.8%", "Reyting 4.8" va "Karta ko'rishlari" (Web 12 450, Mobil 8 430,
// Telegram 4 720) — hammasi kodga yozib qo'yilgan sonlar edi.
//
// Bu yerdagi hamma son bazadan. Daromad sotuvchining O'Z mahsulotlari
// bo'yicha (OrderItem.sellerId) hisoblanadi, butun buyurtma summasi emas.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Daromadga kiradigan holatlar — pul olingan va qaytarilmagan buyurtmalar. */
const REVENUE_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const seller = await prisma.seller.findUnique({
    where: { ownerUserId: user.id },
    select: { id: true, commissionRate: true },
  });
  if (!seller) return apiError(403, 'NOT_A_SELLER', 'Sotuvchi profili topilmadi');

  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * DAY_MS);
  const prevStart = new Date(now.getTime() - 2 * WINDOW_DAYS * DAY_MS);

  const orderFilter = { status: { in: [...REVENUE_STATUSES] } };

  // Sotuvchining satrlari — davr ichida va oldingi davrda.
  const [currentItems, prevItems, products, payouts] = await Promise.all([
    prisma.orderItem.findMany({
      where: { sellerId: seller.id, order: { ...orderFilter, placedAt: { gte: windowStart } } },
      select: {
        totalPrice: true,
        quantity: true,
        orderId: true,
        order: { select: { placedAt: true } },
      },
    }),
    prisma.orderItem.findMany({
      where: {
        sellerId: seller.id,
        order: { ...orderFilter, placedAt: { gte: prevStart, lt: windowStart } },
      },
      select: { totalPrice: true, orderId: true },
    }),
    prisma.product.findMany({
      where: { sellerId: seller.id, deletedAt: null },
      orderBy: { soldCount: 'desc' },
      take: 6,
      select: {
        id: true,
        sku: true,
        name: true,
        soldCount: true,
        basePrice: true,
        rating: true,
        reviewCount: true,
        images: { select: { url: true }, take: 1, orderBy: { position: 'asc' } },
      },
    }),
    prisma.sellerPayout.findMany({
      where: { sellerId: seller.id },
      orderBy: { periodEnd: 'desc' },
      take: 24,
    }),
  ]);

  const revenue = currentItems.reduce((s, i) => s + Number(i.totalPrice), 0);
  const revenuePrev = prevItems.reduce((s, i) => s + Number(i.totalPrice), 0);
  // Buyurtmalar soni — noyob buyurtmalar (bitta buyurtmada bir necha satr bo'lishi mumkin).
  const ordersCount = new Set(currentItems.map((i) => i.orderId)).size;
  const ordersPrev = new Set(prevItems.map((i) => i.orderId)).size;

  // Kunlik qator (grafik uchun)
  const byDay = new Map<string, { revenue: number; orders: Set<string> }>();
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const key = new Date(now.getTime() - i * DAY_MS).toISOString().slice(0, 10);
    byDay.set(key, { revenue: 0, orders: new Set() });
  }
  for (const item of currentItems) {
    const key = item.order.placedAt.toISOString().slice(0, 10);
    const row = byDay.get(key);
    if (!row) continue;
    row.revenue += Number(item.totalPrice);
    row.orders.add(item.orderId);
  }

  // Reyting — sotuvchi mahsulotlarining sharhlar soni bo'yicha o'rtachasi.
  // Sharhsiz mahsulot hisobga olinmaydi, aks holda 0 reyting o'rtachani buzardi.
  const rated = await prisma.product.findMany({
    where: { sellerId: seller.id, deletedAt: null, reviewCount: { gt: 0 } },
    select: { rating: true, reviewCount: true },
  });
  const totalReviews = rated.reduce((s, p) => s + p.reviewCount, 0);
  const rating =
    totalReviews > 0
      ? Math.round(
          (rated.reduce((s, p) => s + Number(p.rating) * p.reviewCount, 0) / totalReviews) * 10,
        ) / 10
      : null;

  const commissionRate = Number(seller.commissionRate);
  const commission = Math.round((revenue * commissionRate) / 100);

  return apiOk({
    kpi: {
      revenue,
      revenuePrev,
      ordersCount,
      ordersPrev,
      avgCheck: ordersCount > 0 ? Math.round(revenue / ordersCount) : 0,
      /** Sharhlar bo'yicha vaznli o'rtacha; sharh bo'lmasa `null`. */
      rating,
      reviewCount: totalReviews,
      windowDays: WINDOW_DAYS,
    },
    revenueSeries: [...byDay.entries()].map(([date, v]) => ({
      date,
      revenue: v.revenue,
      orders: v.orders.size,
    })),
    topProducts: products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      soldCount: p.soldCount,
      basePrice: Number(p.basePrice),
      rating: Number(p.rating),
      reviewCount: p.reviewCount,
      imageUrl: p.images[0]?.url ?? '',
    })),
    finance: {
      commissionRate,
      /** Davr daromadi va undan platforma komissiyasi. */
      periodGross: revenue,
      periodCommission: commission,
      periodNet: revenue - commission,
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        currency: p.currency,
        periodStart: p.periodStart.toISOString(),
        periodEnd: p.periodEnd.toISOString(),
        status: p.status,
        paidAt: p.paidAt?.toISOString() ?? null,
        reference: p.reference,
      })),
    },
  });
}
