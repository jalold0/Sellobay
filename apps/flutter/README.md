# Sellobay — Flutter ilovalar

Mijoz va kuryer mobil ilovalari. Qaror va sabablar:
[`../../docs/adr/0009-flutter-mobil-ilovalar.md`](../../docs/adr/0009-flutter-mobil-ilovalar.md).
API shartnomasi va tuzoqlar:
[`../../docs/FLUTTER-MIGRATION.md`](../../docs/FLUTTER-MIGRATION.md).

Bu papka **pnpm workspace'dan chiqarilgan** (`pnpm-workspace.yaml` ga
qarang) — Flutter'ning o'z toolchain'i bor va `pnpm install` bu yerga
tegmasligi kerak.

## Rejalashtirilgan tuzilma

```
apps/flutter/
├── shared/                 # ikkala ilova uchun umumiy Dart paket
│   ├── assets/i18n/        # GENERATSIYA: pnpm flutter:i18n
│   └── lib/                # API klient, modellar, config, auth
├── customer/               # mijoz ilovasi (apps/mobile o'rniga)
└── courier/                # kuryer ilovasi (apps/courier o'rniga)
```

`shared/` — alohida Dart paket. API klient, token yangilash va
`GET /api/config` modeli **bir marta** yoziladi, ikkala ilova foydalanadi.

## Skaffold

Flutter o'rnatilgach, shu papkadan:

```bash
flutter create --template=package shared
flutter create --org uz.sellobay --project-name sellobay_customer customer
flutter create --org uz.sellobay --project-name sellobay_courier  courier
```

Keyin `customer/pubspec.yaml` va `courier/pubspec.yaml` ga:

```yaml
dependencies:
  sellobay_shared:
    path: ../shared
```

## Tavsiya etilgan paketlar

Majburiy emas, lekin sabablari bor:

| Paket                    | Nega                                                     |
| ------------------------ | -------------------------------------------------------- |
| `dio`                    | interceptor kerak: 401 da single-flight token yangilash  |
| `flutter_secure_storage` | refresh token **shu yerda**, `SharedPreferences` da emas |
| `decimal`                | pul `double` da saqlanmasin (javoblarda satr keladi)     |

Holat boshqaruvi (`riverpod`, `bloc`, boshqa) — sizning tanlovingiz, bu
yerda qoida yo'q.

## Tarjimalar

```bash
pnpm flutter:i18n     # repo root'dan
```

`packages/i18n/src/locales/*.json` ni `shared/assets/i18n/` ga ko'chiradi
(1029 kalit × 3 til). **O'sha fayllarni qo'lda tahrirlamang** — manba
`packages/i18n`.

`shared/pubspec.yaml` ga:

```yaml
flutter:
  assets:
    - assets/i18n/
```

Dart tomoni next-intl kabi nuqtali kalit bilan qidiradi: `t('cart.title')`.

## Backend manzili

Alohida mobil backend **yo'q** — ilovalar `apps/web` dagi Next.js API'siga
ulanadi (`apps/web/src/app/api/**`).

- Dev: lokal web serveri (`pnpm --filter @ecom/web dev`, port 3000)
- Prod: Vercel'dagi web domeni

Manzilni `--dart-define` bilan bering, kodga yozmang:

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

(Android emulyatorida `localhost` emas, `10.0.2.2`.)

## Ko'chish tartibi

Hozirgi Expo ilovalari (`apps/mobile`, `apps/courier`) **o'chirilmaydi** —
Flutter versiyasi tayyor bo'lguncha ishlab turadi. Ikkalasi bitta backend
bilan yonma-yon ishlay oladi.
