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
(1086 kalit x 3 til). **O'sha fayllarni qo'lda tahrirlamang** — manba
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

## Android: birinchi marta qurish

`flutter doctor` yashil bo'lishi YETARLI EMAS. APK quriladigan mashinada
qo'shimcha ikki komponent kerak:

| Komponent           | Nega                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------- |
| NDK `28.2.13676358` | `jni` paketi `externalNativeBuild { cmake }` bilan haqiqiy C kodini kompilyatsiya qiladi |
| CMake `3.22.1`      | o'sha build'ni yurituvchi                                                                |

`jni` TO'G'RIDAN-TO'G'RI bog'liqlik emas, shuning uchun `pubspec.yaml` ga
qarab uni sezmaysiz. Zanjir: `image_picker` -> `path_provider_android`
-> `jni`. Versiyani Flutter SDK belgilaydi
(`packages/flutter_tools/gradle/src/main/kotlin/FlutterExtension.kt`),
ya'ni SDK yangilansa NDK versiyasi ham o'zgaradi.

### sdkmanager tuzog'i

Gradle ularni O'ZI yuklab olmoqchi bo'ladi va YIQILADI:

```
Package ndk not found.
Package 28.2.13676358 not found.
> Android sdkmanager did not install NDK 28.2.13676358
```

Sabab: Google `sdkmanager` ni yangi `android` CLI bilan almashtirgan va
paket nomi formati o'zgargan. Gradle eski `ndk;28.2.13676358` ni
yuboradi, yangi CLI esa uni nuqtali vergulda ikkiga bo'lib tashlaydi.

Qo'lda o'rnating — `cmdline-tools/latest/bin/` dan:

```bash
android sdk install "ndk/28.2.13676358"
android sdk install "cmake/3.22.1"
```

**Nuqtali vergul emas, SLASH.** `@` shakli ham ishlamaydi: u
`No url for ndk. Ignoring.` deb yozadi va **exit code 0 qaytaradi** —
ya'ni jim yiqiladi, skript esa muvaffaqiyat deb o'ylaydi. O'rnatilganini
`$ANDROID_HOME/ndk/` papkasiga qarab tekshiring.

### Gradle xotirasi

`gradle.properties` da `-Xmx3G` turadi, Flutter shablonidagi `-Xmx8G`
emas. Shablon qiymati 8 GB dan kam RAM'li mashinada AAPT2 bosqichida
Windows'ning `Insufficient system resources` (1450) xatosini beradi:

```
Execution failed for task ':shared_preferences_android:verifyReleaseResources'
```

Xato TASODIFIY ko'rinadi — har safar boshqa resurs faylida uziladi, shu
sababli kod muammosiga o'xshaydi. Shuningdek ikkita ilovani BIR VAQTDA
qurmang: har bir Gradle demoni o'z heap'ini oladi.

### INTERNET ruxsati

`main/AndroidManifest.xml` dagi `INTERNET` ruxsatini O'CHIRMANG. Flutter
shabloni uni faqat `debug/` va `profile/` ga qo'yadi; ularsiz reliz APK
tarmoqqa chiqa olmaydi va har bir ekran "tarmoq xatosi" bilan ochiladi.
Nuqson `flutter run` da KO'RINMAYDI — faqat reliz APK telefonga
o'rnatilgandan keyin chiqadi.

### Qurish

```bash
pnpm flutter:i18n                  # repo root'dan, tarjimalar generatsiyasi
cd apps/flutter/customer
flutter build apk --release        # -> build/app/outputs/flutter-apk/
flutter install --release
```

Reliz build standart holda `https://sellobay.uz` ga ulanadi
(`AppConfig.fromEnvironment`), bayroq kerak emas.

APK ~53 MB, chunki u universal (barcha ABI). Kichikroq kerak bo'lsa:
`flutter build apk --split-per-abi` (~18 MB), lekin unda telefon
arxitekturasiga mos faylni o'zingiz tanlaysiz.

Reliz build hozircha DEBUG kaliti bilan imzolanadi (qarang
`android/app/build.gradle.kts`) — sinash uchun yetarli, Play Store uchun
emas. Haqiqiy keystore ulangach, ilovani telefondan avval o'chirish
kerak: imzo mos kelmaydi.

## Ko'chish tartibi

Hozirgi Expo ilovalari (`apps/mobile`, `apps/courier`) **o'chirilmaydi** —
Flutter versiyasi tayyor bo'lguncha ishlab turadi. Ikkalasi bitta backend
bilan yonma-yon ishlay oladi.
