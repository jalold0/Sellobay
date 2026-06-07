'use client';

import { Button, Card, Input, Label, toast } from '@ecom/ui';
import { Crown, Gift, Package, Star } from 'lucide-react';
import * as React from 'react';

import { formatNumber } from '../../../lib/format';

const STATS = [
  { label: 'Buyurtmalar', value: 12, icon: Package, accent: 'bg-sky-100 text-sky-700' },
  { label: 'Sodiqlik balli', value: 1240, icon: Gift, accent: 'bg-amber-100 text-amber-700' },
  { label: 'Sharhlar', value: 4, icon: Star, accent: 'bg-violet-100 text-violet-700' },
  { label: 'Daraja', value: 'Gold', icon: Crown, accent: 'bg-emerald-100 text-emerald-700' },
];

export default function ProfilePage() {
  const [form, setForm] = React.useState({
    firstName: 'Akmal',
    lastName: 'Karimov',
    email: 'akmal@example.uz',
    phone: '+998 90 123 45 67',
    gender: 'MALE',
    birthDate: '1995-03-15',
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Shaxsiy ma&apos;lumotlar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ma&apos;lumotlaringizni yangilang va xavfsizlikni ta&apos;minlang</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-lg ${s.accent}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="text-lg font-bold">
                    {typeof s.value === 'number' ? formatNumber(s.value) : s.value}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-5 md:p-6">
        <h2 className="mb-4 text-base font-semibold">Profil ma&apos;lumotlari</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ism">
            <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </Field>
          <Field label="Familiya">
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Telefon">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Jinsi">
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
            >
              <option value="MALE">Erkak</option>
              <option value="FEMALE">Ayol</option>
              <option value="UNSPECIFIED">Belgilamagan</option>
            </select>
          </Field>
          <Field label="Tug`ilgan kun">
            <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" type="button">
            Bekor qilish
          </Button>
          <Button type="button" onClick={() => toast({ title: 'Saqlandi', variant: 'success' })}>
            Saqlash
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
    </div>
  );
}
