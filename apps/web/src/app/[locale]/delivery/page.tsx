import { Card } from '@ecom/ui';
import { Bike, Building, Clock, Map, Package, Truck } from 'lucide-react';

import { PageHero } from '../../../components/static/page-hero';

export const metadata = { title: "Yetkazib berish" };

const METHODS = [
  {
    icon: Truck,
    title: 'Uyga yetkazib berish',
    desc: '24-48 soat ichida',
    price: '20 000 so`m',
    free: '500 000 so`mdan boshlab tekin',
  },
  {
    icon: Bike,
    title: 'Express',
    desc: 'Toshkent bo`yicha 3 soat ichida',
    price: '50 000 so`m',
    free: 'Cheklanmagan',
  },
  {
    icon: Building,
    title: 'Olib ketish punkti',
    desc: "Sizga eng yaqin punktdan oling",
    price: 'Bepul',
    free: 'Har doim',
  },
];

const REGIONS = [
  'Toshkent shahri', 'Toshkent viloyati', 'Samarqand', 'Buxoro',
  'Andijon', 'Farg`ona', 'Namangan', 'Qashqadaryo', 'Surxondaryo',
  'Jizzax', 'Sirdaryo', 'Navoiy', 'Xorazm', 'Qoraqalpog`iston',
];

export default function DeliveryPage() {
  return (
    <div className="space-y-10">
      <PageHero
        icon={Truck}
        title="Yetkazib berish"
        description="O'zbekistonning barcha 14 hududiga tezkor va xavfsiz yetkazib berish."
        accent="sky"
      />

      <section className="grid gap-4 md:grid-cols-3">
        {METHODS.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.title} className="p-5">
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon size={22} />
              </div>
              <h3 className="mt-3 text-base font-semibold">{m.title}</h3>
              <p className="text-xs text-muted-foreground">{m.desc}</p>
              <div className="mt-3 border-t pt-3 text-sm">
                <div className="font-medium">{m.price}</div>
                <div className="text-xs text-muted-foreground">{m.free}</div>
              </div>
            </Card>
          );
        })}
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">Vaqtlar</h2>
        <Card className="p-0">
          <div className="grid divide-y md:grid-cols-2 md:divide-y-0 md:divide-x">
            <div className="p-5">
              <div className="flex items-center gap-2 font-semibold">
                <Clock size={16} className="text-primary" /> Toshkent
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                <li>• Standard: 24 soat ichida</li>
                <li>• Express: 3 soat ichida (sotib olgandan keyin)</li>
                <li>• Tushdan oldin buyurtma → kechqurun yetadi</li>
              </ul>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 font-semibold">
                <Map size={16} className="text-primary" /> Viloyatlar
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                <li>• 2-3 ish kuni ichida</li>
                <li>• Express mavjud (toifaga qarab)</li>
                <li>• SMS orqali xabardor bo`lib turasiz</li>
              </ul>
            </div>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">Yetkazib berish hududlari</h2>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-sm"
            >
              <Package size={12} className="text-primary" />
              {r}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
