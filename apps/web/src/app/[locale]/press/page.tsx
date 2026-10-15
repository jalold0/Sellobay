import { Newspaper } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';

import { SUPPORT_MAILTO_HREF } from '@/lib/contacts';

import { ComingSoon } from '../../../components/static/coming-soon';

export const metadata = { title: 'Matbuot markazi' };

export default function PressPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return (
    <ComingSoon
      icon={Newspaper}
      title="Matbuot markazi"
      description="Press-relizlar, media kitlari va brend ma'lumotlari."
      cta={{ label: 'Press kontakt', href: SUPPORT_MAILTO_HREF }}
    />
  );
}
