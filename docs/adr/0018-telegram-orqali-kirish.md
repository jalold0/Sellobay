# ADR 0018 — Telefon raqamini Telegram orqali tasdiqlash (SMS o'rniga)

- Holat: qabul qilingan
- Sana: 2026-10-17

## Kontekst

Telefon bilan kirish SMS kodga tayangan, lekin SMS provayder (Eskiz va boshqalar) pullik: har
SMS uchun to'lov. Prod'da SMS yuborilmaydi (`phoneLoginAvailable()` — false), mijozlar faqat
email + parol bilan kiradi, telefon raqami tasdiqlanmaydi.

Maqsad SMS emas — raqam egasini tasdiqlash. Telegram har hisobning raqamini o'zi tasdiqlagan va
bot «Raqamni ulashish» (`request_contact`) tugmasi orqali shu raqamni oladi. Bu bepul.
O'zbekistonda Telegram deyarli hammada bor.

## Qaror

1. **Oqim.**
   - Sayt `POST /api/auth/telegram/start` bilan so'rov ochadi: 43 belgili tasodifiy token
     (bazada faqat SHA-256 xeshi, `TelegramLogin.tokenHash`), 4 xonali kod, `t.me/<bot>?start=<token>`.
   - Foydalanuvchi avval saytda kodni ko'radi, keyin Telegram'ni ochadi.
   - Bot (`POST /api/telegram/webhook`) `/start <token>` ni so'rovga bog'laydi (birinchi kelgan
     `from.id`; boshqa Telegram hisobi egallay olmaydi), shu kodni ko'rsatadi va
     «Raqamni ulashish» tugmasini chiqaradi.
   - Kontakt faqat `contact.user_id === from.id` bo'lsa qabul qilinadi (begona kontaktni qo'lda
     yuborib bo'lmaydi) va faqat +998 raqam.
   - Sayt har 2 soniyada `POST /api/auth/telegram/poll` so'raydi; tasdiqlangan so'rov bir marta
     (shartli `updateMany`) iste'mol qilinadi va sessiya beriladi. Umri 10 daqiqa.
2. **Kirish qoidalari SMS bilan bir xil** — `loginWithVerifiedPhone` (`lib/auth/phone-login.ts`):
   SEC-04 (tasdiqlanmagan raqamli hisobga kiritilmaydi — raqam bo'shatiladi, AuditLog),
   PENDING faollashmaydi, bloklangan rad etiladi. Telegram hisobi `UserIdentity(TELEGRAM)`
   sifatida bog'lanadi.
3. **Webhook himoyasi** — `setWebhook` `secret_token` va har so'rovda
   `X-Telegram-Bot-Api-Secret-Token` tekshiruvi (doimiy vaqtda). Usiz har kim soxta update bilan
   istalgan raqamni «tasdiqlay» olardi.
4. **Bot egasi `apps/web`.** Webhook Vercel'da ishlaydi — alohida server kerak emas.
   `apps/telegram-bot` (grammY, long polling) skelet edi va deploy qilinmagan; bitta bot tokeni
   bilan webhook va polling bir vaqtda ishlamaydi. Bot buyruqlari (Mini App, buyurtmalar)
   kerak bo'lganda shu webhook'ga qo'shiladi.
5. **SMS kodi qoladi.** Eskiz ulanganda faqat yuboruvchi qo'shiladi (`otp/send`), qoidalar
   (`loginWithVerifiedPhone`, SEC-05 chegaralari) tayyor. Telegram'i yo'qlar uchun email qoladi.
6. **Yoqish ENV bilan**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`.
   Uchalasi bo'lmasa tugma ko'rinmaydi, endpointlar 503/404.

## Yangilanish (2026-10-17) — ism tasdiqlash va eski hisobni bog'lash

Foydalanuvchi qarorlari:

1. **Telegram — kirish ham, ro'yxatdan o'tish ham.** Raqam yangi bo'lsa hisob ochiladi va
   darhol **ism va familiyani tasdiqlash** oynasi chiqadi (Telegram'dagi bilan oldindan
   to'ldirilgan, ikkalasi majburiy; o'zgartirib tasdiqlash mumkin). Manzil va tug'ilgan sana
   so'ralmaydi — mijoz profildan o'zi qo'shadi; checkout ism/familiya/telefonni profildan
   to'ldiradi. «Ro'yxatdan o'tish» sahifasida ham Telegram tugmasi (sotuvchi arizasida yo'q —
   u KYC talab qiladi).
2. **Raqami tasdiqlanmagan parolli eski hisob** — avtomatik kiritilmaydi (SEC-04), lekin
   mijozga «Bu raqam bilan hisobingiz bor (a\*\*\*@gmail.com) — parolini kiriting» taklif
   qilinadi (`POST /api/auth/telegram/link`). Parol to'g'ri bo'lsa eski hisobga kiradi, raqam
   tasdiqlanadi (AuditLog `PHONE_VERIFIED_LINKED`), Telegram bog'lanadi. Urinishlar har so'rovga
   5 ta, atomar hisoblanadi (`TelegramLogin.linkAttempts`). Parolni bilmasa — «Yangi hisob
   ochish» (raqam eski hisobdan olinadi, SEC-04 qoidasi). Hujumchi qurbon raqamini o'z hisobiga
   yozgan bo'lsa, qurbon uning parolini bilmaydi — yangi hisob ochadi.

## Oqibatlar

- (+) Bepul, raqam haqiqatan tasdiqlanadi (SMS'dan ham ishonchliroq: SIM almashtirish hujumi yo'q).
- (+) SMS va Telegram bir xil kirish qoidalaridan o'tadi — bitta joyda tuzatiladi.
- (−) Telegram'i yo'q foydalanuvchi email bilan kiradi.
- (−) Aldov havolasi xavfi: hujumchi o'z so'rovining havolasini qurbonga yuborsa, qurbon raqamini
  ulashgach hujumchi qurbon hisobiga kiradi. Kamaytirish: bot so'rovni va saytdagi kodni
  ko'rsatadi, «o'zingiz so'ramagan bo'lsangiz bosmang» deb ogohlantiradi; havola 10 daqiqa yashaydi.
- Mobil (Flutter) ilova keyingi bosqichda shu endpointlarni ishlatadi (deep link + poll).
