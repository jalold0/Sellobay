// Topshirish punktlari (pickup points) — ommaviy ro'yxat
// GET /api/pickup-points?region=&city=  — faol punktlar

import { apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get('region')?.trim() || undefined;
  const city = searchParams.get('city')?.trim() || undefined;

  const items = await prisma.pickupPoint.findMany({
    where: { isActive: true, region, city },
    orderBy: [{ region: 'asc' }, { city: 'asc' }, { code: 'asc' }],
    select: {
      id: true,
      code: true,
      provider: true,
      name: true,
      region: true,
      city: true,
      district: true,
      street: true,
      building: true,
      landmark: true,
      latitude: true,
      longitude: true,
      phone: true,
      workingHours: true,
      type: true,
    },
  });

  // Decimal → number (lat/lng) — klientlar oddiy son kutadi
  const mapped = items.map((p) => ({
    ...p,
    latitude: Number(p.latitude),
    longitude: Number(p.longitude),
  }));

  return apiOk({ items: mapped });
}
