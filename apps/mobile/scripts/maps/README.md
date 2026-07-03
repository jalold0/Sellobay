# Xarita (Protomaps) sozlash — O'zbekiston

Bu papka Sellobay mobil ilovasidagi xaritani **Protomaps** (o'z hosting, bepul, tijoratга mos) ga o'tkazish uchun tayyor vositalar.

**Umumiy oqim:** bitta `.pmtiles` fayl (O'zbekiston vektor xaritasi) → Cloudflare R2'ga yuklanadi → `app.json`'ga URL qo'yiladi → ilova avtomatik Protomaps'ga o'tadi.

> `pmtilesUrl` bo'sh bo'lsa ilova hozirgidek **OSM raster** (fallback) da ishlayveradi.

> ⚠️ **MapTiler'ning tayyor extract'ini ISHLATMANG** — u OpenMapTiles sxemasida (`protomaps-leaflet` + `theme:'light'` bilan stillashmaydi) va eski. Faqat `build.protomaps.com` to'g'ri.

> ⚠️ **Fayllarni o'chirganда ehtiyot bo'ling** — faqat `bin/`, `*.pmtiles`, `pmtiles.exe`, `LICENSE` ni o'chiring. `*.ps1`, `README.md`, `r2-cors.json` — SAQLANG.

---

## 0. Nima kerak

- **Cloudflare akkaunti** (bepul) — https://dash.cloudflare.com
- Node.js (loyihada bor) — `npx wrangler` uchun
- Windows PowerShell + `curl.exe` (Windows 10/11'da standart)

---

## 1-qadam — `.pmtiles` faylini yaratish

Shu papkada:

```powershell
cd C:\Dev\Sellobay\apps\mobile\scripts\maps
powershell -ExecutionPolicy Bypass -File .\extract-uzbekistan-pmtiles.ps1
```

Skript: `bin/`ga go-pmtiles yuklaydi → oxirgi Protomaps build'ni topadi → `uzbekistan.pmtiles` yaratadi.

**Parametrlar:**

```powershell
.\extract-uzbekistan-pmtiles.ps1 -MaxZoom 15                 # binolar (kattaroq fayl)
.\extract-uzbekistan-pmtiles.ps1 -BBox "69.1,41.15,69.45,41.4" -OutFile tashkent.pmtiles  # faqat Toshkent
.\extract-uzbekistan-pmtiles.ps1 -BuildDate 20260630        # sana avtomatik topilmasa
```

| MaxZoom      | Ko'rinadi                        | Taxminiy hajm (butun UZ) |
| ------------ | -------------------------------- | ------------------------ |
| 14 (default) | ko'chalar, tumanlar              | ~50–120 MB               |
| 15           | binolar (delivery uchun aniqroq) | ~150–300 MB              |

---

## 2-qadam — Cloudflare R2'ga yuklash (bepul)

1. Dashboard → **R2** → **Create bucket** → `sellobay-maps` (10 GB + egress bepul).
2. Yuklash (300MB gacha drag-drop, yoki wrangler):
   ```bash
   npx wrangler r2 object put sellobay-maps/uzbekistan.pmtiles --file ./uzbekistan.pmtiles --content-type application/octet-stream
   ```
3. **CORS** (shart): Bucket → Settings → CORS Policy → [`r2-cors.json`](./r2-cors.json) mazmunini joylang.
4. **Public URL**: `r2.dev` (dev) yoki Custom Domain (`maps.sellobay.uz`).

---

## 3-qadam — ilovaga ulash

`apps/mobile/app.json`:

```json
"extra": {
  "pmtilesUrl": "https://maps.sellobay.uz/uzbekistan.pmtiles"
}
```

Ilovani qayta ishga tushiring → Protomaps vektorга o'tadi.

---

## 4-qadam — tekshirish

```bash
curl.exe -I -r 0-0 https://<url>/uzbekistan.pmtiles   # 206 + access-control-allow-origin
```

Ilovada checkout → manzil tanlash va pickup-points ekranlarida xarita chiqishi kerak.

---

## 5-qadam (ixtiyoriy) — to'liq self-host (tashqi CDN'siz)

Hozir maplibre lib jsdelivr'dan, shriftlar protomaps CDN'dan keladi (bepul, lekin bizники emas). Ularni ham R2'ga ko'chirib **tashqi CDN'siz** qilish mumkin (UZ tarmoqlarида ishonchliroq).

### 5.1. Asset'larni yuklab olish

```powershell
cd C:\Dev\Sellobay\apps\mobile\scripts\maps
powershell -ExecutionPolicy Bypass -File .\fetch-map-assets.ps1
```

`assets\` ичида `maplibre\`, `sprites\`, `fonts\` paydo bo'ladi (~22 fayl).

### 5.2. R2'ga yuklash

R2 dashboard → bucket → **Objects** → `assets\` ичидаgi **uch папкани** (`maplibre`, `sprites`, `fonts`) bucket **ildiziga** drag-drop qiling. Kalitlar: `maplibre/maplibre-gl.js`, `sprites/light.png`, `fonts/Noto Sans Regular/0-255.pbf` ... (CORS allaqachon `*` — o'zgartirish shart emas.)

> Dashboard papka-drag qiynasa, wrangler bilan: `assets\` ичида `npx wrangler r2 object put sellobay-maps/<key> --file <fayl>` (yoki `aws s3 sync` R2 S3 endpoint'ига).

### 5.3. app.json'ga base URL

`extra.mapAssetsBaseUrl` ga R2 bazangizni qo'ying (pmtiles bilan bir xil domen, **faylsiz**):

```json
"mapAssetsBaseUrl": "https://pub-XXXX.r2.dev"
```

Reload → lib + shrift + sprite + tiles **hammasi R2'dan** (tashqi CDN yo'q). Bo'sh qoldirsangiz — CDN (default) ishlaydi, hech narsa buzilmaydi.

---

## Muammolar

| Alomat                     | Yechim                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| Xarita bo'sh/kulrang       | CORS yo'q yoki URL noto'g'ri. `curl.exe -I -r 0-0` bilan tekshiring.                        |
| `206` emas, `403`          | Public access yoqilmagan.                                                                   |
| Xarita juda sodda          | `-MaxZoom 15` bilan qayta yarating.                                                         |
| Fayl juda katta            | `-MaxZoom 14` yoki bbox'ni kichraytiring.                                                   |
| `No Protomaps build found` | `-BuildDate 20260630` (mavjud kun) bering.                                                  |
| `.ps1 does not exist`      | Fayl o'chib ketgan — Claude'dan qayta yaratishni so'rang, faqat manba fayllarni o'chirmang. |

---

## Eslatmalar

- Tiles baribir tarmoqdan (R2) keladi — bu normal; lekin **sizning infrangiz**, vendor limiti yo'q.
- Yangilash: skriptni qayta ishga tushirib R2'dagi faylni almashtiring.
- Xarita kutubxonasi (Leaflet + protomaps-leaflet) ilovага inline — CDN kerak emas; faqat tile ma'lumoti R2'dan.
