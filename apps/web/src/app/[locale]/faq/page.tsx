'use client';

import { Card, Input } from '@ecom/ui';
import { ChevronDown, HelpCircle, Search } from 'lucide-react';
import * as React from 'react';

import { PageHero } from '../../../components/static/page-hero';

const FAQ = [
  {
    cat: 'Buyurtma',
    items: [
      {
        q: "Buyurtmamni qanday qilib bekor qilaman?",
        a: "Profil → Buyurtmalarim bo'limidan buyurtmangizni topib, 'Bekor qilish' tugmasini bosing. Agar buyurtma allaqachon jo'natilgan bo'lsa, qo'llab-quvvatlash xizmatiga murojaat qiling.",
      },
      {
        q: "Buyurtmamni qanday kuzataman?",
        a: "Yuqori menyudagi 'Buyurtmamni kuzatish' tugmasini bosib, buyurtma raqamini kiriting. SMS orqali ham xabar olasiz.",
      },
      {
        q: "Buyurtmani o'zgartirish mumkinmi?",
        a: "Faqat buyurtma 'Kutilmoqda' yoki 'Tasdiqlandi' holatida bo'lsa o'zgartirish mumkin. Operator bilan bog'laning.",
      },
    ],
  },
  {
    cat: "To'lov",
    items: [
      {
        q: "Qanday to'lov usullari mavjud?",
        a: "Click, Payme, Uzum Bank, Uzcard, Humo va naqd (kuryer kelganda).",
      },
      {
        q: "To'lovim o'tmadi, nima qilay?",
        a: "Karta mablag'ini va internetingizni tekshiring. Muammo davom etsa, support@example.uz ga yozing.",
      },
    ],
  },
  {
    cat: 'Yetkazib berish',
    items: [
      {
        q: "Yetkazib berish qancha vaqt oladi?",
        a: "Toshkent bo'yicha 24 soat, viloyatlarga 2-3 ish kuni. Express 3 soat ichida (faqat Toshkent).",
      },
      {
        q: "Yetkazib berish bepulmi?",
        a: "500 000 so'mdan ortiq buyurtmalarga uyga yetkazib berish bepul. Olib ketish punktida har doim bepul.",
      },
    ],
  },
  {
    cat: 'Qaytarish',
    items: [
      {
        q: "14 kun shartlari qanday?",
        a: "Mahsulot yetib kelgandan keyin 14 kun ichida hech qanday sababsiz qaytarishingiz mumkin. Asl o'ralma va etiketkalar saqlangan bo'lishi kerak.",
      },
      {
        q: "Pul qachon qaytariladi?",
        a: "Mahsulot omborga yetib kelgandan keyin 3-5 ish kuni ichida karta yoki naqd shaklida qaytariladi.",
      },
    ],
  },
  {
    cat: 'Hisob',
    items: [
      {
        q: "Hisobni qanday yarataman?",
        a: "Yuqori-o'ngdagi 'Kirish' tugmasini bosib, 'Ro'yxatdan o'tish'ni tanlang. Telefon yoki email orqali tasdiqlang.",
      },
      {
        q: "Parolimni unutdim",
        a: "Login sahifasidagi 'Parolni unutdingizmi?' havolasini bosing va emailingizga keladigan ko'rsatmalarga amal qiling.",
      },
    ],
  },
];

export default function FaqPage() {
  const [q, setQ] = React.useState('');
  const filtered = FAQ.map((c) => ({
    ...c,
    items: c.items.filter(
      (it) => it.q.toLowerCase().includes(q.toLowerCase()) || it.a.toLowerCase().includes(q.toLowerCase()),
    ),
  })).filter((c) => c.items.length > 0);

  return (
    <div className="space-y-10">
      <PageHero
        icon={HelpCircle}
        title="Tez-tez so'raladigan savollar"
        description="Sizning savollaringizga javoblar — bir joyda."
        accent="violet"
      />

      <div className="relative mx-auto max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Savol kiriting..."
          className="h-11 pl-9"
        />
      </div>

      <div className="space-y-8">
        {filtered.map((c) => (
          <section key={c.cat}>
            <h2 className="mb-3 text-xl font-bold">{c.cat}</h2>
            <div className="space-y-2">
              {c.items.map((it, i) => (
                <details key={i} className="group rounded-xl border bg-card open:shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-medium">
                    <span>{it.q}</span>
                    <ChevronDown
                      size={16}
                      className="shrink-0 text-muted-foreground transition group-open:rotate-180"
                    />
                  </summary>
                  <div className="px-4 pb-4 pt-1 text-sm leading-relaxed text-muted-foreground">{it.a}</div>
                </details>
              ))}
            </div>
          </section>
        ))}

        {filtered.length === 0 && (
          <Card className="p-10 text-center">
            <p className="text-muted-foreground">Hech narsa topilmadi. Boshqa so&apos;z bilan qidiring.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
