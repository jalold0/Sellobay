import { FileText } from 'lucide-react';

import { LegalPage } from '../../../components/static/legal-page';

export const metadata = { title: 'Ommaviy oferta' };

export default function OfferPage() {
  return (
    <LegalPage
      icon={FileText}
      title="Ommaviy oferta"
      description="Sellobay platformasidan foydalanish va mahsulot sotib olish bo'yicha rasmiy ommaviy oferta (O'zbekiston Respublikasi Fuqarolik kodeksi 367-369-moddalari asosida)."
      effectiveDate="2026-yil 1-iyul"
      sections={[
        {
          title: 'Umumiy qoidalar',
          body: `Ushbu hujjat — Sellobay marketplace platformasi (keyingi o'rinlarda "Platforma") egasi tomonidan istalgan jismoniy yoki yuridik shaxsga (keyingi o'rinlarda "Xaridor") taqdim etilgan ommaviy oferta hisoblanadi.

Xaridor tomonidan buyurtma rasmiylashtirilishi yoki to'lov amalga oshirilishi — ushbu ofertaning barcha shartlariga to'liq va so'zsiz rozilik (akseptlash) deb hisoblanadi.

Platforma operatori: [TO'LDIRING: tashkilot nomi, MCHJ/YaTT], STIR: [TO'LDIRING], manzil: [TO'LDIRING].`,
        },
        {
          title: 'Asosiy atamalar',
          body: `Platforma — sellobay.uz veb-sayti va Sellobay mobil ilovasi.
Sotuvchi — Platformada ro'yxatdan o'tgan va mahsulot taklif etuvchi shaxs.
Xaridor — mahsulot sotib oluvchi shaxs.
Mahsulot — Platformada sotuvga qo'yilgan tovar yoki xizmat.
Buyurtma — Xaridorning mahsulot sotib olish to'g'risidagi rasmiylashtirilgan so'rovi.
Sello Coins — Platformaning sodiqlik (bonus) ballari.`,
        },
        {
          title: 'Oferta predmeti',
          body: `Platforma — Sotuvchilar va Xaridorlar o'rtasida mahsulot oldi-sotdisi uchun texnik vositachilik xizmatini ko'rsatadi.

Platforma mahsulot oldi-sotdi shartnomasi tomoni emas (agar mahsulotni bevosita Platforma operatori sotmasa) — u Sotuvchi va Xaridorni bog'lovchi maydon vazifasini bajaradi.`,
        },
        {
          title: "Ro'yxatdan o'tish va hisob",
          body: `Buyurtma berish uchun Xaridor telefon raqami orqali ro'yxatdan o'tadi yoki mehmon (guest) sifatida buyurtma beradi.

Xaridor o'z hisobi ma'lumotlari (parol, OTP kodi) maxfiyligini saqlashi shart. Hisob orqali amalga oshirilgan barcha harakatlar uchun Xaridor javobgar.

Ko'rsatilgan ma'lumotlarning to'g'riligi uchun Xaridor mas'uldir.`,
        },
        {
          title: 'Buyurtma berish tartibi',
          body: `Xaridor mahsulotni savatga qo'shadi, yetkazib berish manzili va to'lov usulini tanlaydi hamda buyurtmani tasdiqlaydi.

Buyurtma tasdiqlangach, Xaridorga buyurtma raqami va holati to'g'risida xabar yuboriladi.

Mahsulot mavjud bo'lmagan hollarda Platforma buyurtmani bekor qilish va to'langan mablag'ni qaytarish huquqiga ega.`,
        },
        {
          title: "Narx va to'lov",
          body: `Barcha narxlar O'zbekiston so'mida (UZS) ko'rsatiladi va QQS hisobga olingan holda belgilanadi (qonunchilikda nazarda tutilgan hollarda).

To'lov usullari: Click, Payme, Uzcard/Humo bank kartalari hamda yetkazib berishda naqd to'lov (mavjud bo'lgan hollarda).

Onlayn to'lovlar litsenziyalangan to'lov tashkilotlari orqali xavfsiz amalga oshiriladi. Platforma karta ma'lumotlarini saqlamaydi.

Chegaralararo (xalqaro) mahsulotlar uchun to'lov faqat oldindan amalga oshiriladi.`,
        },
        {
          title: 'Yetkazib berish',
          body: `Yetkazib berish muddati va narxi mahsulot, manzil va yetkazish usuliga qarab buyurtma rasmiylashtirilayotganda ko'rsatiladi.

Mahalliy buyurtmalar odatda 1-3 ish kunida, xalqaro (chegaralararo) buyurtmalar 15-30 kun ichida yetkaziladi.

Yetkazib berish muddatlari taxminiy bo'lib, logistika va bojxona jarayonlariga bog'liq holda o'zgarishi mumkin.`,
        },
        {
          title: 'Qaytarish va almashtirish',
          body: `Xaridor sifatli mahsulotni qabul qilingandan keyin 14 kun ichida qaytarish huquqiga ega (mahsulot ishlatilmagan, tovar ko'rinishi va yorliqlari saqlangan bo'lsa).

Ayrim toifadagi mahsulotlar qaytarilmaydi (ochilgan kosmetika/atir, ichki kiyim, oziq-ovqat, sovg'a sertifikatlari va qonunchilikda belgilangan boshqa tovarlar).

Nuqsonli mahsulot aniqlangan hollarda qaytarish/almashtirish Platforma hisobidan amalga oshiriladi. Batafsil: "Qaytarish va to'lash" sahifasi.`,
        },
        {
          title: "Tomonlarning huquq va majburiyatlari",
          body: `Platforma majburiyatlari: xizmatning uzluksiz ishlashini ta'minlashga harakat qilish, buyurtma holati to'g'risida xabardor qilish, shaxsiy ma'lumotlarni himoya qilish.

Sotuvchi majburiyatlari: mahsulot to'g'risida aniq ma'lumot berish, sifatli mahsulotni belgilangan muddatda taqdim etish.

Xaridor majburiyatlari: to'g'ri ma'lumot kiritish, to'lovni o'z vaqtida amalga oshirish, mahsulotni qabul qilish.`,
        },
        {
          title: 'Sello Coins (sodiqlik tizimi)',
          body: `Xaridor xaridlar va boshqa faolliklar uchun Sello Coins bonus ballarini to'playdi. Ballar keyingi xaridlarda chegirma sifatida ishlatilishi mumkin.

Ballarning to'planishi va sarflanishi shartlari Platformada e'lon qilingan qoidalar asosida belgilanadi. Platforma bu qoidalarni oldindan xabar berib o'zgartirish huquqini saqlab qoladi.`,
        },
        {
          title: 'Javobgarlik',
          body: `Platforma o'zgaruvchan (force-majeure) holatlar, uchinchi tomon xizmatlaridagi uzilishlar yoki Xaridor tomonidan shartlarning buzilishi natijasida yuzaga kelgan zararlar uchun javobgar emas.

Mahsulot sifati va tavsifga muvofiqligi uchun bevosita Sotuvchi javobgar (mahsulotni Platforma operatori sotgan hollardan tashqari).`,
        },
        {
          title: 'Maxfiylik',
          body: `Shaxsiy ma'lumotlarni qayta ishlash "Maxfiylik siyosati" hujjati va "Shaxsga doir ma'lumotlar to'g'risida"gi O'zbekiston Respublikasi qonuni asosida amalga oshiriladi.`,
        },
        {
          title: 'Bahslarni hal qilish',
          body: `Tomonlar o'rtasidagi bahslar avvalo muzokara yo'li bilan hal qilinadi. Kelishuvga erishilmagan hollarda bahslar O'zbekiston Respublikasi amaldagi qonunchiligi asosida hal etiladi.`,
        },
        {
          title: 'Yakuniy qoidalar',
          body: `Platforma ushbu ofertaga o'zgartirish kiritish huquqini saqlab qoladi. Yangi tahrir Platformada e'lon qilingan paytdan kuchga kiradi.

Aloqa: [TO'LDIRING: telefon], [TO'LDIRING: email], [TO'LDIRING: manzil].
Bank rekvizitlari: [TO'LDIRING: hisob raqami, bank, MFO].`,
        },
      ]}
    />
  );
}
