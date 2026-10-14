// Do'kon bo'limlari va ichki turlari (kategoriya daraxti).
//
// Ikki joyda ishlatiladi:
//   • `seed.ts` — lokal baza;
//   • `scripts/kategoriya-daraxti.ts` — prod bazaga bir marta (avval
//     `--tekshir` bilan ko'rib chiqiladi).
//
// Qoida: mahsulot ICHKI TURGA bog'lanadi; bo'lim tanlansa katalog uning
// barcha turlarini ko'rsatadi (apps/web/src/lib/category-tree.ts).
//
// Skript idempotent: qayta ishga tushirilsa hech narsa ikki marta
// yaratilmaydi. Admin keyin qo'lda o'zgartirgan nom va tartib
// QAYTA YOZILMAYDI — faqat yo'q narsa yaratiladi va ota-kategoriya
// bog'lanadi.

import type { PrismaClient } from '@prisma/client';

type Name = { uz: string; ru: string; en: string };

interface Leaf {
  slug: string;
  name: Name;
}

interface Department {
  slug: string;
  name: Name;
  position: number;
  /** Mavjud kategoriyalar shu bo'lim ichiga ko'chiriladi (slug bo'yicha). */
  adopt?: string[];
  /** Yangi ichki turlar. */
  children: Leaf[];
}

export const DEPARTMENTS: Department[] = [
  {
    slug: 'ayollar',
    name: { uz: 'Ayollar', ru: 'Женщинам', en: 'Women' },
    position: 1,
    children: [
      { slug: 'ayollar-kiyim', name: { uz: 'Kiyim', ru: 'Одежда', en: 'Clothing' } },
      { slug: 'ayollar-poyabzal', name: { uz: 'Poyabzal', ru: 'Обувь', en: 'Shoes' } },
      { slug: 'ayollar-sumkalar', name: { uz: 'Sumkalar', ru: 'Сумки', en: 'Bags' } },
    ],
  },
  {
    slug: 'erkaklar',
    name: { uz: 'Erkaklar', ru: 'Мужчинам', en: 'Men' },
    position: 2,
    children: [
      { slug: 'erkaklar-kiyim', name: { uz: 'Kiyim', ru: 'Одежда', en: 'Clothing' } },
      { slug: 'erkaklar-poyabzal', name: { uz: 'Poyabzal', ru: 'Обувь', en: 'Shoes' } },
      {
        slug: 'erkaklar-aksessuarlar',
        name: { uz: 'Aksessuarlar', ru: 'Аксессуары', en: 'Accessories' },
      },
    ],
  },
  {
    slug: 'bolalar',
    name: { uz: 'Bolalar', ru: 'Детям', en: 'Kids' },
    position: 3,
    children: [
      { slug: 'bolalar-kiyim', name: { uz: 'Kiyim', ru: 'Одежда', en: 'Clothing' } },
      { slug: 'bolalar-poyabzal', name: { uz: 'Poyabzal', ru: 'Обувь', en: 'Shoes' } },
      { slug: 'oyinchoqlar', name: { uz: "O'yinchoqlar", ru: 'Игрушки', en: 'Toys' } },
    ],
  },
  {
    slug: 'gozallik-parfyumeriya',
    name: { uz: "Go'zallik va atirlar", ru: 'Красота и парфюмерия', en: 'Beauty & fragrance' },
    position: 4,
    adopt: ['perfume', 'cosmetics', 'beauty'],
    children: [],
  },
  {
    slug: 'maishiy-texnika',
    name: { uz: 'Maishiy texnika', ru: 'Бытовая техника', en: 'Appliances' },
    position: 6,
    children: [
      {
        slug: 'oshxona-texnikasi',
        name: { uz: 'Oshxona texnikasi', ru: 'Техника для кухни', en: 'Kitchen' },
      },
      {
        slug: 'uy-texnikasi',
        name: { uz: 'Uy uchun texnika', ru: 'Техника для дома', en: 'Home' },
      },
      {
        slug: 'kichik-texnika',
        name: { uz: 'Kichik texnika', ru: 'Мелкая техника', en: 'Small appliances' },
      },
    ],
  },
];

/**
 * Eski umumiy kategoriyalar → yangi turlar.
 *
 * Kiyim va poyabzal jinsga bo'linmagan edi. Ulardagi har bir mahsulot
 * IKKALA bo'limga ham qo'shiladi (unisex deb) — mahsulot yo'qolmaydi.
 * Keyin admin keragini olib tashlaydi. Eski kategoriya o'chirilmaydi,
 * faqat nofaol qilinadi (bog'lanishlar saqlanadi — qaytarish oson).
 */
export const RETIRE: Record<string, string[]> = {
  clothing: ['ayollar-kiyim', 'erkaklar-kiyim'],
  shoes: ['ayollar-poyabzal', 'erkaklar-poyabzal'],
};

/** `accessories` o'z bo'limi bo'lib qoladi — faqat tartibi beriladi. */
export const KEEP_AS_DEPARTMENT: Record<string, number> = { accessories: 5 };

export interface TreeReport {
  created: string[];
  reparented: string[];
  positioned: string[];
  linked: number;
  retired: string[];
}

/**
 * Daraxtni bazaga qo'llaydi. [dryRun] da hech narsa yozilmaydi,
 * faqat nima qilinishi qaytariladi.
 */
export async function applyCategoryTree(prisma: PrismaClient, dryRun = false): Promise<TreeReport> {
  const report: TreeReport = {
    created: [],
    reparented: [],
    positioned: [],
    linked: 0,
    retired: [],
  };
  const existing = new Map(
    (
      await prisma.category.findMany({
        select: { id: true, slug: true, parentId: true, position: true },
      })
    ).map((c) => [c.slug, c]),
  );
  let fakeId = 0;
  const idOf = (slug: string) => existing.get(slug)?.id ?? `(yangi-${slug})`;

  async function ensure(slug: string, name: Name, parentSlug: string | null, position: number) {
    const parentId = parentSlug ? idOf(parentSlug) : null;
    const found = existing.get(slug);
    if (found) {
      if (parentSlug && found.parentId !== parentId) {
        report.reparented.push(`${slug} → ${parentSlug}`);
        if (!dryRun) await prisma.category.update({ where: { slug }, data: { parentId } });
      }
      return;
    }
    report.created.push(parentSlug ? `${parentSlug} › ${slug}` : slug);
    if (dryRun) {
      existing.set(slug, { id: `(yangi-${++fakeId})`, slug, parentId, position });
      return;
    }
    const c = await prisma.category.create({ data: { slug, name, parentId, position } });
    existing.set(slug, { id: c.id, slug, parentId, position });
  }

  for (const dept of DEPARTMENTS) {
    await ensure(dept.slug, dept.name, null, dept.position);
    for (const [i, leaf] of dept.children.entries()) {
      await ensure(leaf.slug, leaf.name, dept.slug, i + 1);
    }
    for (const slug of dept.adopt ?? []) {
      const found = existing.get(slug);
      if (found && found.parentId !== idOf(dept.slug)) {
        report.reparented.push(`${slug} → ${dept.slug}`);
        if (!dryRun)
          await prisma.category.update({ where: { slug }, data: { parentId: idOf(dept.slug) } });
      }
    }
  }

  for (const [slug, position] of Object.entries(KEEP_AS_DEPARTMENT)) {
    const found = existing.get(slug);
    if (found && found.parentId === null && found.position !== position) {
      report.positioned.push(`${slug} = ${position}`);
      if (!dryRun) await prisma.category.update({ where: { slug }, data: { position } });
    }
  }

  for (const [oldSlug, targets] of Object.entries(RETIRE)) {
    const old = await prisma.category.findUnique({
      where: { slug: oldSlug },
      select: { id: true, isActive: true, products: { select: { productId: true } } },
    });
    if (!old) continue;
    for (const target of targets) {
      const targetId = idOf(target);
      for (const { productId } of old.products) {
        if (dryRun) {
          // Allaqachon bog'langani sanalmaydi — qayta ishga tushirishda 0.
          const has = targetId.startsWith('(')
            ? null
            : await prisma.productCategory.findUnique({
                where: { productId_categoryId: { productId, categoryId: targetId } },
                select: { productId: true },
              });
          if (!has) report.linked++;
          continue;
        }
        const res = await prisma.productCategory.createMany({
          data: [{ productId, categoryId: targetId }],
          skipDuplicates: true,
        });
        report.linked += res.count;
      }
    }
    if (old.isActive) {
      report.retired.push(oldSlug);
      if (!dryRun)
        await prisma.category.update({ where: { slug: oldSlug }, data: { isActive: false } });
    }
  }

  return report;
}
