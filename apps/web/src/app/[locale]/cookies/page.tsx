import { Cookie } from 'lucide-react';

import { LegalPage } from '../../../components/static/legal-page';

export const metadata = { title: 'Cookie siyosati' };

export default function CookiesPage() {
  return (
    <LegalPage
      icon={Cookie}
      title="Cookie siyosati"
      effectiveDate="2026-yil 1-yanvar"
      sections={[
        {
          title: 'Cookie nima',
          body: "Cookie — bu saytlar tomonidan brauzeringizda saqlanadigan kichik fayllar. Saytdan qulay foydalanish uchun kerak.",
        },
        {
          title: 'Qaysi cookie ishlatamiz',
          body: 'Texnik (sayt ishlashi uchun majburiy), analitika (sayt yaxshilash), marketing (shaxsiylashtirilgan reklama).',
        },
        {
          title: 'Qanday boshqarish',
          body: "Brauzer sozlamalarida cookie-fayllarni o'chirib qo'yish mumkin. Ammo bu saytning ba'zi funksiyalarini buzishi mumkin.",
        },
      ]}
    />
  );
}
