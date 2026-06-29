import { PrismaClient, UserRole, UserStatus, ProductStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ===================================================================
// Sellobay seed data
// Bosh sahifa va catalog ishlashi uchun: categories + brands + products
// ===================================================================

async function main() {
  console.info('[seed] starting Sellobay seed...');

  // ─── Kategoriyalar (6 ta — TZ §3) ─────────────────────────────
  const categories = [
    { slug: 'clothing', name: { uz: 'Kiyim-kechak', ru: 'Одежда', en: 'Clothing' } },
    { slug: 'shoes', name: { uz: 'Poyabzal', ru: 'Обувь', en: 'Shoes' } },
    { slug: 'perfume', name: { uz: 'Atirlar', ru: 'Парфюмерия', en: 'Perfume' } },
    { slug: 'cosmetics', name: { uz: 'Kosmetika', ru: 'Косметика', en: 'Cosmetics' } },
    { slug: 'beauty', name: { uz: "Go'zallik", ru: 'Красота', en: 'Beauty' } },
    { slug: 'accessories', name: { uz: 'Aksessuarlar', ru: 'Аксессуары', en: 'Accessories' } },
  ];
  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    const c = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { slug: cat.slug, name: cat.name },
    });
    categoryMap.set(cat.slug, c.id);
  }
  console.info(`[seed] ${categories.length} kategoriya tayyor`);

  // ─── Brendlar (8 ta) ──────────────────────────────────────────
  const brands = [
    { slug: 'nike', name: 'Nike' },
    { slug: 'adidas', name: 'Adidas' },
    { slug: 'zara', name: 'Zara' },
    { slug: 'chanel', name: 'Chanel' },
    { slug: 'dior', name: 'Dior' },
    { slug: 'gucci', name: 'Gucci' },
    { slug: 'prada', name: 'Prada' },
    { slug: 'puma', name: 'Puma' },
  ];
  const brandMap = new Map<string, string>();
  for (const b of brands) {
    const created = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {},
      create: b,
    });
    brandMap.set(b.slug, created.id);
  }
  console.info(`[seed] ${brands.length} brend tayyor`);

  // ─── Super admin (test) ───────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@sellobay.uz' },
    update: {},
    create: {
      email: 'admin@sellobay.uz',
      firstName: 'Super',
      lastName: 'Admin',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      passwordHash: '$argon2id$placeholder', // keyin haqiqiy hash bilan almashtiriladi
      roles: { create: [{ role: UserRole.SUPER_ADMIN }] },
    },
  });
  console.info('[seed] super admin: admin@sellobay.uz');

  // ─── Asosiy ombor ─────────────────────────────────────────────
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

  // ─── Test sotuvchi ─────────────────────────────────────────────
  const sellerUser = await prisma.user.upsert({
    where: { email: 'nike@sellobay.uz' },
    update: {},
    create: {
      email: 'nike@sellobay.uz',
      firstName: 'Nike',
      lastName: 'Store',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      passwordHash: '$argon2id$placeholder',
      roles: { create: [{ role: UserRole.SELLER }] },
    },
  });

  const seller = await prisma.seller.upsert({
    where: { ownerUserId: sellerUser.id },
    update: {},
    create: {
      ownerUserId: sellerUser.id,
      legalName: 'Nike Store O‘zbekiston MChJ',
      brandName: 'Nike Store',
      status: 'ACTIVE',
      commissionRate: 12.5,
    },
  });
  console.info('[seed] test seller: Nike Store');

  // ─── Mahsulotlar (8 ta — bosh sahifa uchun) ─────────────────
  const products = [
    {
      slug: 'nike-air-max-270',
      sku: 'NK-AM-270',
      name: { uz: 'Nike Air Max 270', ru: 'Nike Air Max 270', en: 'Nike Air Max 270' },
      brand: 'nike',
      category: 'shoes',
      basePrice: 1490000,
      compareAtPrice: 1790000,
      isFeatured: true,
      rating: 4.8,
      reviewCount: 124,
      soldCount: 340,
      imageSeed: 'nike-air-max',
    },
    {
      slug: 'adidas-ultraboost-22',
      sku: 'AD-UB-22',
      name: { uz: 'Adidas Ultraboost 22', ru: 'Adidas Ultraboost 22', en: 'Adidas Ultraboost 22' },
      brand: 'adidas',
      category: 'shoes',
      basePrice: 1890000,
      isFeatured: true,
      rating: 4.7,
      reviewCount: 89,
      soldCount: 215,
      imageSeed: 'adidas-ub',
    },
    {
      slug: 'chanel-no5-eau-de-parfum',
      sku: 'CH-N5-EDP',
      name: { uz: 'Chanel N°5 Eau de Parfum', ru: 'Chanel N°5', en: 'Chanel N°5' },
      brand: 'chanel',
      category: 'perfume',
      basePrice: 2450000,
      compareAtPrice: 2890000,
      isFeatured: true,
      rating: 4.9,
      reviewCount: 312,
      soldCount: 580,
      imageSeed: 'chanel-no5',
    },
    {
      slug: 'dior-sauvage-edt',
      sku: 'DI-SV-EDT',
      name: { uz: 'Dior Sauvage EDT 100ml', ru: 'Dior Sauvage', en: 'Dior Sauvage' },
      brand: 'dior',
      category: 'perfume',
      basePrice: 1980000,
      rating: 4.8,
      reviewCount: 198,
      soldCount: 420,
      imageSeed: 'dior-sauvage',
    },
    {
      slug: 'zara-oversized-shirt',
      sku: 'ZR-OS-001',
      name: { uz: 'Zara Oversized Shirt', ru: 'Zara Oversized', en: 'Zara Oversized Shirt' },
      brand: 'zara',
      category: 'clothing',
      basePrice: 390000,
      compareAtPrice: 490000,
      isFeatured: true,
      rating: 4.5,
      reviewCount: 67,
      soldCount: 145,
      imageSeed: 'zara-shirt',
    },
    {
      slug: 'gucci-marmont-bag',
      sku: 'GC-MM-BAG',
      name: { uz: 'Gucci Marmont Sumka', ru: 'Gucci Marmont', en: 'Gucci Marmont Bag' },
      brand: 'gucci',
      category: 'accessories',
      basePrice: 18500000,
      isFeatured: true,
      rating: 4.9,
      reviewCount: 45,
      soldCount: 28,
      imageSeed: 'gucci-marmont',
    },
    {
      slug: 'mac-ruby-woo-lipstick',
      sku: 'MAC-RW-LIP',
      name: { uz: 'MAC Ruby Woo lablo‘yog‘i', ru: 'MAC Ruby Woo', en: 'MAC Ruby Woo Lipstick' },
      brand: 'chanel', // brendsiz bo'ladi keyin
      category: 'cosmetics',
      basePrice: 285000,
      compareAtPrice: 350000,
      rating: 4.7,
      reviewCount: 234,
      soldCount: 670,
      imageSeed: 'mac-ruby',
    },
    {
      slug: 'puma-rs-x-sneakers',
      sku: 'PM-RSX-001',
      name: { uz: 'Puma RS-X krossovkalar', ru: 'Puma RS-X', en: 'Puma RS-X Sneakers' },
      brand: 'puma',
      category: 'shoes',
      basePrice: 990000,
      rating: 4.6,
      reviewCount: 78,
      soldCount: 156,
      imageSeed: 'puma-rsx',
    },
  ];

  for (const p of products) {
    const productImage = `https://picsum.photos/seed/${p.imageSeed}/600/600`;
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      // Mavjud mahsulotlarda ham status/narxni tuzatib qo'yamiz (idempotent seed)
      update: {
        status: ProductStatus.ACTIVE,
        publishedAt: new Date(),
        isFeatured: p.isFeatured ?? false,
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice ?? null,
        rating: p.rating,
        reviewCount: p.reviewCount,
        soldCount: p.soldCount,
      },
      create: {
        slug: p.slug,
        sku: p.sku,
        name: p.name,
        description: {
          uz: `${(p.name as { uz: string }).uz} — premium sifat, asl mahsulot, tezkor yetkazib berish.`,
          ru: `${(p.name as { ru: string }).ru} — премиум качество.`,
          en: `${(p.name as { en: string }).en} — premium quality.`,
        },
        status: ProductStatus.ACTIVE,
        isFeatured: p.isFeatured ?? false,
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice ?? null,
        currency: 'UZS',
        rating: p.rating,
        reviewCount: p.reviewCount,
        soldCount: p.soldCount,
        publishedAt: new Date(),
        sellerId: seller.id,
        brandId: brandMap.get(p.brand) ?? null,
        categories: {
          create: [{ categoryId: categoryMap.get(p.category)! }],
        },
        images: {
          create: [
            {
              url: productImage,
              alt: { uz: (p.name as { uz: string }).uz },
              position: 0,
              isPrimary: true,
            },
          ],
        },
      },
    });
    if (product) console.info(`[seed] product: ${p.slug}`);
  }

  console.info(`[seed] ${products.length} mahsulot tayyor`);

  // ── Promokodlar ─────────────────────────────────────────────────
  const promoEndsAt = new Date('2026-12-31T23:59:59Z');
  const promos = [
    {
      code: 'WELCOME10',
      type: 'PERCENT' as const,
      value: 10,
      minOrderTotal: 100_000,
      maxDiscount: 50_000,
      usagePerUser: 1,
    },
    {
      code: 'FREESHIP',
      type: 'FREE_SHIPPING' as const,
      value: 0,
      minOrderTotal: null,
      maxDiscount: null,
      usagePerUser: 3,
    },
    {
      code: 'NASIYA25S5',
      type: 'FIXED' as const,
      value: 100_000,
      minOrderTotal: 500_000,
      maxDiscount: null,
      usagePerUser: 1,
    },
  ];
  for (const p of promos) {
    await prisma.promoCode.upsert({
      where: { code: p.code },
      update: {
        type: p.type,
        value: p.value,
        minOrderTotal: p.minOrderTotal,
        maxDiscount: p.maxDiscount,
        usagePerUser: p.usagePerUser,
        endsAt: promoEndsAt,
        isActive: true,
      },
      create: {
        code: p.code,
        type: p.type,
        value: p.value,
        minOrderTotal: p.minOrderTotal,
        maxDiscount: p.maxDiscount,
        usagePerUser: p.usagePerUser,
        endsAt: promoEndsAt,
        isActive: true,
      },
    });
    console.info(`[seed] promo: ${p.code}`);
  }

  console.info('[seed] DONE! Sellobay DB ishga tayyor.');
}

main()
  .catch((e) => {
    console.error('[seed] failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    void prisma.$disconnect();
  });
