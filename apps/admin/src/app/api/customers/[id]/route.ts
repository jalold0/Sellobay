// GET /api/customers/:id — bitta mijozning kartochkasi (CRM) + buyurtmalari.
//
// Ilgari admin `customers/[id]` sahifasi mockCustomers ro'yxatidan qidirardi
// (id'lari `cu-1`, `cu-2`...), ro'yxat sahifasi esa real Prisma UUID'iga link
// qilardi. UUID hech qachon `cu-N` bilan mos kelmagani uchun mijoz ismini
// bosish HAR DOIM "Topilmadi" sahifasini ochardi.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Mijoz kartochkasida ko'rsatiladigan oxirgi buyurtmalar soni. */
const RECENT_ORDERS = 20;

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user) return { err: apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan') };
  const allowed = ['ADMIN', 'SUPER_ADMIN'];
  if (!user.roles?.some((r) => allowed.includes(r))) {
    return { err: apiError(403, 'FORBIDDEN', "Ruxsat yo'q (faqat admin)") };
  }
  return { err: null };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { err } = await assertAdmin();
  if (err) return err;

  // Id UUID bo'lmasa Prisma xato tashlaydi — oldindan 404 qaytaramiz
  // (eski `cu-1` ko'rinishidagi havolalar ham shu yerga tushadi).
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(params.id)) {
    return apiError(404, 'NOT_FOUND', 'Mijoz topilmadi');
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      avatarUrl: true,
      status: true,
      loyaltyPoints: true,
      createdAt: true,
      addresses: {
        take: 1,
        orderBy: { isDefault: 'desc' },
        select: { city: true },
      },
      _count: { select: { orders: true } },
    },
  });
  if (!user) return apiError(404, 'NOT_FOUND', 'Mijoz topilmadi');

  const [spent, orders] = await Promise.all([
    prisma.order.aggregate({
      where: { userId: user.id },
      _sum: { grandTotal: true },
    }),
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { placedAt: 'desc' },
      take: RECENT_ORDERS,
      select: {
        id: true,
        number: true,
        status: true,
        grandTotal: true,
        placedAt: true,
      },
    }),
  ]);

  return apiOk({
    customer: {
      id: user.id,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email,
      phone: user.phone ?? '',
      avatarUrl: user.avatarUrl,
      city: user.addresses[0]?.city ?? null,
      status: user.status,
      ordersCount: user._count.orders,
      totalSpent: Number(spent._sum.grandTotal ?? 0),
      loyaltyPoints: user.loyaltyPoints,
      registeredAt: user.createdAt.toISOString(),
    },
    orders: orders.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      grandTotal: Number(o.grandTotal),
      placedAt: o.placedAt.toISOString(),
    })),
  });
}
