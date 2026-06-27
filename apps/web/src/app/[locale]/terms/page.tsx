import { Scale } from 'lucide-react';

import { LegalPage } from '../../../components/static/legal-page';

export const metadata = { title: 'Foydalanish shartlari' };

const SECTIONS = [
  {
    title: 'Umumiy qoidalar',
    body: 'Ushbu Foydalanish shartlari Sellobay marketplace platformasidan (sayt va mobil ilova) foydalanish qoidalarini belgilaydi. Platformadan foydalanish orqali siz ushbu shartlarga to`liq rozilik bildirasiz. Rozi bo`lmasangiz, Platformadan foydalanmang.',
  },
  {
    title: "Hisob va ro'yxatdan o'tish",
    body: "Ayrim funksiyalar uchun ro'yxatdan o'tish talab etiladi. Foydalanuvchi to'g'ri ma'lumot kiritishi, hisob ma'lumotlari (parol, OTP) maxfiyligini saqlashi shart. Hisob orqali amalga oshirilgan barcha harakatlar uchun foydalanuvchi javobgar.",
  },
  {
    title: 'Taqiqlangan harakatlar',
    body: "Platformadan noqonuniy maqsadlarda foydalanish, boshqa shaxslar nomidan firibgarlik, tizim xavfsizligini buzishga urinish, spam, zararli dasturlar tarqatish hamda boshqalar huquqlarini buzish qat'iyan taqiqlanadi.",
  },
  {
    title: "Buyurtma va to'lov",
    body: "Buyurtma berilgandan keyin uni bekor qilish 'Tasdiqlangan' holatigacha bo'lgan davrda mumkin. To'lov ko'rsatilgan usullar (Click, Payme, bank kartalari, naqd) orqali amalga oshiriladi. Barcha narxlar O'zbekiston so'mida ko'rsatiladi.",
  },
  {
    title: 'Yetkazib berish va qaytarish',
    body: 'Sifatli mahsulot yetkazib berilgandan keyin 14 kun ichida qaytarilishi mumkin (qonunda qaytarilmaydigan deb belgilangan toifalardan tashqari). Batafsil shartlar "Qaytarish va to`lash" sahifasida.',
  },
  {
    title: 'Sotuvchilar uchun shartlar',
    body: "Sotuvchilar mahsulot to'g'risida aniq va haqqoniy ma'lumot berishlari, qonuniy mahsulotlarnigina sotishlari va buyurtmalarni o'z vaqtida bajarishlari shart. Platforma qoidabuzar sotuvchining hisobini cheklash yoki bloklash huquqiga ega.",
  },
  {
    title: 'Intellektual mulk',
    body: "Platformadagi logotip, dizayn, matn va dasturiy ta'minot Platforma operatorining yoki tegishli huquq egalarining mulki hisoblanadi va ruxsatsiz nusxalanishi yoki foydalanilishi mumkin emas.",
  },
  {
    title: 'Sello Coins (sodiqlik)',
    body: "Sello Coins bonus ballarini to'plash va sarflash Platformada e'lon qilingan qoidalar asosida amalga oshiriladi. Ballar pulga aylantirilmaydi va faqat Platforma ichida chegirma sifatida ishlatiladi.",
  },
  {
    title: "Mas'uliyatni cheklash",
    body: "Platforma vositachi sifatida ish ko'radi va uchinchi tomon (sotuvchi, to'lov tizimi, yetkazib beruvchi) harakatlari hamda force-majeure holatlari uchun javobgar emas. Mahsulot sifati uchun bevosita sotuvchi javobgardir.",
  },
  {
    title: 'Bahslarni hal qilish',
    body: 'Bahslar avvalo muzokara yo`li bilan hal qilinadi. Kelishuvga erishilmasa, bahslar O`zbekiston Respublikasi amaldagi qonunchiligi asosida ko`rib chiqiladi.',
  },
  {
    title: "O'zgartirishlar",
    body: 'Platforma ushbu shartlarni istalgan vaqtda o`zgartirish huquqini saqlab qoladi. Yangi tahrir Platformada e`lon qilingan paytdan kuchga kiradi.',
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      icon={Scale}
      title="Foydalanish shartlari"
      description="Sellobay marketplace platformasidan foydalanish bo'yicha rasmiy shartnoma."
      effectiveDate="2026-yil 1-iyul"
      sections={SECTIONS}
    />
  );
}
