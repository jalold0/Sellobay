import { PrismaClient, UserRole, UserStatus, ProductStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.info('[seed] starting...');

  // --- Kategoriyalar (top-level) ---
  const categories = [
    { slug: 'clothing', name: { uz: 'Kiyim-kechak', ru: 'Одежда', en: 'Clothing' } },
    { slug: 'shoes', name: { uz: 'Poyabzal', ru: 'Обувь', en: 'Shoes' } },
    { slug: 'perfume', name: { uz: 'Atirlar', ru: 'Парфюмерия', en: 'Perfume' } },
    { slug: 'cosmetics', name: { uz: 'Kosmetika', ru: 'Косметика', en: 'Cosmetics' } },
    { slug: 'beauty', name: { uz: "Go'zallik mahsulotlari", ru: 'Красота', en: 'Beauty' } },
    { slug: 'accessories', name: { uz: 'Aksessuarlar', ru: 'Аксессуары', en: 'Accessories' } },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { slug: cat.slug, name: cat.name },
    });
  }
  console.info(`[seed] ${categories.length} categories ready`);

  // --- Brendlar ---
  const brands = [
    { slug: 'nike', name: 'Nike' },
    { slug: 'adidas', name: 'Adidas' },
    { slug: 'zara', name: 'Zara' },
    { slug: 'chanel', name: 'Chanel' },
    { slug: 'dior', name: 'Dior' },
  ];

  for (const b of brands) {
    await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {},
      create: b,
    });
  }
  console.info(`[seed] ${brands.length} brands ready`);

  // --- Super admin ---
  await prisma.user.upsert({
    where: { email: 'admin@example.uz' },
    update: {},
    create: {
      email: 'admin@example.uz',
      firstName: 'Super',
      lastName: 'Admin',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      passwordHash: '$argon2id$placeholder', // real seed kerakli vaqtda generatsiya qilinadi
      roles: {
        create: [{ role: UserRole.SUPER_ADMIN }],
      },
    },
  });
  console.info('[seed] super admin ready (admin@example.uz)');

  // --- Asosiy ombor ---
  await prisma.warehouse.upsert({
    where: { code: 'WH-TASHKENT-MAIN' },
    update: {},
    create: {
      code: 'WH-TASHKENT-MAIN',
      name: 'Tashkent Main Warehouse',
      address: "Yangihayot tumani, Sanoat ko'chasi 12",
      city: 'Tashkent',
      region: 'Tashkent',
    },
  });
  console.info('[seed] main warehouse ready');

  console.info('[seed] done.');
}

main()
  .catch((e) => {
    console.error('[seed] failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
