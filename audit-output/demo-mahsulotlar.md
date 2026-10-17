# Prod katalogidagi demo va test mahsulotlar (audit FUN-02)

Manba: `GET https://www.sellobay.uz/api/products?limit=100` va har bir mahsulotning `/api/products/<slug>` javobi, 2026-10-15.

Ochiq katalogda **jami 11 ta mahsulot** bor va ularning **hammasi «Nike Store» sotuvchisiga** tegishli.

## A. Test yozuvlari — darhol nofaol qilish

Ular mijozga umuman ko'rinmasligi kerak.

| Slug                       | Nomi                  | Narx      | Izoh                                                                            |
| -------------------------- | --------------------- | --------- | ------------------------------------------------------------------------------- |
| `e2e-moderatsiya-f1315062` | E2E Moderatsiya Test  | 250 000   | Avtomatik test (e2e) yaratgan yozuv                                             |
| `variant-test-futbolka`    | Variant Test Futbolka | 180 000   | Variantlarni sinash uchun yaratilgan                                            |
| `nike99`                   | Nike99                | 1 000 000 | Nomi test yozuviga o'xshaydi (eski narx 1 200 000). Sizniki bo'lsa — tekshiring |

## B. Seed'dan qolgan demo mahsulotlar — qaror kerak

Bu tovarlar haqiqatda omborda yo'q. Hammasi «Nike Store» nomidan boshqa brendlarni sotadi, sharhlar soni ham seed'dan kelgan.

| Slug                       | Nomi                     | Narx       | Brend                              | Sharhlar soni |
| -------------------------- | ------------------------ | ---------- | ---------------------------------- | ------------- |
| `nike-air-max-270`         | Nike Air Max 270         | 1 490 000  | Nike                               | 124           |
| `adidas-ultraboost-22`     | Adidas Ultraboost 22     | 1 890 000  | Adidas                             | 89            |
| `puma-rs-x-sneakers`       | Puma RS-X krossovkalar   | 990 000    | Puma                               | 78            |
| `zara-oversized-shirt`     | Zara Oversized Shirt     | 390 000    | Zara                               | 67            |
| `mac-ruby-woo-lipstick`    | MAC Ruby Woo lablo'yog'i | 285 000    | Chanel (xato — MAC bo'lishi kerak) | 234           |
| `dior-sauvage-edt`         | Dior Sauvage EDT 100ml   | 1 980 000  | Dior                               | 198           |
| `chanel-no5-eau-de-parfum` | Chanel N°5 Eau de Parfum | 2 450 000  | Chanel                             | 312           |
| `gucci-marmont-bag`        | Gucci Marmont Sumka      | 18 500 000 | Gucci                              | 45            |

B guruhini olib tashlasangiz, sayt katalogi **bo'sh** qoladi. Variantlar:

1. **Hammasini nofaol qilish.** Sayt haqiqiy tovarlar kelguncha bo'sh turadi. Bu eng halol variant.
2. **Faqat haqiqatda sotiladiganlarini qoldirish.** Nike Store haqiqatan Nike, Adidas yoki Puma sotsa, shu mahsulotlar qoladi. Narx, rasm va zaxirani tekshirish, sharhlar sonini nolga tushirish kerak.
3. **Hozircha qoldirib, «demo» deb belgilash.** Tavsiya etilmaydi: mijoz baribir buyurtma beradi.

## Qanday qilinadi

Admin panelda: **Mahsulotlar** → mahsulotni oching → holatini «Nofaol» yoki «Arxiv» qiling (yoki o'chiring). Nofaol mahsulot katalogdan ham, mahsulot sahifasidan ham yo'qoladi; sahifa 404 qaytaradi.

Kelajakda test yozuvlari prod'ga tushmasligi uchun e2e testlar alohida (staging) bazada ishlashi kerak.
