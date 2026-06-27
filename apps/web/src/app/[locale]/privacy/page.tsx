import { ShieldCheck } from 'lucide-react';

import { LegalPage } from '../../../components/static/legal-page';

export const metadata = { title: 'Maxfiylik siyosati' };

const SECTIONS = [
  {
    title: 'Umumiy qoidalar',
    body: `Ushbu Maxfiylik siyosati Sellobay platformasi foydalanuvchilarining shaxsiy ma'lumotlarini qayta ishlash tartibini belgilaydi.

Ma'lumotlar "Shaxsga doir ma'lumotlar to'g'risida"gi O'zbekiston Respublikasi qonuni talablariga muvofiq qayta ishlanadi.`,
  },
  {
    title: "Qanday ma'lumot to'playmiz",
    body: "Ism va familiya, telefon raqami, email, yetkazib berish manzili, buyurtma tarixi, qurilma va brauzer ma'lumotlari, cookie-fayllar. To'lov karta ma'lumotlari biz tomonimizdan saqlanmaydi.",
  },
  {
    title: "Nima uchun to'playmiz",
    body: "Buyurtmalarni rasmiylashtirish va yetkazish, qo'llab-quvvatlash xizmati, shaxsiy tavsiyalar, sodiqlik dasturi (Sello Coins), xavfsizlik va firibgarlikning oldini olish hamda qonuniy talablarni bajarish uchun.",
  },
  {
    title: 'Qayta ishlash uchun asos',
    body: "Ma'lumotlar foydalanuvchi roziligi, shartnomani bajarish zarurati hamda qonun talablari asosida qayta ishlanadi.",
  },
  {
    title: "Kim bilan baham ko'ramiz",
    body: 'Faqat yetkazib beruvchi (kuryer/logistika) va litsenziyalangan to`lov tashkilotlari bilan — faqat xizmatni bajarish uchun zarur miqdorda. Ma`lumotlaringizni hech qachon uchinchi tomonga marketing maqsadida sotmaymiz.',
  },
  {
    title: "Ma'lumotlarni saqlash muddati",
    body: "Shaxsiy ma'lumotlar xizmat ko'rsatish uchun zarur bo'lgan muddatda yoki qonunda belgilangan muddatda saqlanadi. Foydalanuvchi hisobini o'chirgach, ma'lumotlar qonuniy talablar saqlanishini hisobga olgan holda o'chiriladi.",
  },
  {
    title: 'Sizning huquqlaringiz',
    body: "Siz o'z ma'lumotlaringizni ko'rish, tahrirlash, o'chirish yoki ularni qayta ishlashga rozilikni qaytarib olish huquqiga egasiz. Buni profil sozlamalari (/profile/settings) orqali yoki biz bilan bog'lanib amalga oshirishingiz mumkin.",
  },
  {
    title: 'Cookie-fayllar',
    body: "Saytni yaxshilash, sessiyani saqlash va shaxsiylashtirish uchun cookie-fayllardan foydalanamiz. Brauzer sozlamalarida ularni boshqarish yoki o'chirish mumkin. Batafsil: Cookie siyosati sahifasi.",
  },
  {
    title: 'Xavfsizlik',
    body: "Barcha ma'lumotlar uzatishda TLS shifrlash bilan himoyalanadi. Parollar argon2 algoritmi bilan saqlanadi. To'lov karta ma'lumotlari bizning serverlarimizda saqlanmaydi — ular to'g'ridan-to'g'ri litsenziyalangan to'lov tizimlari orqali qayta ishlanadi.",
  },
  {
    title: 'Bolalar',
    body: "Platforma 18 yoshga to'lmagan shaxslar uchun mo'ljallanmagan. Biz voyaga yetmaganlarning ma'lumotlarini bila turib to'plamaymiz.",
  },
  {
    title: 'Bog`lanish',
    body: `Shaxsiy ma'lumotlar bo'yicha so'rovlar uchun: [TO'LDIRING: email], [TO'LDIRING: telefon].`,
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      icon={ShieldCheck}
      title="Maxfiylik siyosati"
      description="Sizning shaxsiy ma'lumotlaringizni qanday to'playmiz, ishlatamiz va himoya qilamiz."
      effectiveDate="2026-yil 1-iyul"
      sections={SECTIONS}
    />
  );
}
