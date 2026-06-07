import { Button, Card } from '@ecom/ui';
import { BadgeCheck, Clock, DollarSign, Store, Truck, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';

import { PageHero } from '../../../components/static/page-hero';

export const metadata = { title: "Sotuvchi bo'lish" };

const BENEFITS = [
  { icon: Users, title: '120 000+ faol mijoz', desc: 'Bir kunda yangi xaridorlar' },
  { icon: TrendingUp, title: "Tezda o'sish", desc: 'Marketing va analitika bizdan' },
  { icon: Truck, title: 'Logistika hal', desc: 'Yetkazib berishni biz bajaramiz' },
  { icon: DollarSign, title: 'Past komissiya', desc: '8-12% — bozordagi eng past' },
];

const STEPS = [
  { title: 'Ariza qoldiring', desc: 'STIR/INN va hujjatlarni yuboring' },
  { title: 'Tasdiqlanasiz', desc: '24 soat ichida tekshiramiz' },
  { title: 'Mahsulot qo`shing', desc: "Panel orqali yuklang" },
  { title: 'Sotishni boshlang', desc: 'Birinchi buyurtma — birinchi haftada' },
];

export default function SellPage() {
  return (
    <div className="space-y-10">
      <PageHero icon={Store} title="Sotuvchi bo'ling" description="O'zbekistondagi eng yirik onlayn bozorga qo'shiling. 850+ brend allaqachon biz bilan." accent="amber">
        <Button asChild size="lg" variant="secondary" className="font-semibold">
          <Link href="/register?role=seller">Ariza qoldirish</Link>
        </Button>
      </PageHero>

      <section className="grid gap-4 md:grid-cols-4">
        {BENEFITS.map((b) => {
          const Icon = b.icon;
          return (
            <Card key={b.title} className="p-5">
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <Icon size={22} />
              </div>
              <div className="mt-3 font-semibold">{b.title}</div>
              <div className="text-xs text-muted-foreground">{b.desc}</div>
            </Card>
          );
        })}
      </section>

      <section>
        <h2 className="mb-5 text-2xl font-bold">4 ta oddiy qadam</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <Card key={s.title} className="relative p-5">
              <div className="absolute right-4 top-4 text-4xl font-black text-primary/10">
                {i + 1}
              </div>
              <BadgeCheck size={20} className="text-primary" />
              <div className="mt-3 font-semibold">{s.title}</div>
              <div className="text-xs text-muted-foreground">{s.desc}</div>
            </Card>
          ))}
        </div>
      </section>

      <Card className="bg-gradient-to-br from-amber-50 to-orange-100 p-6 dark:from-amber-950/30 dark:to-orange-950/30 md:p-10">
        <div className="grid items-center gap-6 md:grid-cols-2">
          <div>
            <Clock className="h-8 w-8 text-amber-700" />
            <h3 className="mt-3 text-2xl font-bold">Tayyor bo'lsangiz — bugun boshlang</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Ariza qoldiring, 24 soat ichida xabarlashamiz.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button asChild size="lg">
              <Link href="/register?role=seller">Ariza qoldirish</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/seller-guide">Sotuvchi qo&apos;llanmasi</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
