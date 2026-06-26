import { Award, Truck, Users, Package } from 'lucide-react';

interface Metric {
  icon: typeof Truck;
  value: string;
  label: string;
  description: string;
}

const METRICS: Metric[] = [
  {
    icon: Users,
    value: '50,000+',
    label: 'Faol sotuvchilar',
    description: "O'zbekistondan",
  },
  {
    icon: Package,
    value: '2M+',
    label: 'Mahsulotlar',
    description: '350+ kategoriya',
  },
  {
    icon: Truck,
    value: '24 soat',
    label: 'Tezkor yetkazish',
    description: "Toshkent bo'ylab",
  },
  {
    icon: Award,
    value: '99.2%',
    label: 'Mijozlar mamnun',
    description: '4.8/5 reyting',
  },
];

export function TrustStrip() {
  return (
    <section className="border-border bg-card/50 border-y">
      <div className="grid grid-cols-2 md:grid-cols-4">
        {METRICS.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className={`flex items-center gap-3 px-4 py-5 md:px-6 md:py-7 ${
                idx < METRICS.length - 1 ? 'md:border-border md:border-r' : ''
              } ${idx % 2 === 0 ? 'border-border border-r md:border-r' : ''} ${
                idx < 2 ? 'border-border border-b md:border-b-0' : ''
              }`}
            >
              <div className="bg-brand-bordeaux/10 grid h-12 w-12 shrink-0 place-items-center rounded-xl md:h-14 md:w-14">
                <Icon className="text-brand-bordeaux h-6 w-6 md:h-7 md:w-7" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="text-foreground text-xl font-extrabold leading-none md:text-2xl">
                  {m.value}
                </div>
                <div className="text-foreground mt-1 text-xs font-semibold md:text-sm">
                  {m.label}
                </div>
                <div className="text-muted-foreground hidden text-[11px] sm:block">
                  {m.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
