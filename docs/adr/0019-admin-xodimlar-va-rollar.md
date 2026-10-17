# ADR 0019 — Admin panel: xodimlar va bo'limlar bo'yicha rollar

- Holat: qabul qilingan
- Sana: 2026-10-18

## Kontekst

Admin panelga faqat `ADMIN` va `SUPER_ADMIN` kira olardi. Bu tekshiruv 55 ta API route'da
qo'lda yozilgan `['ADMIN','SUPER_ADMIN']` edi (6 xil usulda). `UserRole` enum'ida
`SUPPORT_AGENT`, `FINANCE_MANAGER`, `MARKETING_MANAGER`, `WAREHOUSE_STAFF` bor edi, lekin
ishlatilmasdi. Xodim qo'shadigan, rol beradigan yoki bloklaydigan API ham yo'q edi.

Natijada har bir xodimga to'liq admin huquqi berish yoki uni panelga umuman kiritmaslikdan
boshqa yo'l qolmasdi. Masalan omborchi sotuvchilarga to'lovni ham bosa olardi.

## Qaror

1. **Bo'limlar bo'yicha rollar** (foydalanuvchi tanlovi). Mavjud enum qiymatlari ishlatiladi,
   yangi rol qo'shilmaydi:

   | Rol                 | Kim                  | Nimani ochadi                                                         |
   | ------------------- | -------------------- | --------------------------------------------------------------------- |
   | `SUPER_ADMIN`       | Bosh admin           | Hammasi + xodimlarni boshqarish                                       |
   | `ADMIN`             | Admin                | Hammasi, xodimlarni boshqarishdan tashqari                            |
   | `SUPPORT_AGENT`     | Operator             | Buyurtmalar, mijozlar, qaytarishlar                                   |
   | `FINANCE_MANAGER`   | Moliya               | Karta to'lovlari, pul qaytarish, sotuvchilarga to'lov, bank           |
   | `MARKETING_MANAGER` | Kontent va marketing | Mahsulot, kategoriya, brend, promo, guruh xaridi, global import       |
   | `WAREHOUSE_STAFF`   | Ombor                | Qabul, inventar, yorliqlar, qaytgan posilkani qabul, global yetkazish |

   Bir xodimga bir nechta rol berish mumkin, bunda ruxsatlar qo'shiladi.

2. **Ruxsatlar bitta joyda.** `apps/admin/src/lib/permissions.ts` sof modul (Prisma/Next
   importi yo'q). Unda ruxsatlar ro'yxati (`orders.manage`, `payouts.manage` va hokazo), rol ->
   ruxsat xaritasi va sahifa -> ruxsat xaritasi turadi. Eng uzun mos prefiks g'olib bo'ladi:
   `/orders/payment-review` uchun `payments.review` olinadi.
   - Har bir API route `requirePermission('...')` chaqiradi (`lib/api-guard.ts`).
   - Middleware sahifani ochishdan oldin xuddi shu xaritani tekshiradi va ruxsat bo'lmasa
     xodimni o'z bosh sahifasiga `?denied=` bilan qaytaradi. Shell sababini toast bilan aytadi.
   - Sidebar ham shu xarita bilan filtrlanadi. Test menyudagi har bir sahifa xaritada borligini
     tekshiradi, shuning uchun yangi sahifa ruxsatsiz qolib ketmaydi.

3. **Rollar bazadan o'qiladi, tokendan emas.** `getCurrentUser()` rollarni har so'rovda bazadan
   oladi. Xodimdan rol olinsa yoki u bloklansa, API'lar darhol yopiladi va access token tugashini
   (15 daqiqa) kutish shart emas. Middleware esa token rollariga tayanadi. U faqat sahifa
   qobig'i uchun ikkinchi qatlam, ma'lumot baribir API orqali keladi.

4. **Yangi xodim vaqtinchalik parol oladi** (foydalanuvchi tanlovi).
   - Bosh admin `/staff` sahifasida ism, email va rollarni kiritadi. Server 12 belgili parol
     yaratadi (adashtiriladigan `O/0/l/1` belgilarsiz) va uni javobda **bir marta** qaytaradi.
     Bazada faqat argon2 xeshi saqlanadi.
   - `User.mustChangePassword = true` bo'ladi (migratsiya `20261017185246_staff_must_change_password`).
     Bu belgi turganda har bir panel API'si `403 PASSWORD_CHANGE_REQUIRED` qaytaradi, Shell esa
     xodimni `/account` sahifasiga yo'naltiradi. Belgi `POST /api/auth/password` da olinadi.
   - «Parolni tiklash» yangi vaqtinchalik parol beradi, belgini qayta qo'yadi va barcha refresh
     tokenlarni bekor qiladi.

5. **Himoyalar.**
   - Xodimlarni faqat `staff.manage` (bosh admin) boshqaradi. `SUPER_ADMIN` rolini faqat bosh
     admin bera oladi.
   - O'zini bloklash, o'z rolini yoki parolini shu sahifadan o'zgartirish mumkin emas.
   - Oxirgi faol bosh adminni bloklab yoki rolini olib bo'lmaydi.
   - Bloklanganda xodimning barcha sessiyalari yopiladi.
   - Har bir amal `AuditLog` ga yoziladi: `staff.create`, `staff.roles`, `staff.block`,
     `staff.unblock`, `staff.password_reset`.

6. **Shaxsiy sahifa `/account`** (profil va parol) har bir xodim uchun ochiq. `/settings` esa
   endi faqat tizim sozlamalari (`settings.manage`). Eski «Foydalanuvchilar» va «Rollar»
   tab'lari `/staff` ga ko'chdi.

## Oqibatlar

- Yangi bo'lim yoki rol qo'shish faqat `permissions.ts` ni o'zgartiradi, route'larga tegilmaydi.
- `getCurrentUser()` bitta so'rovda rollarni ham o'qiydi (join). Bu qo'shimcha so'rov emas.
- Rol o'zgarsa, sidebar keyingi access token yangilanishigacha (15 daqiqagacha) eski menyuni
  ko'rsatishi mumkin. Lekin bosilgan bo'lim API'si darhol 403 qaytaradi.
- Prod'da birinchi bosh admin `pnpm --filter @ecom/database admin:yaratish` bilan yaratiladi
  (!80). Qolgan xodimlarni u `/staff` dan qo'shadi.
- Dashboard (`dashboard.view`) hozircha hamma xodimga ochiq va umumiy savdo ko'rsatkichlarini
  ko'rsatadi. Agar bu ma'lumot ham bo'limga qarab cheklanishi kerak bo'lsa, keyin alohida ruxsat
  bilan ajratiladi.
