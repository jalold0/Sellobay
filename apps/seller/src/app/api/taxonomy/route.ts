// Sotuvchi paneli — taksonomiya (kategoriya + brend) ro'yxati.
// Mahsulot qo'shish formasi shu endpoint'dan real slug'larni oladi (hardcode YO'Q).
// Faqat faol (isActive) yozuvlar, position/nom bo'yicha tartiblangan.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const [categories, brands] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { slug: 'asc' }],
      select: { id: true, slug: true, name: true, parentId: true },
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, slug: true, name: true },
    }),
  ]);

  return apiOk({ categories, brands });
}
