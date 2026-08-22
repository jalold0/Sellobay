# Sellobay Global — Xitoydan sourcing (to'liq zanjir)

Mijoz o'zbekcha katalogdan Xitoy tovarini buyurtma qiladi → to'laydi → operatorga zayavka
tushadi → operator jonli narxni tekshiradi → platformadan sotib oladi → trek raqamni kargo
saytiga kiritadi → kargo to'g'ridan-to'g'ri mijozga yetkazadi. Mijoz har bosqichni kuzatadi.

## Nima kiradi

**Domen (`@ecom/core-domain`) — 104 unit test**

- `global-pricing.ts` — narx dvigateli: CNY→USD → tovar + Xitoy ichki dostavka + xalqaro yuk
  (aniq/hajmiy og'irlikdan kattasi) + agent + boj → so'm (kurs zaxirasi) → marja → ekvayring
  **gross-up** (`x/(1-fee)`, ustiga qo'shilmaydi) → yuqoriga yaxlitlash.
- `global-weight.ts` — og'irlik bahosi: kategoriya jadvali, manba ustuvorligi
  (o'lchangan > qo'lda > kategoriya), narx kafolati koridori.
- `global-variance.ts` — narx chetlanishi qarori: ≤5% o'zimiz yutamiz, o'rtasida mijozdan
  so'raymiz, >30% bekor tavsiya etiladi.
- `global-settings.ts` — standart + bazadagi farqlarni birlashtirish; **buzuq qiymat standartga
  qaytadi** (narx nolga tushmaydi).
- `sourcing-link.ts` — Taobao/Tmall/1688/Weidian havolasi parseri (kanonik havola, qisqa
  havola, soxta domen himoyasi).

**Baza** — migratsiyalar jonli Neon bazasiga ALLAQACHON qo'llangan (`prisma migrate diff` →
audit → `prisma db execute`; SQL `packages/database/prisma/applied-sql/` da). Yangi jadvallar:
`SourcingRequest`, `GlobalSource` (Product bilan 1-1), `GlobalFulfillment` (Order bilan 1-1),
`GlobalSetting`. **Deploy paytida migratsiya kerak emas, drift yo'q.**

**Mijoz tarafi (`apps/web`)**

- `/[locale]/global` — Global katalog (o'zbekcha, narx to'liq) + havola orqali buyurtma formasi.
- Buyurtma kuzatuvi: 5 bosqich, yuk turi, muddat, trek raqam, narx oshgani ogohlantirishi.
- Savat lokal/global guruhlarga bo'linadi, har biri alohida checkout (`?scope=`).

**Operator tarafi (`apps/admin`)**

- `/products/global` — import formasi + jonli narx paneli (tannarx tarkibi ochiq) + ro'yxat.
- `/orders/global` — zayavka navbati: narx tekshiruvi → sotib olindi → trek raqam → yetkazildi.
- `/settings/global` — kargo tariflari, kurs, marja, chetlanish chegaralari.

## Muhim arxitektura qarorlari

1. **Alohida `GlobalProduct` YARATILMADI** — mavjud `Product` ishlatiladi, Xitoyga oid ma'lumot
   yonidagi `GlobalSource` yozuvida. Shu sabab katalog, savat, checkout, wishlist va qidiruv
   global tovar bilan ham o'zgarishsiz ishlaydi.
2. **Har bir ro'yxat so'rovi qamrovni belgilaydi** (`CatalogScope`, standart `LOCAL`) — global
   tovar lokal katalogga tasodifan chiqmaydi.
3. **Lokal va global bitta buyurtmada aralashmaydi** (`MIXED_CART`) — turli muddat, turli
   yetkazish. UI savatni guruhlab bu holatni yuzaga keltirmaydi.
4. **Global buyurtmada lokal yetkazish narxi yo'q** — kargo o'zi yetkazadi, bu narx ichida
   (UI ham, server ham 0).
5. **Operator ma'lumoti mijozga chiqmaydi** — platformadagi zakaz raqami, tekshirilgan ¥ narx,
   biz yutgan farq, operator izohi. E2E'da alohida tekshiriladi.
6. **Tarif/kurs kodda emas, bazada** — o'zgarganda deploy kerak emas.

## Tekshiruvlar

| Nima                                 | Natija      |
| ------------------------------------ | ----------- |
| `core-domain` unit                   | 104/104     |
| Havola orqali buyurtma (e2e)         | 17/17       |
| Katalog import (e2e)                 | 24/24       |
| Zayavka → yetkazish (e2e)            | 24/24       |
| Mijoz kuzatuvi (e2e)                 | 22/22       |
| Sozlamalar + xabarlar (e2e)          | 20/20       |
| Lokal/global ajratish (e2e)          | 20/20       |
| `web` typecheck / production build   | 0 xato / ✅ |
| `admin` typecheck / production build | 0 xato / ✅ |

E2E skriptlari: `scripts/global-*.ts` (web 3000 + admin 3001 turgan holda
`npx tsx scripts/<nom>.ts`).

## Yangi environment variable

**Yo'q.** Sozlamalar bazada (`GlobalSetting`), tashqi provayder ulanmagan.

## Preview'da tekshirish ro'yxati

- [ ] `/uz/global` ochiladi, "Katalog to'ldirilmoqda" ko'rinadi (hali global tovar yo'q)
- [ ] `/uz/catalog` — odatdagi lokal tovarlar, o'zgarish yo'q
- [ ] `/uz/cart` va `/uz/checkout` — lokal buyurtma odatdagicha ishlaydi
- [ ] Admin → Katalog → Global import: havola qo'yilganda platforma/ID aniqlanadi, narx chiqadi
- [ ] Admin → Tizim → Global sozlamalar: qiymatlar ko'rinadi va saqlanadi
- [ ] Admin → Savdo → Global zayavkalar: bo'sh navbat ko'rinadi

## Deploydan keyingi qadamlar (kod emas)

1. Kargo bilan tariflarni tasdiqlash va `/settings/global`ga kiritish: AVIA seriya narxi
   ($9.9 vs $11.9), hajmiy og'irlik bo'luvchisi, seriya minimal soni.
2. Birinchi 10-20 tovarni import qilish (narxi ≥ ~$18/kg bo'lgan toifadan — yuk ulushi past).
3. SMS/push provayder ulangach xabar kanalini `IN_APP`dan almashtirish.
