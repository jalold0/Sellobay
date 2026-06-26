# Sellobay Global — Chegaralararo (Cross-Border) Integratsiya Rejasi

> **Status:** Reja (Draft v1) · **Yaratildi:** 2026-06-19 · **Egasi:** Mahsulot bo'limi
> **Maqsad:** Xorijiy yirik marketplace'lar bilan integratsiya qilib, ularning mahsulotlarini
> **o'zbek tilida**, mahalliy narx/yetkazib berish/to'lov bilan O'zbekiston mijozlariga taqdim etish.

Bu fayl loyiha ichida saqlanadi (`docs/SELLOBAY_GLOBAL.md`) — har qanday kompyuter yoki
dasturda reja bo'yicha ishlashni davom ettirish mumkin. O'zgarishlarni shu faylga kiriting.

---

## 1. Vision (Maqsad)

Sellobay'ni mahalliy marketplace'dan **O'zbekiston uchun yagona global xarid darvozasi**ga
aylantirish. Mijoz Xitoy, Turkiya, Koreya va boshqa davlatlardagi millionlab mahsulotlarni —
**o'zbekcha interfeys, o'zbekcha tavsif, so'mda narx, mahalliy to'lov va yetkazib berish** bilan —
bitta ilovadan sotib oladi.

**Bir jumlada:** "AliExpress + Trendyol + Coupang — lekin o'zbekcha va Sellobay tajribasi bilan."

**Nega Sellobay yutadi:**

- Tayyor mahalliy infratuzilma: to'lov (Click/Payme/Uzcard/Humo), Sello Coins, logistika, til (uz/ru/en).
- AI tarjima pipeline'i (mavjud i18n + Claude API) — xorijiy katalogni avtomatik o'zbekchaga o'giradi.
- Mahalliy ishonch: o'zbek tilidagi qo'llab-quvvatlash, kafolat, qaytarish.

---

## 2. Biznes modellari (qaysi birini tanlash bozorga bog'liq)

| Model                      | Ta'rif                                                                               | Plyus                             | Minus                                          |
| -------------------------- | ------------------------------------------------------------------------------------ | --------------------------------- | ---------------------------------------------- |
| **Dropshipping**           | Mijoz buyurtma beradi → biz xorijiy platformadan sotib olamiz → yetkazamiz           | Ombor kerak emas, cheksiz katalog | Uzoq yetkazish, sifat nazorati past            |
| **Agregator/Affiliate**    | Xorijiy mahsulotni ko'rsatamiz, buyurtma ularniki, biz komissiya olamiz              | Eng tez ishga tushadi, kam risk   | Marja past, mijoz tajribasi nazoratdan chiqadi |
| **Konsolidatsiya (Buyer)** | Mijozlar buyurtmalarini yig'ib, ulgurji import qilamiz, mahalliy ombordan tarqatamiz | Tez yetkazish, narx past          | Boshlang'ich kapital, ombor, bojxona           |
| **Rasmiy hamkorlik (API)** | Platforma bilan rasmiy shartnoma + API integratsiya                                  | Barqaror, legal toza              | Shartnoma murakkab, vaqt oladi                 |

**Tavsiya:** Faza 1 (Xitoy) — **Dropshipping + Konsolidatsiya gibrid**. Mashhur mahsulotlarni
oldindan import qilib mahalliy ombordan (tez yetkazish), nodir mahsulotlarni dropshipping
(uzoqroq, lekin cheksiz katalog) bilan.

---

## 3. Fazalar bo'yicha reja (Roadmap)

### 🟢 Faza 0 — Tayyorgarlik (MVP launch'dan keyin, ~1-2 oy)

- Bozor tadqiqoti: eng ko'p qidirilayotgan kategoriyalar (kiyim, elektronika, kosmetika).
- Huquqiy konsultatsiya: import, bojxona, QQS, sertifikatsiya.
- 1-2 pilot yetkazib beruvchi/kargo hamkor topish (Xitoy yo'nalishi).
- Texnik PoC: bitta xorijiy manbadan 100 mahsulotni import + o'zbekcha tarjima pipeline.

### 🔴 Faza 1 — XITOY (birinchi navbat, ~3-4 oy)

**Maqsadli platformalar:** 1688.com (ulgurji), Taobao/Tmall (chakana), AliExpress (tayyor API),
Pinduoduo. **Boshlash:** AliExpress (ochiq API/affiliate bor — eng tez) → keyin 1688 (ulgurji marja).

- Katalog integratsiyasi: tanlangan kategoriyalar bo'yicha mahsulot import.
- **Avtomatik o'zbekcha tarjima** (nom, tavsif, atribut) — AI pipeline.
- Narx formulasi: `(manba_narx × kurs) + bojxona + logistika + marja` → so'mda ko'rsatish.
- Kargo hamkor (Xitoy → Toshkent), yetkazish muddati ko'rsatish ("15-25 kun").
- Pilot: 1 000 mahsulot, 1 kategoriya (masalan elektronika aksessuarlari).

### 🟡 Faza 2 — TURKIYA & KOREYA (holatga qarab, ~6-9 oy)

- **Turkiya:** Trendyol, Hepsiburada — kiyim/tekstil/kosmetika (O'zbekistonda mashhur).
- **Koreya:** Coupang, Gmarket, Olive Young (K-beauty, elektronika).
- Faza 1 arxitekturasini qayta ishlatish (manba adapteri qo'shish).
- Har bozor uchun: kurs, kargo yo'nalishi, yetkazish muddati, soliq.

### 🔵 Faza 3 — KENGAYTIRISH (~9-18 oy)

- Boshqa davlatlar: AQSh (Amazon), Yevropa, Yaponiya, Rossiya (Wildberries/Ozon).
- B2B ulgurji yo'nalish (do'konlar uchun import).
- Mahalliy sotuvchilarga "global'dan keltirib sotish" vositasi.

---

## 4. Texnik arxitektura

### 4.1 Yangi komponentlar (mavjud monorepo ustiga)

```
apps/
  integration-worker/        # YANGI: xorijiy manba sync + tarjima ishlovchisi (NestJS + BullMQ)
packages/
  sourcing/                  # YANGI: manba adapterlari (har platforma uchun bitta)
    adapters/
      aliexpress.ts          # API client + product mapping
      1688.ts
      trendyol.ts
      coupang.ts
    types.ts                 # umumiy SourceProduct shape
```

### 4.2 Manba adapter pattern (mavjud `lib/catalog.ts` adapter pattern'iga o'xshash)

Har bir platforma uchun bitta adapter `SourceProduct` umumiy shape'iga moslaydi:

```ts
interface SourceProduct {
  sourcePlatform: 'ALIEXPRESS' | '1688' | 'TRENDYOL' | 'COUPANG' | ...;
  sourceId: string;            // platformadagi original ID
  sourceUrl: string;
  title: { original: string; uz?: string; ru?: string };   // AI tarjima to'ldiradi
  description: { original: string; uz?: string };
  images: string[];
  sourcePrice: { amount: number; currency: 'CNY' | 'TRY' | 'KRW' | 'USD' };
  attributes: Record<string, string>;
  shippingDays: number;
}
```

### 4.3 Tarjima pipeline (AI — mavjud i18n + Claude API)

1. Xorijiy mahsulot import qilinadi (original til).
2. `integration-worker` BullMQ orqali tarjima navbatiga qo'yadi.
3. Claude API (vision + text) — nom/tavsif/atributni **o'zbekcha**ga o'giradi (RU ham).
4. Sifat: domain lug'at (kiyim/elektronika atamalari) bilan prompt boyitiladi.
5. Natija `Product.name/description` JSON ({uz, ru, en}) ga yoziladi — mavjud `pickLocalized` ishlaydi.

### 4.4 Narxlash (Pricing engine)

```
ko'rsatiladigan_narx (UZS) = ROUND(
   manba_narx × valyuta_kursi
   + bojxona_boji(kategoriya)
   + xalqaro_logistika(og'irlik, yo'nalish)
   + sellobay_marjasi(%)
)
```

- Valyuta kursi: kunlik yangilanadi (CBU yoki provayder API).
- Decimal pul qoidasi saqlanadi ([[domain-rules]]).
- Sello Coins cashback global mahsulotlarga ham qo'llanadi.

### 4.5 Prisma schema o'zgarishlari (kelajak migratsiya)

`Product` modeliga (yoki yangi `SourcedProduct`):

```prisma
model Product {
  // ... mavjud maydonlar
  sourcePlatform   String?   // ALIEXPRESS | 1688 | TRENDYOL ...
  sourceId         String?
  sourceUrl        String?
  sourceCurrency   String?
  sourcePrice      Decimal?  @db.Decimal(14, 2)
  isCrossBorder    Boolean   @default(false)
  estShippingDays  Int?
  translationStatus String?  // PENDING | DONE | FAILED

  @@index([sourcePlatform, sourceId])
  @@index([isCrossBorder])
}
```

---

## 5. Lokalizatsiya (o'zbekcha taqdim etish — asosiy farq)

- **Interfeys:** mavjud uz/ru/en i18n tizimi (tayyor).
- **Mahsulot kontenti:** AI avtomatik tarjima (yuqorida 4.3).
- **Valyuta/sana/telefon:** mavjud determinstik formatter (Asia/Tashkent, +998, so'm).
- **Qidiruv:** o'zbekcha so'rovni manba tiliga o'girib qidirish (AI yoki lug'at).
- **Qo'llab-quvvatlash:** o'zbek tilidagi chat/FAQ — global buyurtmalar uchun maxsus bo'lim.

---

## 6. Operatsion / Huquqiy

- **Bojxona:** kategoriya bo'yicha boj stavkalari, hujjatlar, deklaratsiya avtomatlashtirish.
- **Soliq:** QQS, import soliqlari — buxgalteriya bilan kelishish.
- **Logistika:** kargo hamkorlar (Xitoy/Turkiya/Koreya → Toshkent), tracking integratsiyasi.
- **Qaytarish:** global mahsulotlar uchun alohida qaytarish siyosati (muddat, kim to'laydi).
- **Sertifikatsiya:** ba'zi tovarlar (elektronika, kosmetika) uchun mahalliy sertifikat.

---

## 7. Xavflar va yumshatish

| Xavf                             | Ta'sir              | Yumshatish                                                     |
| -------------------------------- | ------------------- | -------------------------------------------------------------- |
| Platforma API'si yo'q/cheklangan | Integratsiya qiyin  | Affiliate/scraping/rasmiy shartnoma alternativlari             |
| Uzoq yetkazish (15-30 kun)       | Mijoz noroziligi    | Aniq muddat ko'rsatish + mashhur mahsulotlarni oldindan import |
| Valyuta tebranishi               | Marja yo'qoladi     | Kunlik kurs + marja bufferi                                    |
| Bojxona/huquqiy to'siq           | Bloklash            | Huquqiy konsultatsiya, bosqichma-bosqich                       |
| Tarjima sifati past              | Ishonch yo'qoladi   | AI + domain lug'at + qo'lda tekshirish (top mahsulotlar)       |
| Sifat nazorati (dropship)        | Qaytarish ko'payadi | Reyting filtri, ishonchli yetkazib beruvchilar                 |

---

## 8. KPI (muvaffaqiyat o'lchovlari)

- Import qilingan mahsulotlar soni (faza bo'yicha)
- Tarjima sifati (qo'lda audit %, mijoz shikoyati)
- Global buyurtma konversiyasi
- O'rtacha yetkazish muddati
- Qaytarish darajasi (global vs mahalliy)
- Global GMV ulushi

---

## 9. Mavjud Sellobay aktivlaridan foydalanish (qayta ishlatish)

- ✅ **i18n (uz/ru/en)** — interfeys tayyor, mahsulot tarjimasiga kengaytiriladi.
- ✅ **Adapter pattern** (`lib/catalog.ts`) — manba adapterlari uchun namuna.
- ✅ **Sello Coins** — global xaridlarga cashback (sodiqlikni oshiradi). [[project_sello_coins]]
- ✅ **To'lov tizimi** — Click/Payme/Uzcard/Humo global buyurtmalarga ishlaydi.
- ✅ **BullMQ** (NestJS'da bor) — sync/tarjima navbatlari uchun.
- ✅ **Prisma + Neon** — `Product` modelini kengaytirish.
- ✅ **Claude API** — tarjima + AI Stylist (rasm orqali xorijiy mahsulot topish).

---

## 10. Keyingi konkret qadamlar (boshlanganda)

1. [ ] Bozor + huquqiy tadqiqot (Xitoy yo'nalishi)
2. [ ] AliExpress affiliate/API hisobini ochish (eng tez start)
3. [ ] `packages/sourcing` + bitta adapter (aliexpress) PoC
4. [ ] Tarjima pipeline PoC (100 mahsulot, Claude API)
5. [ ] Narxlash formulasi + valyuta kursi servisi
6. [ ] Kargo hamkor bilan muzokara
7. [ ] Pilot: 1 kategoriya, 1 000 mahsulot, cheklangan auditoriya bilan test

---

> **Eslatma:** Bu strategik reja — MVP launch (2026-07-13) dan KEYIN boshlanadi.
> MVP'ni chalg'itmaslik uchun Faza 0 launch'dan keyin ochiladi. Reja yangilanib boriladi.
