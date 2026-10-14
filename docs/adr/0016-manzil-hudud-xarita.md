# ADR 0016 — Manzil: avval hudud, Toshkentda xarita, viloyatda filial

- **Sana:** 2026-10-15
- **Holat:** Qabul qilingan (egasi tasdiqladi: web geokoder — bepul OSM)
- **Kontekst:** Mobil ilovada xarita faqat saqlangan manzil formasida edi, web'da esa umuman
  yo'q edi. Ikkalasi ham buyurtmaga koordinata yubormasdi va server «Toshkent ichidami»
  savolini manzil MATNIDAN taxmin qilardi (`looksLikeTashkentCityText`). Egasi web va
  mobilda bir xil oqim so'radi: Toshkent shahri — xaritadan uy, viloyat — filial.

## Qarorlar

### 1. Hudud ro'yxatdan tanlanadi (web va mobil bir xil)

- 14 hudud: `@ecom/core-domain` `UZ_REGIONS` (slug + buyurtmaga yoziladigan o'zbekcha nom).
  Nomlar tarjimada `regions.<slug>` (`@ecom/i18n`).
- Mobil ro'yxatni Dart'da takrorlamaydi: `GET /api/config` → `geo.regions`
  (`slug`, `name`, `homeDelivery`). Eski server bermasa — eski erkin matn maydoni.
- Uygacha (va express) — faqat `toshkent-shahri` (`regionAllowsHomeDelivery`). Boshqa
  hududda faqat filial; ro'yxat `GET /api/pickup-points?regionSlug=` bilan, server bazadagi
  turlicha yozilgan matnni (`Toshkent`, `Farg'ona`, `Фергана`) `regionSlugFromText` bilan
  moslaydi.
- **Qoida o'zgardi:** «Toshkent viloyati» endi shahar hisoblanmaydi
  (`looksLikeTashkentCityText` → `false`). Ilgari bu chekka holat ataylab qabul qilinardi.

### 2. Koordinata buyurtmaga yuboriladi

- Uygacha yetkazishda xaritadagi nuqta (`latitude`/`longitude`) `/api/orders` ga ketadi;
  server mavjud qoidasi bo'yicha hududni MATN emas, koordinata (`isInTashkentCity`) bilan
  tekshiradi. Nuqtasiz buyurtma eskicha (matn bo'yicha) ishlayveradi.
- `GET/POST/PATCH /api/addresses` koordinatani SON qaytaradi (`serializeAddress`). Ilgari
  `Decimal` satr bo'lib ketardi va mobil ilova (`SavedAddress.fromJson`) koordinatali
  manzilli ro'yxatni o'qiy olmasdi.

### 3. Web xarita — mobil bilan bir xil manba

- `maplibre-gl` + `pmtiles` + `@protomaps/basemaps`, bitta pmtiles arxivi (R2, CORS `*`) —
  mobil `flutter_map` bilan bir xil plitkalar, API kalitsiz.
- maplibre v6 xaritani Web Worker'da chizadi; worker sayt domenidan bo'lishi shart, bundler
  esa uning manzilini qo'ya olmaydi. Shuning uchun `scripts/copy-maplibre-worker.mjs`
  `dev`/`build` oldidan worker'ni `public/vendor/maplibre/<versiya>/` ga nusxalaydi
  (git'ga kirmaydi), komponent `setWorkerUrl()` bilan o'sha manzilni beradi.
- Kutubxona faqat xarita ochilganda yuklanadi (dinamik import) — umumiy bundle o'zgarmaydi.

### 4. Pin manzili (teskari geokodlash) — OpenStreetMap Nominatim

- Mobil telefonning o'z geokoderidan foydalanadi; brauzerda bunday xizmat yo'q.
- `GET /api/geo/reverse` server orqali Nominatim'ga boradi: tanituvchi `User-Agent`,
  4 kasrgacha yaxlitlangan nuqta bo'yicha 30 kun kesh, IP bo'yicha daqiqasiga 30 so'rov.
  Xizmat javob bermasa — hudud baribir koordinatadan, ko'chani mijoz o'zi yozadi.
- **Cheklov:** Nominatim'ning ommaviy serveri yuqori yuklama uchun emas (sekundiga 1 so'rov).
  Trafik o'sganda o'z Nominatim/Photon nusxasi yoki pullik xizmatga o'tiladi —
  `ReverseGeocodeResult` interfeysi o'zgarmaydi.

## Oqibatlar

- Web checkout: hudud → (Toshkent) saqlangan manzil yoki xaritadagi nuqta + ko'cha;
  (viloyat) filiallar xaritada va ro'yxatda, ish vaqti bilan. Profil manzillarida ham xarita.
- Mobil checkout: hudud ro'yxati, Toshkentda «Xaritadan belgilash», viloyatda uy maydonlari
  yashiriladi va faqat filial; filial ro'yxati hudud bo'yicha.
