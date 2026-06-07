import { Card } from '@ecom/ui';
import { Building2, Globe, Heart, Target, Users } from 'lucide-react';

import { PageHero } from '../../../components/static/page-hero';

export const metadata = { title: 'Biz haqimizda' };

const STATS = [
  { label: "Faol mijozlar", value: '120 000+' },
  { label: 'Sotuvchilar', value: '850+' },
  { label: 'Mahsulot turlari', value: '50 000+' },
  { label: 'Shaharlar', value: '14' },
];

const VALUES = [
  { icon: Target, title: 'Aniq maqsad', text: 'Eng yaxshi narx — eng yuqori sifat.' },
  { icon: Users, title: 'Mijoz birinchi', text: 'Har bir buyurtma — bizning vazifamiz.' },
  { icon: Heart, title: 'Vatanga mehr', text: 'O`zbekistonda yaratilgan, o`zbekona qadriyatlar.' },
  { icon: Globe, title: 'Global standartlar', text: 'Xalqaro tajriba va texnologiya.' },
];

export default function AboutPage() {
  return (
    <div className="space-y-10">
      <PageHero
        icon={Building2}
        title="Biz haqimizda"
        description="O'zbekistondagi eng yirik onlayn savdo ekosistemasini quryapmiz — minglab brendlar, millionlab mahsulot, butun mamlakatga yetkazib berish."
        accent="primary"
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {STATS.map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <div className="text-2xl font-bold md:text-3xl">{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="prose prose-sm max-w-none">
          <h2 className="text-2xl font-bold">Bizning hikoyamiz</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            E-Commerce 2026-yilda O&apos;zbekiston mijozlariga onlayn savdo qulayligini olib kelish maqsadida tashkil etildi.
            Birinchi yiliyoq biz minglab sotuvchilar va yuz minglab mijozlarga ega bo&apos;ldik.
          </p>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Hozir biz kiyim-kechak, poyabzal, atirlar, kosmetika va aksessuarlar bo&apos;yicha eng katta katalogga egamiz —
            kelajakda esa elektronika, uy-ro&apos;zg&apos;or buyumlari, oziq-ovqat va xizmatlarni ham qo&apos;shamiz.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {VALUES.map((v) => {
            const Icon = v.icon;
            return (
              <Card key={v.title} className="p-4">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon size={18} />
                </div>
                <div className="mt-3 font-semibold">{v.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{v.text}</div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
