import {
  PrismaClient,
  UserRole,
  UserStatus,
  ProductStatus,
  StockMovementType,
} from '@prisma/client';

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
  const mainWarehouse = await prisma.warehouse.upsert({
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

  // Har bir mahsulot uchun boshlang'ich zaxira (default varyant + inventar).
  const INITIAL_STOCK = 100;

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
    // Rasmlar repo ichida: apps/web/public/products/<imageSeed>.jpg
    const productImage = `/products/${p.imageSeed}.jpg`;
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

    // ── Ombor: default varyant + inventar (idempotent) ────────────
    // InventoryItem/StockMovement VARYANT bo'yicha kalitlanadi, OrderItem esa
    // varyantsiz (productId) kelishi mumkin — shuning uchun har bir mahsulotga
    // bitta "default" varyant beramiz va zaxirani o'shanga bog'laymiz. Katalog,
    // buyurtma (DISPATCH) va bekor/qaytarish (RETURN) shu qatordan foydalanadi.
    const variant = await prisma.productVariant.upsert({
      where: { sku: p.sku },
      update: {},
      create: { productId: product.id, sku: p.sku, position: 0, isActive: true },
    });
    // Inventar qatorini faqat yo'q bo'lsa yaratamiz — qayta seed'da zaxira ikki
    // baravar oshib ketmasligi uchun (upsert emas, chunki locationId null).
    const existingInv = await prisma.inventoryItem.findFirst({
      where: { warehouseId: mainWarehouse.id, variantId: variant.id, locationId: null },
      select: { id: true },
    });
    if (!existingInv) {
      await prisma.inventoryItem.create({
        data: {
          warehouseId: mainWarehouse.id,
          variantId: variant.id,
          quantityOnHand: INITIAL_STOCK,
          quantityReserved: 0,
          reorderPoint: 10,
        },
      });
      await prisma.stockMovement.create({
        data: {
          warehouseId: mainWarehouse.id,
          variantId: variant.id,
          type: StockMovementType.RECEIVING,
          quantity: INITIAL_STOCK,
          reason: 'seed:initial-stock',
        },
      });
    }
  }

  console.info(`[seed] ${products.length} mahsulot + boshlang'ich zaxira tayyor`);

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

  // ── Topshirish punktlari (pickup points) ────────────────────────
  const pickupPoints = [
    {
      code: 'PVZ-TAS-001',
      provider: 'SELLOBAY',
      name: { uz: 'Chorsu punkti', ru: 'ПВЗ Чорсу', en: 'Chorsu Pickup' },
      region: 'Toshkent',
      city: 'Toshkent',
      district: 'Shayxontohur',
      street: "Navoiy ko'chasi 24",
      latitude: 41.326,
      longitude: 69.234,
      phone: '+998712000001',
      workingHours: 'Du-Sha 09:00-20:00',
    },
    {
      code: 'PVZ-TAS-002',
      provider: 'SELLOBAY',
      name: { uz: 'Chilonzor punkti', ru: 'ПВЗ Чиланзар', en: 'Chilonzor Pickup' },
      region: 'Toshkent',
      city: 'Toshkent',
      district: 'Chilonzor',
      street: 'Bunyodkor shoh 12',
      latitude: 41.275,
      longitude: 69.204,
      phone: '+998712000002',
      workingHours: 'Du-Sha 09:00-20:00',
    },
    {
      code: 'PVZ-TAS-003',
      provider: 'BTS',
      name: { uz: 'Yunusobod punkti', ru: 'ПВЗ Юнусабад', en: 'Yunusobod Pickup' },
      region: 'Toshkent',
      city: 'Toshkent',
      district: 'Yunusobod',
      street: 'Amir Temur 108',
      latitude: 41.367,
      longitude: 69.289,
      phone: '+998712000003',
      workingHours: 'Du-Ya 10:00-21:00',
    },
    {
      code: 'PVZ-TAS-004',
      provider: 'FARGO',
      name: { uz: 'Sergeli punkti', ru: 'ПВЗ Сергели', en: 'Sergeli Pickup' },
      region: 'Toshkent',
      city: 'Toshkent',
      district: 'Sergeli',
      street: 'Yangi Sergeli 4',
      latitude: 41.23,
      longitude: 69.22,
      phone: '+998712000004',
      workingHours: 'Du-Sha 09:00-19:00',
    },
    {
      code: 'PVZ-SAM-001',
      provider: 'SELLOBAY',
      name: { uz: 'Samarqand markaz', ru: 'ПВЗ Самарканд', en: 'Samarkand Center' },
      region: 'Samarqand',
      city: 'Samarqand',
      street: "Registon ko'chasi 15",
      latitude: 39.654,
      longitude: 66.96,
      phone: '+998662000001',
      workingHours: 'Du-Sha 09:00-19:00',
    },
    {
      code: 'PVZ-BUX-001',
      provider: 'BTS',
      name: { uz: 'Buxoro markaz', ru: 'ПВЗ Бухара', en: 'Bukhara Center' },
      region: 'Buxoro',
      city: 'Buxoro',
      street: "Mustaqillik ko'chasi 8",
      latitude: 39.767,
      longitude: 64.421,
      phone: '+998652000001',
      workingHours: 'Du-Sha 09:00-19:00',
    },
    {
      code: 'PVZ-AND-001',
      provider: 'SELLOBAY',
      name: { uz: 'Andijon markaz', ru: 'ПВЗ Андижан', en: 'Andijan Center' },
      region: 'Andijon',
      city: 'Andijon',
      street: 'Navoiy 22',
      latitude: 40.783,
      longitude: 72.344,
      phone: '+998742000001',
      workingHours: 'Du-Sha 09:00-19:00',
    },
    {
      code: 'PVZ-NAM-001',
      provider: 'FARGO',
      name: { uz: 'Namangan markaz', ru: 'ПВЗ Наманган', en: 'Namangan Center' },
      region: 'Namangan',
      city: 'Namangan',
      street: 'Uychi 5',
      latitude: 40.998,
      longitude: 71.672,
      phone: '+998692000001',
      workingHours: 'Du-Sha 09:00-19:00',
    },
    {
      code: 'PVZ-FAR-001',
      provider: 'BTS',
      name: { uz: "Farg'ona markaz", ru: 'ПВЗ Фергана', en: 'Fergana Center' },
      region: "Farg'ona",
      city: "Farg'ona",
      street: "Mustaqillik ko'chasi 30",
      latitude: 40.386,
      longitude: 71.787,
      phone: '+998732000001',
      workingHours: 'Du-Sha 09:00-19:00',
    },
    {
      code: 'PVZ-QAR-001',
      provider: 'POCHTA',
      name: { uz: 'Qarshi markaz', ru: 'ПВЗ Карши', en: 'Qarshi Center' },
      region: 'Qashqadaryo',
      city: 'Qarshi',
      street: 'Islom Karimov 40',
      latitude: 38.86,
      longitude: 65.799,
      phone: '+998752000001',
      workingHours: 'Du-Ju 09:00-18:00',
    },
    {
      code: 'PVZ-URG-001',
      provider: 'POCHTA',
      name: { uz: 'Urganch markaz', ru: 'ПВЗ Ургенч', en: 'Urgench Center' },
      region: 'Xorazm',
      city: 'Urganch',
      street: 'Al-Xorazmiy 3',
      latitude: 41.55,
      longitude: 60.631,
      phone: '+998622000001',
      workingHours: 'Du-Ju 09:00-18:00',
    },
    {
      code: 'PVZ-NUK-001',
      provider: 'POCHTA',
      name: { uz: 'Nukus markaz', ru: 'ПВЗ Нукус', en: 'Nukus Center' },
      region: "Qoraqalpog'iston",
      city: 'Nukus',
      street: 'Dosnazarov 7',
      latitude: 42.46,
      longitude: 59.617,
      phone: '+998612000001',
      workingHours: 'Du-Ju 09:00-18:00',
    },
  ];
  for (const pp of pickupPoints) {
    await prisma.pickupPoint.upsert({ where: { code: pp.code }, update: pp, create: pp });
  }
  console.info(`[seed] ${pickupPoints.length} pickup point tayyor`);

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
