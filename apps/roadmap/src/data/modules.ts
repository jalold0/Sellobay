import type { Module } from './types';

/**
 * Sellobay bo'limlari — holat 2026-08-31.
 *
 * Har bir baho koddan yoki bazadan olingan. `evidence` maydonini o'qib
 * tekshirish mumkin. Taxminiy baho qo'yilmagan: bilinmagan narsa `planned`.
 */
export const MODULES: Module[] = [
  // ══════════════════ MIJOZ ILOVALARI ══════════════════
  {
    id: 'web',
    name: 'Xaridor veb-sayti',
    layer: 'Mijoz ilovalari',
    purpose:
      'Mijoz mahsulot topadigan, savatga soladigan va buyurtma beradigan asosiy kanal. Ayni paytda backend ham shu ilova ichida.',
    owner: 'frontend',
    features: [
      {
        title: 'Katalog va mahsulot sahifasi',
        does: 'Mijoz kategoriyalar bo‘ylab yuradi, mahsulot kartasini ochadi, rasm, narx, tavsif va variantlarni ko‘radi.',
        status: 'done',
        evidence: 'apps/web/src/app/[locale]/catalog, /product/[slug]',
      },
      {
        title: 'Savat va checkout',
        does: 'Savatga qo‘shish, manzil kiritish, yetkazish usuli va to‘lov turini tanlash, buyurtmani tasdiqlash.',
        status: 'done',
        evidence: 'apps/web/src/components/checkout/checkout-flow.tsx',
      },
      {
        title: 'Profil va buyurtmalar tarixi',
        does: 'Mijoz o‘z buyurtmalarini, manzillarini, sevimlilarini va sodiqlik ballarini ko‘radi.',
        status: 'done',
        evidence: 'apps/web/src/app/[locale]/profile/*',
      },
      {
        title: 'Bosh sahifa — marketplace tuzilmasi',
        does: 'Birinchi ekranda mahsulot ko‘rinadi, banner konteyner ichida, xizmat va’dalari ostida.',
        status: 'wip',
        evidence: 'MR !6 — birinchi mahsulot 1633px → 726px',
        tasks: [
          { title: 'MR !6 ni ko‘rib chiqib merge qilish', role: 'asoschi', priority: 'yuqori' },
        ],
      },
      {
        title: 'Ko‘p tillilik — to‘liq qamrov',
        does: 'Sayt uz/ru/en tillarida to‘liq ishlaydi, hech qayerda qattiq kodlangan matn qolmaydi.',
        status: 'wip',
        evidence:
          '12+ faylda qattiq kodlangan o‘zbekcha: cookie banner, 404, error, marketing sahifalari',
        tasks: [
          {
            title: 'Marketing va yuridik sahifalarni tarjima qilish',
            role: 'kontent',
            priority: 'orta',
            why: 'Universal komponentlar MR !13 da tarjima qilindi; qolgani uzun matn va yuridik ko‘rik talab qiladi',
          },
          {
            title: '9 ta marketing/yuridik sahifani tarjima qilish',
            role: 'kontent',
            priority: 'orta',
            why: 'contacts, delivery, download, sell, privacy, cookies, commissions, about, returns',
          },
        ],
      },
      {
        title: 'Korporativ sahifalarni ajratish',
        does: 'about, careers, press, terms kabi 17 ta sahifa marketplace‘dan alohida bo‘limga chiqadi.',
        status: 'planned',
        evidence: 'Hozir 41 route‘ning 17 tasi korporativ — do‘kon bilan aralashgan',
        tasks: [
          {
            title: 'Korporativ sahifalar uchun alohida tuzilma',
            role: 'frontend',
            priority: 'orta',
          },
        ],
      },
    ],
  },
  {
    id: 'mobile',
    name: 'Mobil ilova',
    layer: 'Mijoz ilovalari',
    purpose: 'Expo (React Native) ilovasi — xaridor uchun ikkinchi asosiy kanal.',
    owner: 'mobil',
    features: [
      {
        title: 'Katalog, mahsulot, checkout',
        does: 'Veb bilan bir xil xarid oqimi telefonda.',
        status: 'done',
        evidence: 'apps/mobile/app/* — Expo Router ekranlari',
      },
      {
        title: 'API shartnomasiga bog‘lanish',
        does: 'Mobil server kutgan maydonlarni aynan yuboradi va serverga o‘zgarish kiritilsa kompilyatsiya vaqtida xato beradi.',
        status: 'gap',
        evidence: 'apps/mobile/src/lib/api/orders.ts:7 — CreateOrderInput qo‘lda nusxalangan',
        tasks: [
          {
            title: 'Buyurtma shartnomasini ulashilgan paketdan olish',
            role: 'backend',
            priority: 'yuqori',
            why: 'Hozir mos, lekin serverga bitta maydon qo‘shilsa mobil jimgina 400 qaytaradi',
          },
        ],
      },
      {
        title: 'Mahsulot rasmlari',
        does: 'Mobil ilovada web bilan BIR XIL rasmlar ko‘rinadi.',
        status: 'done',
        evidence: 'MR !15 — @ecom/utils/product-image; mobil absolut manzil oladi',
      },
    ],
  },
  {
    id: 'seller',
    name: 'Sotuvchi kabineti',
    layer: 'Mijoz ilovalari',
    purpose: 'Sotuvchi mahsulot qo‘shadi, buyurtmalarini ko‘radi va boshqaradi.',
    owner: 'frontend',
    features: [
      {
        title: 'Mahsulot qo‘shish va tahrirlash',
        does: 'Sotuvchi nom, narx, zaxira, kategoriya va variantlarni kiritadi.',
        status: 'done',
        evidence: 'apps/seller/src/app/products/new/page.tsx',
      },
      {
        title: 'Buyurtmalar ro‘yxati',
        does: 'Sotuvchi o‘ziga tegishli buyurtmalarni ko‘radi va holatini yangilaydi.',
        status: 'done',
        evidence: 'apps/seller/src/app/api/orders',
      },
      {
        title: 'Rasm yuklash',
        does: 'Sotuvchi telefon yoki kompyuterdan mahsulot rasmini to‘g‘ridan-to‘g‘ri yuklaydi.',
        status: 'done',
        evidence:
          'MR !14 — /api/uploads/product-image + ProductImageUploader; 4 tagacha rasm, birinchisi asosiy',
      },
    ],
  },
  {
    id: 'admin',
    name: 'Admin / operator paneli',
    layer: 'Mijoz ilovalari',
    purpose:
      'Ichki jamoa buyurtmalarni yuritadi, to‘lovlarni tasdiqlaydi, sotuvchilarni qabul qiladi.',
    owner: 'operator',
    features: [
      {
        title: 'Buyurtma boshqaruvi',
        does: 'Operator buyurtma holatini o‘zgartiradi, to‘lovni tekshiradi, muammoli holatni hal qiladi.',
        status: 'done',
        evidence: '21 ta admin endpoint — orders, orders/[id]/status, orders/payment-review',
      },
      {
        title: 'Sotuvchi tasdiqlash',
        does: 'Yangi sotuvchi arizasini ko‘rib chiqib tasdiqlaydi yoki rad etadi.',
        status: 'done',
        evidence: 'apps/admin/src/app/api/sellers/[id]/approve',
      },
      {
        title: 'Sellobay Global boshqaruvi',
        does: 'Xitoydan sourcing so‘rovlari, katalog importi, narx hisobi va fulfillment.',
        status: 'done',
        evidence: 'apps/admin/src/app/api/global/*',
      },
      {
        title: 'Sotuvchi hujjatlarini tekshirish (KYC)',
        does: 'Sotuvchining shaxsini va tadbirkorlik hujjatlarini rasmiy tekshirish.',
        status: 'planned',
        tasks: [{ title: 'KYC oqimi va hujjat saqlash', role: 'backend', priority: 'orta' }],
      },
    ],
  },
  {
    id: 'telegram',
    name: 'Telegram bot va mini-app',
    layer: 'Mijoz ilovalari',
    purpose:
      'O‘zbekiston bozorida Telegram asosiy kanal — bot va mini-ilova orqali xarid va bildirishnoma.',
    owner: 'backend',
    features: [
      {
        title: 'Bot skeleti',
        does: 'grammY asosidagi bot — buyurtma bildirishnomalari va oddiy buyruqlar.',
        status: 'wip',
        evidence: 'apps/telegram-bot',
      },
      {
        title: 'Mini-app',
        does: 'Telegram ichida ochiladigan katalog va checkout.',
        status: 'wip',
        evidence: 'apps/telegram-mini-app — skeleton holatida',
        tasks: [
          { title: 'Mini-app‘ni haqiqiy katalogga ulash', role: 'frontend', priority: 'orta' },
        ],
      },
    ],
  },
  {
    id: 'courier',
    name: 'Kuryer ilovasi',
    layer: 'Mijoz ilovalari',
    purpose: 'Kuryer yetkazish topshiriqlarini oladi va holatini belgilaydi.',
    owner: 'mobil',
    features: [
      {
        title: 'Ilova skeleti',
        does: 'Expo ilovasi mavjud, lekin yetkazish oqimi to‘liq emas.',
        status: 'wip',
        evidence: 'apps/courier — juda kichik',
        tasks: [{ title: 'Yetkazish oqimini to‘ldirish', role: 'mobil', priority: 'orta' }],
      },
    ],
  },

  // ══════════════════ KIRISH QATLAMI ══════════════════
  {
    id: 'auth',
    name: 'Autentifikatsiya va sessiya',
    layer: 'Kirish qatlami',
    purpose: 'Kim kirganini bilish va nima qila olishini cheklash.',
    owner: 'backend',
    features: [
      {
        title: 'Parol va OTP bilan kirish',
        does: 'Mijoz email/parol yoki telefon raqamiga kelgan kod bilan kiradi.',
        status: 'done',
        evidence: 'argon2 + jose, /api/auth/login, /api/auth/otp/*',
      },
      {
        title: 'Sessiya va rollar',
        does: 'httpOnly cookie sessiya, rol bo‘yicha huquq (mijoz, sotuvchi, operator, admin).',
        status: 'done',
        evidence: 'UserSession, RefreshToken, UserRoleAssignment modellari',
      },
      {
        title: 'Auth kodini ulashish',
        does: 'Sessiya mantiqi bitta paketda bo‘ladi, uchta ilovada nusxalanmaydi.',
        status: 'gap',
        evidence: 'session.ts, middleware.ts, constants.ts web/admin/seller‘da bayt-baytga bir xil',
        tasks: [
          {
            title: 'Sessiya qatlamini @ecom/auth ga ko‘chirish',
            role: 'backend',
            priority: 'yuqori',
            why: 'Xavfsizlik tuzatishi uch joyda qilinishi kerak — bittasi unutilsa teshik qoladi',
          },
        ],
      },
      {
        title: 'So‘rov cheklovi (rate limit)',
        does: 'Bir IP dan ko‘p so‘rov kelsa cheklanadi — brute force va suiiste’molga qarshi.',
        status: 'wip',
        evidence: 'Faqat 3 ta auth endpoint‘ida; buyurtma va promo himoyalanmagan',
        tasks: [
          {
            title: 'Buyurtma va promo endpointlariga cheklov qo‘shish',
            role: 'backend',
            priority: 'yuqori',
          },
        ],
      },
    ],
  },

  // ══════════════════ DOMEN ══════════════════
  {
    id: 'catalog',
    name: 'Katalog',
    layer: 'Domen',
    purpose: 'Mahsulot, variant, atribut, kategoriya va brend — marketplace‘ning yuragi.',
    owner: 'backend',
    features: [
      {
        title: 'Mahsulot va variant modeli',
        does: 'Har bir mahsulotning rangi, o‘lchami, SKU‘si va alohida zaxirasi bo‘lishi mumkin.',
        status: 'done',
        evidence: 'Product, ProductVariant, Attribute, VariantAttribute modellari',
      },
      {
        title: 'Ko‘p tilli nomlar',
        does: 'Mahsulot nomi va tavsifi uch tilda saqlanadi; tarjima yo‘q bo‘lsa o‘zbekchaga qaytadi.',
        status: 'done',
        evidence: 'Json ustunlar + pickLocalized(); MR !5 da tur haqiqiy shaklga keltirildi',
      },
      {
        title: 'Kategoriya taksonomiyasi',
        does: 'Mahsulotlar tushunarli kategoriyalarga bo‘linadi va mijoz ular bo‘ylab yuradi.',
        status: 'wip',
        evidence: 'Bazada 6 ta kategoriya — hammasi moda/go‘zallik',
        tasks: [
          {
            title: 'Taksonomiyani 20 ta kategoriyagacha kengaytirish',
            role: 'asoschi',
            priority: 'yuqori',
            why: '6 ta kategoriya butik degani; marketplace kamida 20 tadan boshlanadi. Har biriga sotuvchi kerak — bu biznes ishi',
          },
        ],
      },
      {
        title: 'Mahsulot rasmlari',
        does: 'Har bir mahsulotda haqiqiy foto ko‘rinadi.',
        status: 'wip',
        evidence: 'MR !7 + !15 — 24 ta rasm repoda, hisoblash mantiqi @ecom/utils da (12 ta test)',
      },
    ],
  },
  {
    id: 'search',
    name: 'Qidiruv va kashfiyot',
    layer: 'Domen',
    purpose:
      'Mijoz izlagan narsasini topa olishi. Marketplace‘da savdoning katta qismi qidiruvdan keladi.',
    owner: 'backend',
    features: [
      {
        title: 'Oddiy matn qidiruvi',
        does: 'Mijoz yozgan so‘z mahsulot nomida bor-yo‘qligini tekshiradi.',
        status: 'wip',
        evidence: 'Postgres string_contains; /api/products/suggest',
      },
      {
        title: 'Fasetlar va saralash',
        does: 'Narx oralig‘i, brend, o‘lcham, reyting bo‘yicha filtrlash.',
        status: 'planned',
        tasks: [{ title: 'Faset filtrlarini qurish', role: 'backend', priority: 'orta' }],
      },
      {
        title: 'Qidiruv indeksi',
        does: 'Xato yozilgan so‘zni ham topadi, sinonimlarni biladi, natijalarni to‘g‘ri tartiblaydi.',
        status: 'gap',
        evidence: 'Elasticsearch faqat graveyard/api da qolgan — tirik stekda yo‘q',
        tasks: [
          {
            title: 'Qidiruv indeksini joriy etish',
            role: 'backend',
            priority: 'orta',
            why: 'Hozir 12 mahsulotda muammo yo‘q. Bir necha mingtada birinchi bo‘lib shu yoriladi',
          },
        ],
      },
    ],
  },
  {
    id: 'orders',
    name: 'Buyurtma va checkout',
    layer: 'Domen',
    purpose: 'Savatdan pulgacha bo‘lgan yo‘l — biznesning asosiy oqimi.',
    owner: 'backend',
    features: [
      {
        title: 'Buyurtma yaratish',
        does: 'Savat tekshiriladi, manzil va to‘lov turi qabul qilinadi, buyurtma raqami beriladi.',
        status: 'done',
        evidence: 'apps/web/src/lib/orders-server.ts — zod validatsiya bilan',
      },
      {
        title: 'Holat tarixi',
        does: 'Buyurtmaning har bir holati yozib boriladi — kim, qachon, nima o‘zgartirdi.',
        status: 'done',
        evidence: 'OrderStatusHistory modeli',
      },
      {
        title: 'Bekor qilish va qaytarish',
        does: 'Mijoz buyurtmani bekor qiladi yoki mahsulotni qaytaradi.',
        status: 'done',
        evidence: '/api/orders/[id]/cancel, /api/orders/[id]/return',
      },
      {
        title: 'Pul xavfsizligi qoidalari',
        does: 'Global buyurtma faqat oldindan to‘lov bilan; to‘lov tasdiqlanmaguncha Xitoydan sotib olinmaydi.',
        status: 'done',
        evidence: 'fix/global-payment-guards branchi — 400 GLOBAL_PREPAID_ONLY, 409 NOT_PAID',
      },
      {
        title: 'Checkout uchun avtotest',
        does: 'Har deployda checkout oqimi avtomatik tekshiriladi.',
        status: 'gap',
        evidence: 'E2E skriptlar bor, lekin CI‘da yurmaydi',
        tasks: [
          {
            title: 'E2E skriptlarni CI pipeline‘ga ulash',
            role: 'devops',
            priority: 'yuqori',
            why: 'Pul bilan bog‘liq oqim har deployda qo‘lda tekshirilyapti',
          },
        ],
      },
    ],
  },
  {
    id: 'inventory',
    name: 'Zaxira va ombor',
    layer: 'Domen',
    purpose: 'Mavjud bo‘lmagan mahsulotni sotib qo‘ymaslik.',
    owner: 'backend',
    features: [
      {
        title: 'Zaxira hisobi',
        does: 'Har bir variant uchun ombordagi miqdor yuritiladi va har harakat yozib boriladi.',
        status: 'done',
        evidence: 'InventoryItem, StockMovement, Warehouse modellari',
      },
      {
        title: 'Ortiqcha sotuvga qarshi himoya',
        does: 'Ikki mijoz oxirgi mahsulotni bir vaqtda olsa, faqat bittasi muvaffaqiyat qozonadi.',
        status: 'done',
        evidence: 'scripts/oversell-concurrency-test.ts',
      },
    ],
  },
  {
    id: 'payments',
    name: 'To‘lovlar',
    layer: 'Domen',
    purpose: 'Pulni ishonchli qabul qilish va hisobini yuritish.',
    owner: 'backend',
    features: [
      {
        title: 'Payme va Click integratsiyasi',
        does: 'Mijoz Payme yoki Click orqali to‘laydi, natija webhook orqali qaytadi.',
        status: 'done',
        evidence: '/api/payments/payme, /api/payments/click — idempotentlik hisobga olingan',
      },
      {
        title: 'Karta orqali qo‘lda to‘lov',
        does: 'Mijoz kartaga o‘tkazadi va chek rasmini yuklaydi, operator tasdiqlaydi.',
        status: 'done',
        evidence: '/api/orders + admin payment-review',
      },
      {
        title: 'Chek rasmlarini to‘g‘ri saqlash',
        does: 'Chek Blob‘da YOPIQ saqlanadi, bazada faqat ichki yo‘l turadi.',
        status: 'done',
        evidence:
          'MR !14 — access: private; admin /api/orders/receipt-image orqali, sessiya tekshiruvi bilan ko‘radi',
      },
      {
        title: 'Moliyaviy hisobot va solishtirish',
        does: 'PSP‘dan kelgan pul bilan bazadagi buyurtmalar solishtiriladi.',
        status: 'planned',
        tasks: [{ title: 'Kunlik solishtirish hisoboti', role: 'backend', priority: 'orta' }],
      },
    ],
  },
  {
    id: 'sellers',
    name: 'Sotuvchi hayot sikli',
    layer: 'Domen',
    purpose: 'Sotuvchini jalb qilish, tasdiqlash, komissiya olish va pulini o‘tkazish.',
    owner: 'operator',
    features: [
      {
        title: 'Ro‘yxatdan o‘tish va tasdiqlash',
        does: 'Sotuvchi ariza beradi, operator ko‘rib chiqadi va tasdiqlaydi.',
        status: 'done',
        evidence: 'Seller modeli + admin approve/reject',
      },
      {
        title: 'Komissiya va to‘lovlar',
        does: 'Sotuvchining ulushi hisoblanadi va unga o‘tkaziladi.',
        status: 'wip',
        evidence: 'SellerPayout modeli bor, avtomatik hisob-kitob to‘liq emas',
        tasks: [{ title: 'To‘lov davri va avtomatik hisob', role: 'backend', priority: 'orta' }],
      },
    ],
  },
  {
    id: 'delivery',
    name: 'Yetkazish va logistika',
    layer: 'Domen',
    purpose: 'Mahsulotni mijozga yetkazish va uni kuzatish.',
    owner: 'operator',
    features: [
      {
        title: 'Yetkazish usullari',
        does: 'Uyga yetkazish, topshirish punkti va ekspress — checkout‘da tanlanadi.',
        status: 'done',
        evidence: 'PickupPoint, Delivery, DeliveryEvent modellari',
      },
      {
        title: 'Real vaqtda kuzatuv',
        does: 'Mijoz buyurtmasi qayerdaligini xaritada ko‘radi.',
        status: 'planned',
        tasks: [{ title: 'Kuryer joylashuvi va kuzatuv', role: 'mobil', priority: 'orta' }],
      },
      {
        title: 'Yetkazish va’dasi',
        does: 'Mahsulot kartasida "ertaga yetkaziladi" deb aniq sana ko‘rsatiladi.',
        status: 'planned',
        evidence: 'Dizayn maketida bor, hisoblash mantiqi yo‘q',
        tasks: [{ title: 'Yetkazish muddatini hisoblash', role: 'backend', priority: 'orta' }],
      },
    ],
  },
  {
    id: 'pricing',
    name: 'Narx, aksiya va sodiqlik',
    layer: 'Domen',
    purpose: 'Chegirmalar, promo kodlar va Sello Coins — takroriy xaridni rag‘batlantirish.',
    owner: 'backend',
    features: [
      {
        title: 'Promo kodlar',
        does: 'Mijoz kod kiritadi, chegirma hisoblanadi va shartlar tekshiriladi.',
        status: 'done',
        evidence: 'PromoCode, UserCoupon + /api/promo/validate',
      },
      {
        title: 'Sello Coins',
        does: 'Xarid uchun ball beriladi va keyingi buyurtmada ishlatiladi.',
        status: 'done',
        evidence: 'LoyaltyTransaction + @ecom/core-domain/loyalty (testlar bilan)',
      },
      {
        title: 'Bo‘lib-bo‘lib to‘lash',
        does: 'Mahsulot kartasida oylik to‘lov ko‘rsatiladi — O‘zbekiston bozorida asosiy sotuv argumenti.',
        status: 'planned',
        evidence: 'Kartada zaxira joy tayyorlangan (dizayn maketi)',
        tasks: [
          {
            title: 'Rassrochka provayderi bilan integratsiya',
            role: 'asoschi',
            priority: 'yuqori',
            why: 'Uzum har kartada ko‘rsatadi — bizda umuman yo‘q',
          },
        ],
      },
    ],
  },
  {
    id: 'global',
    name: 'Sellobay Global',
    layer: 'Domen',
    purpose:
      'Xitoydan to‘g‘ridan-to‘g‘ri sourcing — mahalliy bozorda yo‘q mahsulotni buyurtma qilish.',
    owner: 'operator',
    features: [
      {
        title: 'Sourcing so‘rovi',
        does: 'Mijoz kerakli mahsulotni tasvirlaydi, operator taklif tayyorlaydi.',
        status: 'done',
        evidence: 'SourcingRequest + /api/global/sourcing/*',
      },
      {
        title: 'Narx dvigateli',
        does: 'Xitoy narxi, kargo tarifi va og‘irlik bo‘yicha yakuniy narx hisoblanadi.',
        status: 'done',
        evidence: '@ecom/core-domain/global-pricing — testlar bilan qoplangan',
      },
      {
        title: 'Fulfillment',
        does: 'Xitoydan sotib olish, kargo, bojxona va mijozga yetkazish bosqichlari kuzatiladi.',
        status: 'done',
        evidence: 'GlobalFulfillment + admin paneli',
      },
    ],
  },
  {
    id: 'trust',
    name: 'Sharh va ishonch',
    layer: 'Domen',
    purpose: 'Xaridor boshqa xaridorlarga ishonadi — marketplace‘da konversiyaning asosiy omili.',
    owner: 'backend',
    features: [
      {
        title: 'Sharh modeli',
        does: 'Mijoz mahsulotga baho va izoh qoldiradi.',
        status: 'wip',
        evidence: 'Review, ProductQuestion modellari bor — lekin bazada 0 ta sharh',
        tasks: [
          {
            title: 'Sharh qoldirish oqimini ishga tushirish',
            role: 'backend',
            priority: 'yuqori',
            why: 'Kartalardagi reyting hozir seed qiymati — haqiqiy emas',
          },
        ],
      },
      {
        title: 'Sharh moderatsiyasi',
        does: 'Nomaqbul sharhlar operator tomonidan tekshiriladi.',
        status: 'planned',
        tasks: [{ title: 'Moderatsiya navbati', role: 'operator', priority: 'orta' }],
      },
    ],
  },
  {
    id: 'notify',
    name: 'Bildirishnomalar',
    layer: 'Domen',
    purpose: 'Mijoz va sotuvchini buyurtma holati haqida xabardor qilish.',
    owner: 'backend',
    features: [
      {
        title: 'Bildirishnoma modeli',
        does: 'Yuborilgan xabarlar yozib boriladi, push tokenlar saqlanadi.',
        status: 'done',
        evidence: 'Notification, PushToken modellari',
      },
      {
        title: 'SMS va email provayderi',
        does: 'Buyurtma tasdiqlangani haqida mijozga SMS yoki email keladi.',
        status: 'gap',
        evidence: 'Provayder ulanmagan',
        tasks: [
          { title: 'SMS provayderi bilan integratsiya', role: 'backend', priority: 'yuqori' },
        ],
      },
      {
        title: 'Qayta urinish',
        does: 'Xabar yuborilmasa avtomatik qayta uriniladi.',
        status: 'gap',
        evidence: 'Navbat tizimi yo‘qligi sababli imkonsiz',
      },
    ],
  },

  // ══════════════════ MA'LUMOT ══════════════════
  {
    id: 'db',
    name: 'Baza va migratsiyalar',
    layer: "Ma'lumot",
    purpose:
      'Barcha ma‘lumot shu yerda. Sxema o‘zgarishi xavfsiz va takrorlanadigan bo‘lishi kerak.',
    owner: 'devops',
    features: [
      {
        title: 'Ma‘lumot modeli',
        does: '54 ta model — mahsulotdan nizogacha butun marketplace qamrab olingan.',
        status: 'done',
        evidence: 'packages/database/prisma/schema.prisma',
      },
      {
        title: 'Pul va vaqt to‘g‘ri saqlanadi',
        does: 'Pul Decimal ustunda (float emas), vaqt UTC‘da.',
        status: 'done',
        evidence: 'Decimal(14,2) narx ustunlarida',
      },
      {
        title: 'Sxema migratsiyalari',
        does: 'Har bir sxema o‘zgarishi versiyalanadi — orqaga qaytarish va takrorlash mumkin.',
        status: 'wip',
        evidence:
          'ADR 0006 — 0_init baseline qo‘llandi (54 jadval, 99 indeks), migrate status: up to date. Production‘ga qo‘llash hozircha qo‘lda',
        tasks: [
          {
            title: 'DATABASE_URL ni GitLab CI o‘zgaruvchilariga qo‘shish',
            role: 'devops',
            priority: 'yuqori',
            why: 'migrate-deploy job usiz ishlamaydi — Settings > CI/CD > Variables, masked va protected',
          },
          {
            title: 'Alohida test bazasi va staging muhiti',
            role: 'devops',
            priority: 'yuqori',
            why: 'Hozir migratsiya production‘da birinchi marta sinaladi — staging bo‘lsa avtomatlashtirish ham mumkin bo‘ladi',
          },
        ],
      },
    ],
  },
  {
    id: 'storage',
    name: 'Fayl saqlash',
    layer: "Ma'lumot",
    purpose: 'Rasm, chek va hujjatlarni saqlash. Marketplace‘da bu ixtiyoriy emas.',
    owner: 'backend',
    features: [
      {
        title: 'Object storage',
        does: 'Fayllar Vercel Blob‘da saqlanadi va CDN orqali tarqatiladi.',
        status: 'done',
        evidence: 'packages/storage (@ecom/storage) — ADR 0007; MR !14',
      },
      {
        title: 'Yuklangan faylni tekshirish',
        does: 'Fayl turi baytlar bo‘yicha aniqlanadi; SVG va HTML qabul qilinmaydi.',
        status: 'done',
        evidence: 'packages/storage/src/image.ts — 9 ta test; Content-Type header‘iga ishonilmaydi',
      },
      {
        title: 'Eski fayllarni tozalash',
        does: 'Mahsulotdan olib tashlangan rasm do‘kondan ham o‘chiriladi.',
        status: 'gap',
        evidence: 'Hozircha o‘chirish yo‘q — ishlatilmaydigan fayl do‘konda qoladi',
        tasks: [
          {
            title: 'Yetim fayllarni o‘chirish vazifasi',
            role: 'backend',
            priority: 'orta',
            why: 'Kvota asta-sekin to‘ladi; katta muammo emas, lekin qarz bo‘lib qoladi',
          },
        ],
      },
    ],
  },
  {
    id: 'infra-data',
    name: 'Kesh va navbat',
    layer: "Ma'lumot",
    purpose:
      'Tezlik va ishonchlilik: og‘ir ishni fon rejimiga chiqarish, takroriy so‘rovni keshdan berish.',
    owner: 'devops',
    features: [
      {
        title: 'Sahifa keshi',
        does: 'Tez-tez so‘raladigan ma‘lumot qayta hisoblanmaydi.',
        status: 'wip',
        evidence: 'Next unstable_cache va ISR — taqsimlangan kesh yo‘q',
      },
      {
        title: 'Navbat va fon vazifalari',
        does: 'Og‘ir ish so‘rovni bloklamaydi, xato bo‘lgan vazifa qayta uriniladi.',
        status: 'gap',
        evidence: 'BullMQ faqat graveyard/api da; tirik stekda hamma narsa sinxron',
        tasks: [
          {
            title: 'Navbat tizimini joriy etish',
            role: 'devops',
            priority: 'yuqori',
            why: 'Sekin to‘lov chaqiruvi mijoz so‘rovini bloklaydi; muvaffaqiyatsiz webhook qayta urinilmaydi',
          },
        ],
      },
    ],
  },

  // ══════════════════ KESISHUVCHI ══════════════════
  {
    id: 'observability',
    name: 'Kuzatuv va xatolar',
    layer: 'Kesishuvchi',
    purpose:
      'Production‘da nima bo‘layotganini bilish. Bu yo‘q bo‘lsa, boshqa hamma narsa ko‘r-ko‘rona.',
    owner: 'devops',
    features: [
      {
        title: 'Xato kuzatuvi',
        does: 'Production‘da xato yuz bersa, jamoa darhol xabar oladi.',
        status: 'wip',
        evidence:
          '@sentry/nextjs apps/web ga ulandi (instrumentation + global-error). DSN qo‘yilmagunicha passiv — tarmoqqa so‘rov ketmaydi',
        tasks: [
          {
            title: 'Sentry ogohlantirishlarini sozlash',
            role: 'devops',
            priority: 'orta',
            why: 'DSN ulangan va xatolar kelyapti; endi qaysi xato kimga xabar qilishini belgilash kerak',
          },
          {
            title: 'admin va seller ilovalariga ham ulash',
            role: 'devops',
            priority: 'orta',
            why: 'Hozir faqat web qoplangan',
          },
        ],
      },
      {
        title: 'Audit izi',
        does: 'Admin amallari kim va qachon bajargani yozib boriladi.',
        status: 'done',
        evidence: 'AuditLog modeli',
      },
      {
        title: 'Biznes analitikasi',
        does: 'Konversiya, savat tashlash, sotuvchi ko‘rsatkichlari o‘lchanadi.',
        status: 'planned',
        tasks: [{ title: 'Analitika quvurini qurish', role: 'backend', priority: 'past' }],
      },
    ],
  },
  {
    id: 'architecture',
    name: 'Arxitektura intizomi',
    layer: 'Kesishuvchi',
    purpose: 'Kodning uzoq muddatda boshqarilishi — qatlamlar aralashib ketmasligi.',
    owner: 'backend',
    features: [
      {
        title: 'Qatlam chegaralari',
        does: 'Sof biznes mantiqi freymvorkdan mustaqil, ilovalar bir-birini import qilmaydi.',
        status: 'done',
        evidence: 'Tekshirildi: core-domain‘da freymvork importi yo‘q, cross-app import yo‘q',
      },
      {
        title: 'Tip intizomi',
        does: 'Kirish ma‘lumotlari tekshiriladi, tiplar haqiqatni aytadi.',
        status: 'done',
        evidence: 'Butun monorepoda 3 ta any, 1 ta ts-ignore; zod validatsiya',
      },
      {
        title: 'Ulashilgan shartnoma paketi',
        does: 'API shartnomasi bitta joyda — server va mijozlar undan oladi.',
        status: 'gap',
        evidence:
          'packages/types manba kodda hech kim import qilmaydi; ichidagi sxemalar o‘lik NestJS dizaynidan',
        tasks: [
          {
            title: '@ecom/types ni haqiqiy server sxemalaridan qayta qurish',
            role: 'backend',
            priority: 'yuqori',
            why: 'Mobil va web bir xil buyurtma shartnomasini qo‘lda nusxalab yuribdi',
          },
        ],
      },
    ],
  },

  // ══════════════════ YETKAZIB BERISH ══════════════════
  {
    id: 'cicd',
    name: 'CI / CD',
    layer: 'Yetkazib berish',
    purpose: 'Kod ishonchli va qo‘lsiz tarzda production‘ga chiqishi.',
    owner: 'devops',
    features: [
      {
        title: 'Uzluksiz integratsiya',
        does: 'Har MR va main push‘ida lint, typecheck, test va build avtomatik ishlaydi.',
        status: 'done',
        evidence: '.gitlab-ci.yml — hozir yashil',
      },
      {
        title: 'Avtomatik deploy',
        does: 'main‘ga merge bo‘lgach sayt o‘zi yangilanadi, MR uchun preview chiqadi.',
        status: 'done',
        evidence: 'Vercel — 4 proyekt, GitLab‘ga ulangan',
      },
      {
        title: 'Docker image‘lar',
        does: 'Versiya tegi qo‘yilganda konteyner image‘lari quriladi.',
        status: 'done',
        evidence: '.gitlab-ci.yml docker-build-push — qo‘lda yoki tegda',
      },
    ],
  },
  {
    id: 'testing',
    name: 'Testlar',
    layer: 'Yetkazib berish',
    purpose: 'O‘zgarish nimanidir buzganini deploydan OLDIN bilish.',
    owner: 'devops',
    features: [
      {
        title: 'Unit testlar',
        does: 'Sof biznes mantiqi (narx, sodiqlik, og‘irlik) avtomatik tekshiriladi.',
        status: 'wip',
        evidence: '8 ta test fayli — hammasi @ecom/core-domain da',
      },
      {
        title: 'API va integratsiya testlari',
        does: 'Buyurtma, to‘lov va zaxira oqimlari avtomatik tekshiriladi.',
        status: 'gap',
        evidence: '14 ta e2e skript bor, lekin qo‘lda ishga tushiriladi va CI‘da yurmaydi',
        tasks: [{ title: 'E2E skriptlarni CI‘ga ulash', role: 'devops', priority: 'yuqori' }],
      },
      {
        title: 'Brauzer testlari',
        does: 'Checkout kabi kritik oqim haqiqiy brauzerda tekshiriladi.',
        status: 'gap',
        evidence: 'Playwright yoki Cypress yo‘q',
        tasks: [
          {
            title: 'Playwright o‘rnatib checkout oqimini qoplash',
            role: 'devops',
            priority: 'yuqori',
          },
        ],
      },
    ],
  },
];
