import { FileText } from 'lucide-react';

import { LegalPage } from '../../../components/static/legal-page';

export const metadata = { title: 'Ommaviy oferta' };

export default function OfferPage() {
  return (
    <LegalPage
      icon={FileText}
      title="Ommaviy oferta"
      description="O'zbekiston Respublikasi qonunchiligi asosida tuzilgan rasmiy oferta."
      effectiveDate="2026-yil 1-yanvar"
      sections={[
        {
          title: 'Oferta predmeti',
          body: 'Sellobay marketplace platformasi orqali mahsulotlar sotib olish va sotish.',
        },
        {
          title: 'Tomonlar majburiyatlari',
          body: 'Sotuvchi — mahsulotni belgilangan vaqtda yetkazib berishi shart. Xaridor — to`lovni o`z vaqtida amalga oshiradi.',
        },
        {
          title: 'Bahsli holatlar',
          body: "Bahslar O'zbekiston Respublikasi qonunchiligi asosida hal qilinadi.",
        },
      ]}
    />
  );
}
