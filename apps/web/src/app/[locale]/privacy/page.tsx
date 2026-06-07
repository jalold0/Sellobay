import { ShieldCheck } from 'lucide-react';

import { LegalPage } from '../../../components/static/legal-page';

export const metadata = { title: 'Maxfiylik siyosati' };

const SECTIONS = [
  {
    title: 'Qanday ma`lumot to`playmiz',
    body: "Ism, telefon, email, manzil, buyurtma tarixi, qurilma ma'lumotlari, cookie-fayllar.",
  },
  {
    title: 'Nima uchun to`playmiz',
    body: "Buyurtma yetkazish, qo'llab-quvvatlash, shaxsiy tavsiyalar va xavfsizlik uchun.",
  },
  {
    title: 'Kim bilan baham ko`ramiz',
    body: 'Faqat yetkazib beruvchilar va to`lov tizimlari bilan — faqat zarur miqdorda. Hech qachon uchinchi tomon marketing maqsadida sotmaymiz.',
  },
  {
    title: 'Sizning huquqlaringiz',
    body: "Siz har doim o'z ma'lumotlaringizni ko'rishingiz, tahrirlashingiz yoki o'chirishingiz mumkin. /profile/settings bo'limidan.",
  },
  {
    title: 'Cookie-fayllar',
    body: "Saytni yaxshilash va shaxsiylashtirish uchun cookie ishlatamiz. Brauzer sozlamalarida o'chirib qo'yish mumkin.",
  },
  {
    title: 'Xavfsizlik',
    body: "Barcha ma'lumotlar TLS 1.3 bilan shifrlanadi. Parollar argon2 bilan saqlanadi. To'lov ma'lumotlari hech qachon bizning serverimizda saqlanmaydi.",
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      icon={ShieldCheck}
      title="Maxfiylik siyosati"
      description="Sizning ma'lumotlaringizni qanday himoya qilamiz."
      effectiveDate="2026-yil 1-yanvar"
      sections={SECTIONS}
    />
  );
}
