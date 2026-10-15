import { Card } from '@ecom/ui';
import { HelpCircle, Send, Truck, Undo2 } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

import { PageHero } from '../../../components/static/page-hero';
import { SupportChannels } from '../../../components/support/support-channels';
import { hasSupport, supportContacts } from '../../../lib/support';

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

export default function HelpPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  // Kanallar ENV dan; soxta raqam va ishlamaydigan «Live chat» olib tashlandi (audit TRU-01).
  const support = supportContacts();
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

      {hasSupport(support) ? (
        <section>
          <h2 className="mb-4 text-2xl font-bold">Aloqa kanallari</h2>
          <SupportChannels support={support} />
        </section>
      ) : null}

      {support.telegram ? (
        <Card className="p-6 text-center md:p-10">
          <h3 className="text-2xl font-bold">Javob topa olmadingizmi?</h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
            Telegram orqali operatorga yozing.
          </p>
          <a
            href={`https://t.me/${support.telegram}`}
            target="_blank"
            rel="noreferrer"
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex h-11 items-center rounded-md px-6 text-sm font-medium"
          >
            <Send className="mr-2 h-4 w-4" aria-hidden="true" /> Telegram'da yozish
          </a>
        </Card>
      ) : null}
    </div>
  );
}
