import { Briefcase } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';

import { ComingSoon } from '../../../components/static/coming-soon';

export const metadata = { title: "Bo'sh ish o'rinlari" };

export default function CareersPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return (
    <ComingSoon
      icon={Briefcase}
      title="Bo'sh ish o'rinlari"
      description="Bizning jamoamiz tezda o'sib boryapti. Tez orada vakansiyalar e'lon qilamiz."
      features={[
        'Frontend va Backend dasturchilar (Next.js, NestJS)',
        'Mobile dasturchilar (React Native)',
        'DevOps va SRE muhandislar',
        'Marketing va Product menejerlar',
      ]}
      cta={{ label: "Biz bilan bog'lanish", href: '/contacts' }}
    />
  );
}
