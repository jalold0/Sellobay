import { Button, Card } from '@ecom/ui';
import { HelpCircle, Mail, MessageCircle, Phone, Send, Truck, Undo2 } from 'lucide-react';
import Link from 'next/link';

import { PageHero } from '../../../components/static/page-hero';

export const metadata = { title: "Qo'llab-quvvatlash markazi" };

const QUICK = [
  {
    href: '/orders',
    icon: Truck,
    title: 'Buyurtmamni kuzatish',
    desc: 'Real vaqtda holatni ko`ring',
  },
  { href: '/delivery', icon: Truck, title: 'Yetkazib berish', desc: 'Vaqt va narxlar' },
  { href: '/returns', icon: Undo2, title: 'Qaytarish', desc: 'Joyida tekshirib qaytarish' },
  { href: '/faq', icon: HelpCircle, title: 'FAQ', desc: 'Tez-tez so`raladigan savollar' },
];

const CONTACTS = [
  { icon: Phone, label: 'Telefon', value: '+998 71 200 00 00', href: 'tel:+998712000000' },
  { icon: Mail, label: 'Email', value: 'support@example.uz', href: 'mailto:support@example.uz' },
  { icon: Send, label: 'Telegram', value: '@ecom_uz_bot', href: 'https://t.me/' },
  { icon: MessageCircle, label: 'Live chat', value: '24/7 onlayn', href: '#' },
];

export default function HelpPage() {
  return (
    <div className="space-y-10">
      <PageHero
        icon={HelpCircle}
        title="Yordamga muhtojmisiz?"
        description="Biz har doim siz bilan birgamiz. Quyidagi tezkor havolalardan foydalaning yoki bizga bog'laning."
        accent="sky"
      />

      <section>
        <h2 className="mb-4 text-2xl font-bold">Tezkor havolalar</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.href}
                href={q.href}
                className="bg-card hover:border-primary group rounded-xl border p-5 transition hover:shadow"
              >
                <div className="bg-primary/10 text-primary grid h-10 w-10 place-items-center rounded-lg group-hover:scale-110">
                  <Icon size={20} />
                </div>
                <div className="mt-3 font-semibold">{q.title}</div>
                <div className="text-muted-foreground text-xs">{q.desc}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">Aloqa kanallari</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CONTACTS.map((c) => {
            const Icon = c.icon;
            return (
              <a
                key={c.label}
                href={c.href}
                className="bg-card hover:border-primary flex items-center gap-3 rounded-xl border p-4 transition"
              >
                <div className="bg-primary/10 text-primary grid h-10 w-10 place-items-center rounded-lg">
                  <Icon size={18} />
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">{c.label}</div>
                  <div className="text-sm font-semibold">{c.value}</div>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      <Card className="p-6 text-center md:p-10">
        <h3 className="text-2xl font-bold">Javob topa olmadingizmi?</h3>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
          Operator bilan to&apos;g&apos;ridan-to&apos;g&apos;ri bog&apos;laning — 24/7 onlayn
        </p>
        <Button size="lg" className="mt-4">
          <MessageCircle className="mr-2 h-4 w-4" /> Chatni boshlash
        </Button>
      </Card>
    </div>
  );
}
