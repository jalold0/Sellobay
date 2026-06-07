import { BookOpen } from 'lucide-react';

import { ComingSoon } from '../../../components/static/coming-soon';

export const metadata = { title: "Sotuvchi qo'llanmasi" };

export default function SellerGuidePage() {
  return (
    <ComingSoon
      icon={BookOpen}
      title="Sotuvchi qo'llanmasi"
      description="Platformada muvaffaqiyatli sotuvchi bo'lish bo'yicha to'liq qo'llanma."
      features={[
        'Hisob va do`kon sozlamalari',
        'Mahsulot qo`shish va boshqarish',
        'Buyurtmalarni qabul qilish',
        "Marketing va o'sish",
        'Hisob-kitob va payout',
      ]}
      cta={{ label: 'Sotuvchi bo`lish', href: '/sell' }}
    />
  );
}
