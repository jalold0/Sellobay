# ADR 0017 — Posilka yorlig'i, skanerlab olish va mijozga kod bilan topshirish

- Holat: qabul qilingan
- Sana: 2026-10-15

## Kontekst

O'z kuryerimiz yetkazishida posilka qo'ldan-qo'lga o'tishi hech narsa bilan tasdiqlanmasdi:

- kuryer ro'yxatdan topshiriqni tanlab, qo'lidagi posilka o'sha ekaniga ishonib «Oldim» bosardi;
- «Yetkazildi» ham shunchaki tugma edi — posilkani mijozga bermasdan ham bosish mumkin edi;
- `DeliveryEvent` da kim bajargani yozilmasdi, ilova GPS yubormasdi;
- kuryer tovarni faqat nomi va soni bo'yicha ko'rardi (rang/o'lcham, SKU, rasm, naqd summa yo'q).

Xalqaro amaliyot (Amazon OTP, DHL/UPS skan nuqtalari, Yandex/Uzum PIN): har bir topshirish
skan yoki kod bilan qayd etiladi va bahsda shu jurnal hal qiladi.

## Qaror

1. **Posilka kodi** (`Delivery.parcelCode`, 8 belgili Crockford base32, `@unique`). Yorliqdagi QR
   `SBP1:<kod>` ni o'z ichiga oladi. Kod sir emas — yorliq qo'lma-qo'l o'tadi.
2. **Topshirish kodi** (`Delivery.handoverPin`, 4 raqam). Faqat mijozga ko'rsatiladi: kabinetdagi
   buyurtma sahifasi, mehmon uchun «Buyurtmani kuzatish» (raqam + telefon), mobil ilova. Mijoz
   QR'i `SBH1:<posilka>:<pin>` — boshqa posilkaning QR'i bilan topshirib bo'lmaydi. Kod kuryer
   posilkani olgandan keyin (`PICKED_UP`/`IN_TRANSIT`/`ARRIVED`) ko'rinadi.
3. **Skanerlab olish** — `POST /api/courier/scan`: egasiz posilka kuryerga biriktiriladi va
   `PICKED_UP` bo'ladi (bitta harakat). Tugma bilan olish qoladi (yorliqsiz eski buyurtmalar),
   lekin jurnalda `MANUAL` deb ko'rinadi.
4. **Mijozga topshirish** (`OUTBOUND` → `DELIVERED`) kod talab qiladi: QR yoki og'zaki 4 raqam.
   5 ta noto'g'ri urinishdan keyin kod yopiladi. Kod yo'q bo'lsa — faqat **surat + sabab** bilan,
   `PHOTO` deb belgilanadi va admin buyurtma sahifasida sariq ogohlantirish bilan ko'radi.
   Qaytarish (`RETURN`) omborga topshiriladi — kod so'ralmaydi.
5. **Jurnal**: `DeliveryEvent.actorId` (kim) va `method` (`MANUAL | SCAN | QR | CODE | PHOTO`),
   GPS ilovadan keladi. Admin buyurtma sahifasida «Topshirish jurnali».
6. **Yorliq**: admin «Posilka yorliqlari» sahifasi — 58×40 mm termoprinter (har yorliq alohida
   sahifa) yoki A4 (3×7). Faqat qora-oq; naqd summa teskari blokda. Mijoz ismi qisqartiriladi,
   telefondan faqat oxirgi 4 raqam.
7. Kodlar yangi yetkazish bilan yaratiladi; eskilariga birinchi kerak bo'lganda
   (`ensureDeliveryCodes`, `@ecom/order-ops`) — migratsiyada SQL bilan to'ldirilmaydi, aks holda
   kod generatsiyasi ikki joyda bo'lardi.

Qoidalar sof funksiyalar sifatida `@ecom/core-domain/parcel-handover.ts` da (testlangan).

## Oqibatlar

- **Prod migratsiyasi merge'dan OLDIN** qo'llanishi shart (`20261015120000_courier_custody_handover`):
  aks holda kuryer va buyurtma API'lari yangi ustunlarni topa olmay 500 qaytaradi (!56 saboqi).
- Eski kuryer ilovasi (kodsiz) «Yetkazildi»ni yubora olmaydi — `400 HANDOVER_REQUIRED`. Kuryerlar
  yangi APK'ni o'rnatishi kerak.
- SMS yo'q (Eskiz hali ulanmagan): mehmon kodni kuzatish sahifasidan oladi. SMS ulangach kod
  «kuryer yo'lga chiqdi» xabariga qo'shiladi.
- Ombordan kuryerga topshirishni admin alohida tasdiqlamaydi — kuryerning skani shu tasdiq
  (kim, qachon, qayerda). Kerak bo'lsa keyin omborchi skaneri qo'shiladi.
