import { Button, Card, Input, Label, Textarea } from '@ecom/ui';
import { Building2, Clock, Mail, MapPin, Phone, Send } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';

import { SUPPORT_CONTACT } from '@/lib/contacts';

import { PageHero } from '../../../components/static/page-hero';

export const metadata = { title: "Aloqa ma'lumotlari" };

const CONTACTS = [
  {
    icon: Phone,
    label: 'Telefon',
    primary: SUPPORT_CONTACT.phoneDisplay,
    secondary: '24/7 qo`llab-quvvatlash',
  },
  { icon: Mail, label: 'Email', primary: SUPPORT_CONTACT.email, secondary: 'Umumiy savollar' },
  { icon: MapPin, label: 'Manzil', primary: 'Toshkent sh.', secondary: 'Yakkasaroy tumani' },
  {
    icon: Clock,
    label: 'Ish vaqti',
    primary: 'Du-Sh: 09:00–18:00',
    secondary: 'Yakshanba: dam olish',
  },
];

export default function ContactsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return (
    <div className="space-y-10">
      <PageHero
        icon={Building2}
        title="Biz bilan bog'laning"
        description="Savollaringiz, takliflaringiz yoki shikoyatlaringiz bilan murojaat qiling — har doim javob beramiz."
        accent="primary"
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CONTACTS.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="p-5">
              <div className="bg-primary/10 text-primary grid h-10 w-10 place-items-center rounded-lg">
                <Icon size={18} />
              </div>
              <div className="text-muted-foreground mt-3 text-xs uppercase tracking-wide">
                {c.label}
              </div>
              <div className="text-base font-semibold">{c.primary}</div>
              <div className="text-muted-foreground text-xs">{c.secondary}</div>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 md:p-6">
          <h2 className="text-2xl font-bold">Xabar yuboring</h2>
          <p className="text-muted-foreground mt-1 text-sm">Biz 24 soat ichida javob beramiz</p>
          <form className="mt-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Ism</Label>
                <Input placeholder="Ismingiz" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" placeholder="email@example.uz" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Mavzu</Label>
              <Input placeholder="Nima yordam kerak?" />
            </div>
            <div>
              <Label className="text-xs">Xabar</Label>
              <Textarea rows={5} placeholder="Batafsil yozing..." />
            </div>
            <Button className="w-full">
              <Send size={14} className="mr-2" /> Yuborish
            </Button>
          </form>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="aspect-square bg-gradient-to-br from-slate-200 to-slate-300 md:aspect-auto md:h-full">
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <MapPin size={48} className="mx-auto text-slate-400" />
                <p className="mt-3 text-sm text-slate-600">Karta integratsiyasi kelajakda</p>
                <p className="mt-1 text-xs text-slate-500">Yandex Maps yoki Google Maps</p>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
