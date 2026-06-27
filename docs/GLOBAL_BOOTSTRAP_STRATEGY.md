# Sellobay — Kapitalsiz Bootstrap Strategiyasi (Go-to-Market)

> **Status:** Reja (Draft v1) · **Yaratildi:** 2026-06-28
> **Asos:** kapital yo'q, sponsor yo'q, LEKIN kargo/logistika hamkor TAYYOR.
> **Maqsad:** daromad bilan o'sish (bootstrap) — savdo aylanasini ishga tushirib, kelgan
> daromad bilan marketplace'ni to'liq qilish va Global'ni kengaytirish.
>
> To'liq texnik reja: `docs/SELLOBAY_GLOBAL.md`. Bu fayl — **biznes ketma-ketligi va pul oqimi.**

---

## 0. Asosiy prinsip — OLDINDAN TO'LOV (zero-capital siri)

Chegaralararo (Global) mahsulotlar **faqat oldindan to'lov** bilan sotiladi:

```
Mijoz to'laydi (100%, Click/Payme) →
   manbadan sotib olamiz (~60-70%) →
   kargo hamkor yetkazadi →
   marja qoladi (~30-40%) →
   keyingi o'sish / xarajat
```

- **COD (yetkazganda to'lash) chegaralararo uchun MAN** — bu kapital talab qiladi.
- Mahalliy mahsulotlar uchun COD bo'lishi mumkin (qisqa yetkazish, kam risk).
- Boshlang'ich kapital: ~$0. Faqat AI tarjima + server (~$50-200/oy) — birinchi savdolar qoplaydi.

---

## 1. Ketma-ketlik (eng muhim qaror)

> **Global'ni ALOHIDA va BIRINCHI ishga tushirmaymiz.** Avval mahalliy ishonch, keyin Global.

### Bosqich A — Mahalliy MVP launch (2026-07-13)
- Deyarli tayyor, risksiz. `docs/LAUNCH_CHECKLIST.md` bo'yicha.
- **Qisqa yetkazish** (Toshkent 1-2 kun) = oson ishonch, tez sotuv.
- To'lov / logistika / brendni real sharoitda sinaymiz.
- Maqsad: birinchi mijozlar, sharhlar, ishonch (social proof) yig'ish.

### Bosqich B — Global'ni KATEGORIYA sifatida qo'shish (launch + ~1-2 oy)
- Xitoy mahsulotlari mahalliy mahsulotlar yonida ko'rinadi (alohida sayt emas).
- Endi mijozda ishonch bor → oldindan to'lashga rozi bo'ladi.
- Aniq yetkazish muddati: "15-25 kun" + arzon narx bilan kompensatsiya.
- Texnik: `packages/sourcing` + AliExpress adapter + AI tarjima (kapitalsiz start).

### Bosqich C — Group Buy + Global birikmasi (yashirin qurol)
- ROADMAP'dagi **Group Buy** (Pinduoduo uslubi) ni Global bilan birlashtirish:
  - "20 kishi buyurtma bersa → kargo ulgurji keltiradi → 40% arzon"
  - Oldindan to'lov + ulgurji yetkazish = **kapital 0, marja yuqori, viral**
  - Mijoz uzoq kutishga rozi (arzon + birga oladi).
- Bu — kapitalsiz o'sishning asosiy formulasi.

---

## 2. Daromad bilan o'sish modeli (reinvest loop)

```
Mahalliy savdo (qisqa yetkazish, COD/prepay)
        ↓ daromad
Global kategoriya (prepay, dropship — kapital 0)
        ↓ yuqori marja
Group Buy bulk (ulgurji, eng yuqori marja)
        ↓ to'plangan daromad
Marketplace'ni to'ldirish (courier, wms, telegram, AI) + reklama
```

- Har bosqich keyingisini moliyalashtiradi. Tashqi kapital shart emas.
- Doimiy xarajatlar (server, SMS, to'lov komissiyasi) — daromaddan qoplanadi.

---

## 3. Biznes modeli: Dropshipping → Konsolidatsiya

- **Boshlanish:** sof dropshipping (prepay) — mijoz buyurtma bersa keyin sotib olamiz. Risksiz.
- **O'sgach:** mashhur mahsulotlarni Group Buy bulk bilan oldindan keltirish (tezroq yetkazish).
- **Keyin:** daromad to'planganda — mahalliy ombor + konsolidatsiya (kapital paydo bo'lganda).

---

## 4. Birinchi konkret qadamlar (MVP launch'dan KEYIN)

1. [ ] AliExpress affiliate/API hisobi (bepul)
2. [ ] `packages/sourcing` + aliexpress adapter PoC
3. [ ] AI tarjima pipeline (Claude API) — 100 mahsulot test
4. [ ] Narxlash formulasi + valyuta kursi (CBU)
5. [ ] Kargo hamkor bilan: parcel narxi, muddat, bojxona jarayoni aniqlash
6. [ ] 🔒👤 Huquqiy: import/bojxona/QQS — bir marta maslahat (kargo hamkor ham yordam beradi)
7. [ ] Pilot: 1 kategoriya, ~100-1000 mahsulot, oldindan to'lov bilan cheklangan test
8. [ ] Group Buy + Global integratsiyasi

---

## 5. Xavflar (kapitalsiz modelda)

| Xavf | Yumshatish |
|------|------------|
| Oldindan to'lov + 20 kun = ishonchsizlik | Avval mahalliy ishonch; aniq muddat; arzon narx; Group Buy |
| Bojxona/import noma'lumligi | Kargo hamkor + bir martalik huquqiy maslahat |
| Valyuta tebranishi | Kunlik kurs + marja bufferi |
| Qaytarish (cross-border qimmat) | Aniq qaytarish siyosati; ishonchli yetkazib beruvchi; reyting filtri |
| Marja yupqa | Group Buy bulk; mashhur mahsulotlarga fokus |

---

## 6. Xulosa

- **"Daromad bilan o'sish" — to'g'ri va realistik** (kargo tayyorligi tufayli kuchli).
- **Kalit:** oldindan to'lov (kapitalsiz mexanizm).
- **Ketma-ketlik:** mahalliy MVP → ishonch → Global kategoriya → Group Buy bulk.
- **Qurol:** Group Buy + chegaralararo = viral, yuqori marja, kapital 0.

> **Eslatma:** Bu MVP launch (2026-07-13) dan KEYIN boshlanadi. Hozir fokus — MVP'ni tugatish.
