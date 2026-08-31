// GET /api/dashboard — bosh sahifadagi ko'rsatkichlar. Faqat ADMIN/SUPER_ADMIN.
//
// Bu endpoint ATAYLAB yozildi: bosh sahifa ilgari `lib/mock` dan o'qirdi va
// sarlavhasida "real-time KPI" deb turardi. O'sish foizi esa kodda hisoblanardi
// (`revenuePrev = revenue30 * 0.88`), ya'ni har doim bir xil chiqardi. Endi
// barcha raqam bazadan keladi.
//
// DAROMAD TA'RIFI: `paidAt` to'ldirilgan buyurtmaning `grandTotal` summasi,
// qaytarilgan summa ayirilgan holda. `paidAt` ni to'lovning barcha yo'llari
// to'ldiradi (Click, Payme, admin tasdig'i, yetkazishda naqd, global).
// `paidTotal` maydoni esa hamma yo'lda to'ldirilmaydi, shuning uchun
// ishlatilmaydi. Qisman to'lov hozircha modellashtirilmagan.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { adminProductImage } from '@/lib/product-image';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;
/** Shundan kam qolgan variant "kam qoldi" deb belgilanadi. */
const LOW_STOCK_THRESHOLD = 10;

/**
 * O'sish foizi. Oldingi davr NOLGA teng bo'lsa `null` qaytadi — nolga nisbatan
 * foiz hisoblab bo'lmaydi va "+100%" ko'rsatish yolg'on bo'lardi.
 */
function deltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

interface PaidOrderRow {
  paidAt: Date | null;
  grandTotal: { toString(): string };
  refundedTotal: { toString(): string };
}

/** Buyurtmadan haqiqatda qolgan pul. */
function netRevenue(order: PaidOrderRow): number {
  return Number(order.grandTotal) - Number(order.refundedTotal);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');
  if (!user.roles?.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r))) {
    return apiError(403, 'FORBIDDEN', "Ruxsat yo'q (faqat admin)");
  }

  const now = Date.now();
  const windowStart = new Date(now - WINDOW_DAYS * DAY_MS);
  const previousStart = new Date(now - 2 * WINDOW_DAYS * DAY_MS);

  const [
    paidInWindow,
    paidInPrevious,
    allTime,
    newCustomers,
    previousCustomers,
    totalCustomers,
    recentOrders,
    topProducts,
    variantRows,
    deliveryRows,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { paidAt: { gte: windowStart } },
      select: { paidAt: true, grandTotal: true, refundedTotal: true },
    }),
    prisma.order.findMany({
      where: { paidAt: { gte: previousStart, lt: windowStart } },
      select: { paidAt: true, grandTotal: true, refundedTotal: true },
    }),
    prisma.order.aggregate({
      where: { paidAt: { not: null } },
      _sum: { grandTotal: true, refundedTotal: true },
      _count: true,
    }),
    prisma.user.count({
      where: { roles: { some: { role: 'CUSTOMER' } }, createdAt: { gte: windowStart } },
    }),
    prisma.user.count({
      where: {
        roles: { some: { role: 'CUSTOMER' } },
        createdAt: { gte: previousStart, lt: windowStart },
      },
    }),
    prisma.user.count({ where: { roles: { some: { role: 'CUSTOMER' } } } }),
    prisma.order.findMany({
      orderBy: { placedAt: 'desc' },
      take: 6,
      select: {
        id: true,
        number: true,
        status: true,
        grandTotal: true,
        placedAt: true,
        guestPhone: true,
        user: { select: { firstName: true, lastName: true, email: true } },
        shippingAddress: { select: { recipientName: true } },
        _count: { select: { items: true } },
      },
    }),
    // Top mahsulotlar HAQIQIY buyurtmalardan hisoblanadi, `Product.soldCount`
    // dan emas. Sabab: soldCount seed ma'lumotida oldindan to'ldirilgan (masalan
    // 670 ta sotuv), bazada esa jami 6 ta to'langan buyurtma bor. Ya'ni u
    // maydonga tayanish bosh sahifada soxta raqam ko'rsatardi.
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { paidAt: { not: null } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    prisma.productVariant.findMany({
      where: { product: { status: 'ACTIVE' } },
      select: {
        id: true,
        sku: true,
        product: {
          select: {
            slug: true,
            name: true,
            images: { take: 1, orderBy: { position: 'asc' }, select: { url: true } },
          },
        },
        inventory: { select: { quantityOnHand: true } },
      },
    }),
    prisma.order.groupBy({
      by: ['deliveryMethod'],
      where: { placedAt: { gte: windowStart } },
      _count: true,
    }),
  ]);

  const revenueCurrent = paidInWindow.reduce((sum, order) => sum + netRevenue(order), 0);
  const revenuePrevious = paidInPrevious.reduce((sum, order) => sum + netRevenue(order), 0);
  const ordersCurrent = paidInWindow.length;
  const ordersPrevious = paidInPrevious.length;
  const avgCurrent = ordersCurrent > 0 ? revenueCurrent / ordersCurrent : 0;
  const avgPrevious = ordersPrevious > 0 ? revenuePrevious / ordersPrevious : 0;

  // Kunlik qator — buyurtmalar JS'da guruhlanadi. Hozirgi hajmda (yuzlab yozuv)
  // bu arzon; o'n minglab buyurtma bo'lganda SQL'dagi date_trunc'ga ko'chiriladi.
  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    byDay.set(new Date(now - i * DAY_MS).toISOString().slice(0, 10), { revenue: 0, orders: 0 });
  }
  for (const order of paidInWindow) {
    if (!order.paidAt) continue;
    const bucket = byDay.get(order.paidAt.toISOString().slice(0, 10));
    if (!bucket) continue;
    bucket.revenue += netRevenue(order);
    bucket.orders += 1;
  }

  const lowStock = variantRows
    .map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      name: variant.product.name,
      imageUrl: adminProductImage(variant.product.images[0]?.url, variant.product.slug),
      stock: variant.inventory.reduce((sum, item) => sum + item.quantityOnHand, 0),
    }))
    .filter((variant) => variant.stock <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);

  const allTimeRevenue =
    Number(allTime._sum.grandTotal ?? 0) - Number(allTime._sum.refundedTotal ?? 0);

  // groupBy faqat id va sonni beradi — nom va brendni alohida olamiz.
  const topProductRows = await prisma.product.findMany({
    where: { id: { in: topProducts.map((row) => row.productId) } },
    select: { id: true, name: true, brand: { select: { name: true } } },
  });
  const productById = new Map(topProductRows.map((product) => [product.id, product]));

  return apiOk({
    windowDays: WINDOW_DAYS,
    revenue: {
      current: revenueCurrent,
      deltaPercent: deltaPercent(revenueCurrent, revenuePrevious),
      allTime: allTimeRevenue,
    },
    orders: {
      current: ordersCurrent,
      deltaPercent: deltaPercent(ordersCurrent, ordersPrevious),
      allTime: allTime._count,
    },
    customers: {
      current: newCustomers,
      deltaPercent: deltaPercent(newCustomers, previousCustomers),
      allTime: totalCustomers,
    },
    averageOrderValue: {
      current: avgCurrent,
      deltaPercent: deltaPercent(avgCurrent, avgPrevious),
      allTime: allTime._count > 0 ? allTimeRevenue / allTime._count : 0,
    },
    dailySeries: [...byDay.entries()].map(([date, value]) => ({ date, ...value })),
    deliveryBreakdown: deliveryRows.map((row) => ({
      method: row.deliveryMethod,
      count: row._count,
    })),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      number: order.number,
      status: order.status,
      grandTotal: Number(order.grandTotal),
      placedAt: order.placedAt.toISOString(),
      itemsCount: order._count.items,
      customerName:
        [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ').trim() ||
        order.shippingAddress?.recipientName ||
        order.user?.email ||
        order.guestPhone ||
        'Mehmon',
    })),
    lowStock,
    topProducts: topProducts.flatMap((row) => {
      const product = productById.get(row.productId);
      if (!product) return [];
      return [
        {
          id: product.id,
          name: product.name,
          brandName: product.brand?.name ?? '—',
          soldCount: row._sum.quantity ?? 0,
        },
      ];
    }),
  });
}
