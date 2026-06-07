import { Card } from '@ecom/ui';
import { Check, CircleDot, MessageCircle, Package, Undo2, X } from 'lucide-react';

import { PageHero } from '../../../components/static/page-hero';

export const metadata = { title: "Qaytarish va to'lash" };

const STEPS = [
  { icon: MessageCircle, title: 'So`rov yuboring', desc: '14 kun ichida tikets oching yoki app orqali bildiring' },
  { icon: Package, title: 'Mahsulotni topshiring', desc: 'Kuryer oladi yoki pickup punktiga olib boring' },
  { icon: Check, title: "Pul qaytariladi", desc: '3-5 ish kuni ichida kartangizga yoki naqd' },
];

const CAN_RETURN = [
  'Kiyim-kechak — etiketka va o`ralma bilan',
  "Poyabzal — kiyilmagan, asl qutida",
  'Aksessuarlar — buzilmagan holatda',
  'Texnika — qutiyu hujjatlar bilan',
];

const CANT_RETURN = [
  'Atirlar — o`ralma ochilgan',
  'Kosmetika — sinov uchun ochilgan',
  'Ichki kiyim, paypoq',
  'Sovg`a sertifikatlari',
];

export default function ReturnsPage() {
  return (
    <div className="space-y-10">
      <PageHero
        icon={Undo2}
        title="14 kun ichida qaytarish"
        description="Hech qanday savol-javobsiz. Mahsulot yoqmasa — orqaga qaytaring va to'liq pul qaytib oling."
        accent="emerald"
      />

      <section>
        <h2 className="mb-4 text-2xl font-bold">Qanday qaytarish</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={i} className="p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground font-bold">
                    {i + 1}
                  </div>
                  <Icon size={20} className="text-muted-foreground" />
                </div>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-emerald-700">
            <Check size={18} />
            <h3 className="text-base font-semibold">Qaytarish mumkin</h3>
          </div>
          <ul className="space-y-2 text-sm">
            {CAN_RETURN.map((r) => (
              <li key={r} className="flex items-start gap-2">
                <CircleDot size={12} className="mt-1 shrink-0 text-emerald-600" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-red-700">
            <X size={18} />
            <h3 className="text-base font-semibold">Qaytarish mumkin emas</h3>
          </div>
          <ul className="space-y-2 text-sm">
            {CANT_RETURN.map((r) => (
              <li key={r} className="flex items-start gap-2">
                <CircleDot size={12} className="mt-1 shrink-0 text-red-600" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
