import { ScrollText } from 'lucide-react';

import { LegalPage } from '../../../components/static/legal-page';

export const metadata = { title: 'Sotuvchi qoidalari' };

export default function SellerRulesPage() {
  return (
    <LegalPage
      icon={ScrollText}
      title="Sotuvchi qoidalari"
      description="Platformada sotuv olib borish bo`yicha majburiy qoidalar."
      effectiveDate="2026-yil 1-yanvar"
      sections={[
        {
          title: 'Mahsulot sifati',
          body: "Sotuvchi faqat asl, sertifikatlangan va sayt tavsifiga mos mahsulot sotishi shart. Soxta mahsulot taqiqlanadi.",
        },
        {
          title: 'Buyurtmalarni qabul qilish',
          body: "Buyurtma 24 soat ichida tasdiqlanishi shart. Aks holda buyurtma avtomatik bekor qilinadi va sotuvchi reytingi tushadi.",
        },
        {
          title: 'Yetkazib berish vaqti',
          body: "Sotuvchi mahsulotni 48 soat ichida ombor yoki kuryer xizmatiga topshirishi shart.",
        },
        {
          title: 'Mijoz bilan muloqot',
          body: "Hurmatli munosabat majburiy. Shikoyatlarga 24 soat ichida javob berish lozim.",
        },
        {
          title: 'Qaytarishlar',
          body: "Mijoz 14 kun ichida qaytarsa, sotuvchi qabul qilishi shart. Mahsulot buzilgan holatda qaytarilsa, sotuvchi xarajatlarni o`z zimmasiga oladi.",
        },
        {
          title: 'Sanksiyalar',
          body: "Qoidalarni buzganlik uchun ogohlantirish, hisob to`xtatish yoki butunlay bloklash mumkin.",
        },
      ]}
    />
  );
}
