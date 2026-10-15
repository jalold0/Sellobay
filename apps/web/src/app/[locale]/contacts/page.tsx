import { Card } from '@ecom/ui';
import { Building2, HelpCircle, Truck } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

import { PageHero } from '../../../components/static/page-hero';
import { SupportChannels } from '../../../components/support/support-channels';
import { hasSupport, supportContacts } from '../../../lib/support';

export const metadata = { title: "Aloqa ma'lumotlari" };

// Ilgari bu sahifada soxta telefon/email, «karta integratsiyasi kelajakda» bloki va
// hech qayerga yubormaydigan forma turardi: mijoz xabar yozib «Yuborish»ni bosar,
// sahifa qayta yuklanib xabar yo'qolardi (audit TRU-01). Endi faqat ENV da sozlangan
// haqiqiy kanallar ko'rsatiladi.
export default function ContactsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const support = supportContacts();

  return (
    <div className="space-y-10">
      <PageHero
        icon={Building2}
        title="Biz bilan bog'laning"
        description="Savollaringiz, takliflaringiz yoki shikoyatlaringiz bilan murojaat qiling."
        accent="primary"
      />

      {hasSupport(support) ? (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Aloqa kanallari</h2>
          <SupportChannels support={support} />
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2">
        <Card className="p-5">
          <Link href="/orders" className="flex items-center gap-3 hover:underline">
            <Truck size={18} className="text-primary" aria-hidden="true" />
            <span className="font-semibold">Buyurtmamni kuzatish</span>
          </Link>
          <p className="text-muted-foreground mt-1 text-sm">
            Buyurtma raqami va telefon bilan holatini ko&apos;ring.
          </p>
        </Card>
        <Card className="p-5">
          <Link href="/faq" className="flex items-center gap-3 hover:underline">
            <HelpCircle size={18} className="text-primary" aria-hidden="true" />
            <span className="font-semibold">Ko&apos;p so&apos;raladigan savollar</span>
          </Link>
          <p className="text-muted-foreground mt-1 text-sm">
            Yetkazish, to&apos;lov va qaytarish haqida javoblar.
          </p>
        </Card>
      </section>
    </div>
  );
}
