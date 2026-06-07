import { Scale } from 'lucide-react';

import { LegalPage } from '../../../components/static/legal-page';

export const metadata = { title: 'Foydalanish shartlari' };

const SECTIONS = [
  {
    title: 'Umumiy qoidalar',
    body: "Ushbu shartnoma E-Commerce platformasidan foydalanish qoidalarini belgilaydi. Saytdan foydalanish orqali siz ushbu shartlarga rozilik bildirasiz.",
  },
  {
    title: 'Foydalanuvchi majburiyatlari',
    body: "Foydalanuvchi to'g'ri ma'lumot kiritishi, parolni xavfsiz saqlashi va platforma qoidalariga rioya qilishi shart.",
  },
  {
    title: 'Buyurtma va to`lov',
    body: "Buyurtma berilgandan keyin uni bekor qilish faqat 'Tasdiqlangan'gacha bo'lgan davrda mumkin. To'lov ko'rsatilgan usullar orqali amalga oshiriladi.",
  },
  {
    title: 'Yetkazib berish va qaytarish',
    body: "Mahsulot yetkazib berilgandan keyin 14 kun ichida qaytarish mumkin. Qaytarish shartlari /returns sahifasida.",
  },
  {
    title: 'Mas`uliyatni cheklash',
    body: "Platforma uchinchi tomon harakatlari uchun javobgar emas. To'liq mas'uliyat shartnomada belgilangan miqdor bilan cheklanadi.",
  },
  {
    title: "O'zgartirishlar",
    body: 'Biz ushbu shartlarni istalgan vaqtda o`zgartirishimiz mumkin. Foydalanuvchilar email orqali xabardor qilinadi.',
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      icon={Scale}
      title="Foydalanish shartlari"
      description="E-Commerce platformasidan foydalanish bo'yicha rasmiy shartnoma."
      effectiveDate="2026-yil 1-yanvar"
      sections={SECTIONS}
    />
  );
}
