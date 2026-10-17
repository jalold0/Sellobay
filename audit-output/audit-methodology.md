# Metodika

## Usul

1. **Kod tekshiruvi (o'qish rejimida).** Kod `main` branchida, `a184323` commit'ida tekshirildi (alohida worktree). To'rtta parallel tekshiruvchi agent ishladi:
   - web sahifalari va oqimlari;
   - web xavfsizligi;
   - web accessibility, UX, SEO va tezlik;
   - Flutter mijoz ilovasi.

   Har bir agent topilmalarni fayl va qator raqami bilan qaytardi. P1 topilmalarning hammasini auditor kodda qayta o'qib tasdiqladi.

2. **Avtomatik tekshiruvlar.** Ular ilova fayllarini o'zgartirmaydi.
3. **Prod'da brauzer tekshiruvi.** Faqat ochiq sahifalar ko'rildi, hech narsa yaratilmadi. Cookie bannerida «Faqat zaruriy» tanlandi. Telefon (375×812) va kompyuter (1280×800) kengliklari emulyatsiya qilindi.
4. **Lighthouse o'lchovlari** prod'da o'tkazildi.

## Ishga tushirilgan buyruqlar va natijalar

| Buyruq                                                        | Natija                                                                                       |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm --filter @ecom/web lint`                                | 0 xato, bir nechta ogohlantirish (import tartibi, bitta `any`)                               |
| `pnpm --filter @ecom/web typecheck` (`tsc --noEmit`)          | PASS                                                                                         |
| `pnpm --filter @ecom/web test` (vitest)                       | 11 fayl, **119 test o'tdi**                                                                  |
| `flutter analyze` (apps/flutter/customer)                     | **No issues found**                                                                          |
| `flutter test` (apps/flutter/customer)                        | **224 test o'tdi**                                                                           |
| `pnpm audit --prod` (apps/web)                                | **Ishlamadi**: Node fatal xatosi (X509 / OnFatalError). Bog'liqliklar zaifligi tekshirilmadi |
| `npx lighthouse@12.2.1 <url> --chrome-flags="--headless=new"` | 4 sahifa, natijalar pastda                                                                   |
| `curl` prod (robots.txt, sarlavhalar, HTML)                   | SEO-01, SEC-06, TRU-01, FUN-02 dalillari                                                     |

Monorepo bo'yicha 2026-10-15 kuni (5-bosqich MR'i uchun) yana quyidagilar o'tkazilgan:

- lint va typecheck 40/40;
- core-domain 242 test;
- Flutter: mijoz 224, shared 222, kuryer 57 test.

## Lighthouse sharoiti

- **Versiya va qurilma:** Lighthouse 12.2.1, mobil form-faktor.
- **Tarmoq:** simulyatsiya qilingan; RTT 150 ms, 1,6 Mbit/s yuklash.
- **Protsessor:** CPU 4 baravar sekinlashtirilgan.
- **Brauzer:** headless Chrome, Windows noutbuk.
- **O'lchov:** har sahifa bir marta o'lchandi, shuning uchun natija ±10 ball o'zgarishi mumkin. Bu laboratoriya o'lchovi, haqiqiy foydalanuvchilar ma'lumoti emas.
- **Vaqt:** 2026-10-15, taxminan 10:53 UTC.

| Sahifa                           | Tezlik | Accessibility | Best practices | SEO | FCP   | LCP   | TBT      | CLS  | Hajm    |
| -------------------------------- | ------ | ------------- | -------------- | --- | ----- | ----- | -------- | ---- | ------- |
| `/uz`                            | 37     | 96            | 96             | 100 | 3,5 s | 6,7 s | 1 860 ms | 0    | 776 KiB |
| `/uz/catalog`                    | 48     | 95            | 96             | 100 | 3,4 s | 4,8 s | 970 ms   | 0    | 651 KiB |
| `/uz/product/puma-rs-x-sneakers` | 65     | 90            | 96             | 100 | 1,9 s | 3,2 s | 1 220 ms | 0    | 591 KiB |
| `/uz/checkout` (bo'sh savat)     | 54     | 91            | 96             | 100 | 2,2 s | 5,8 s | 680 ms   | 0,03 | 589 KiB |

## Brauzer o'lchovlari (prod)

| Tekshiruv                                       | Natija                                                                                                                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mahsulot sahifasi, telefon 375 px               | Sahifa kengligi 457 px. Sabab: tablar qatori 441 px (UX-01)                                                                                                                |
| Katalog, savat, kuzatish, login, telefon 375 px | Toshish yo'q                                                                                                                                                               |
| Login, kompyuter 1280 px                        | `scrollWidth` 1273 > `clientWidth` 1265 (UX-02)                                                                                                                            |
| Bosh sahifa, telefon                            | Cookie banneri 210 px balandlikda (UX-03)                                                                                                                                  |
| `/uz/product/nike-air-max-270`                  | 200, demo mahsulot narxi bilan (FUN-02). Keyin aniqlandi: bu bazadagi seed yozuvi, `/api/products` 11 ta ochiq mahsulot qaytaradi, ular orasida demo va test yozuvlari bor |
| Konsol xatolari (bosh sahifa)                   | 1 ta 401 (mehmon uchun `/api/auth/me` so'rovi, kutilgan)                                                                                                                   |

## Skrinshotlar

`audit-output/screenshots/` papkasida. Hammasi prod'dan olingan haqiqiy skrinshotlar.

## Ilova o'zgarmadi

Audit davomida ilova kodi, konfiguratsiya va bog'liqliklarga tegilmadi. Yangi fayllar faqat `audit-output/` papkasida yaratildi. Ilova kodiga tegishli bitta istisno — vaqtinchalik `.next` va build keshlari: ular git'ga kirmaydi, kod emas.
