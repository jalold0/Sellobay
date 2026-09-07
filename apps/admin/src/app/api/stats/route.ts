// GET /api/stats — admin dashboard uchun HAQIQIY ko'rsatkichlar.
//
// Ilgari dashboard butunlay mock ustida edi va o'zini "real-time KPI" deb
// atardi. Eng chalg'ituvchisi o'sish foizi bo'lgan: u
// `revenuePrev = revenue30 * 0.88` dan hisoblanardi, ya'ni ma'lumot qanday
// bo'lishidan qat'i nazar HAR DOIM +13.64% chiqardi.
//
// Bu yerdagi hamma son bazadan olinadi. Daromad faqat HAQIQATDA to'langan
// buyurtmalardan sanaladi (bekor qilingan/qaytarilganlar kirmaydi).

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Daromadga kiradigan holatlar — pul olingan va qaytarilmagan buyurtmalar. */
const REVENUE_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user) return { err: apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan') };
  const allowed = ['ADMIN', 'SUPER_ADMIN'];
  if (!user.roles?.some((r) => allowed.includes(r))) {
    return { err: apiError(403, 'FORBIDDEN', "Ruxsat yo'q (faqat admin)") };
  }
  return { err: null };
}

export async function GET() {
  const { err } = await assertAdmin();
  if (err) return err;

  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * DAY_MS);
  // Oldingi davr — o'sishni HAQIQATAN solishtirish uchun.
  const prevStart = new Date(now.getTime() - 2 * WINDOW_DAYS * DAY_MS);

  const revenueWhere = { status: { in: [...REVENUE_STATUSES] } };

  const [current, previous, newCustomers, lowStockRows, recentOrders, topProducts] =
    await Promise.all([
      prisma.order.aggregate({
        where: { ...revenueWhere, placedAt: { gte: windowStart } },
        _sum: { grandTotal: true },
        _count: true,
      }),
      prisma.order.aggregate({
        where: { ...revenueWhere, placedAt: { gte: prevStart, lt: windowStart } },
        _sum: { grandTotal: true },
        _count: true,
      }),
      prisma.user.count({
        where: { createdAt: { gte: windowStart }, roles: { some: { role: 'CUSTOMER' } } },
      }),
      prisma.product.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        select: {
          id: true,
          name: true,
          sku: true,
          images: { select: { url: true }, take: 1, orderBy: { position: 'asc' } },
          variants: { select: { inventory: { select: { quantityOnHand: true } } } },
        },
        take: 200,
      }),
      prisma.order.findMany({
        orderBy: { placedAt: 'desc' },
        take: 6,
        select: {
          id: true,
          number: true,
          status: true,
          grandTotal: true,
          placedAt: true,
          user: { select: { firstName: true, lastName: true } },
          shippingAddress: { select: { recipientName: true } },
        },
      }),
      prisma.product.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        orderBy: { soldCount: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          sku: true,
          soldCount: true,
          basePrice: true,
          brand: { select: { name: true } },
          images: { select: { url: true }, take: 1, orderBy: { position: 'asc' } },
        },
      }),
    ]);

  const revenue = Number(current._sum.grandTotal ?? 0);
  const revenuePrev = Number(previous._sum.grandTotal ?? 0);
  const ordersCount = current._count;

  // Oldingi davrda daromad bo'lmagan bo'lsa foiz o'sish ma'nosiz — `null`
  // qaytaramiz va UI uni "—" deb ko'rsatadi. Nolga bo'lish yoki soxta
  // "+100%" chiqarmaymiz.
  const revenueDelta =
    revenuePrev > 0 ? Math.round(((revenue - revenuePrev) / revenuePrev) * 1000) / 10 : null;

  // Kunlik daromad qatori (grafik uchun). Buyurtmalarni bir marta o'qib
  // kunlarga yig'amiz — 30 ta alohida so'rov qilmaymiz.
  const windowOrders = await prisma.order.findMany({
    where: { ...revenueWhere, placedAt: { gte: windowStart } },
    select: { placedAt: true, grandTotal: true },
  });
  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const key = new Date(now.getTime() - i * DAY_MS).toISOString().slice(0, 10);
    byDay.set(key, { revenue: 0, orders: 0 });
  }
  for (const o of windowOrders) {
    const key = o.placedAt.toISOString().slice(0, 10);
    const row = byDay.get(key);
    if (!row) continue; // oraliqdan tashqarida
    row.revenue += Number(o.grandTotal);
    row.orders += 1;
  }

  // Takroriy xarid ulushi — buyurtma bergan mijozlarning nechtasi birdan
  // ortiq buyurtma qilgan. Bu HISOBLANADIGAN ko'rsatkich; ilgari sahifada
  // "Repeat rate 36%" deb yozib qo'yilgan edi.
  const buyerGroups = await prisma.order.groupBy({
    by: ['userId'],
    where: { userId: { not: null } },
    _count: { _all: true },
  });
  const buyers = buyerGroups.length;
  const repeatBuyers = buyerGroups.filter((g) => g._count._all > 1).length;
  const repeatRate = buyers > 0 ? Math.round((repeatBuyers / buyers) * 1000) / 10 : null;

  const lowStock = lowStockRows
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      imageUrl: p.images[0]?.url ?? '',
      stock: p.variants.reduce(
        (sum, v) => sum + v.inventory.reduce((s, inv) => s + inv.quantityOnHand, 0),
        0,
      ),
    }))
    .filter((p) => p.stock <= 10)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);

  return apiOk({
    kpi: {
      revenue,
      revenuePrev,
      /** Foiz o'zgarish; oldingi davr bo'sh bo'lsa `null`. */
      revenueDelta,
      ordersCount,
      ordersPrev: previous._count,
      newCustomers,
      /** O'rtacha chek — buyurtma bo'lmasa 0. */
      avgCheck: ordersCount > 0 ? Math.round(revenue / ordersCount) : 0,
      /** Takroriy xarid ulushi (%); xaridor bo'lmasa `null`. */
      repeatRate,
      buyers,
      windowDays: WINDOW_DAYS,
    },
    revenueSeries: [...byDay.entries()].map(([date, v]) => ({
      date,
      revenue: v.revenue,
      orders: v.orders,
    })),
    lowStock,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      grandTotal: Number(o.grandTotal),
      placedAt: o.placedAt.toISOString(),
      customerName:
        [o.user?.firstName, o.user?.lastName].filter(Boolean).join(' ').trim() ||
        o.shippingAddress?.recipientName ||
        'Mehmon',
    })),
    topProducts: topProducts.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      brandName: p.brand?.name ?? null,
      soldCount: p.soldCount,
      basePrice: Number(p.basePrice),
      imageUrl: p.images[0]?.url ?? '',
    })),
  });
}
