'use client';

import { Button, Card, Input, Label, Skeleton, toast } from '@ecom/ui';
import { Crown, Gift, Package, Star } from 'lucide-react';
import * as React from 'react';

import { formatNumber } from '../../../lib/format';
import { me, updateProfile, type AuthUser } from '../../../lib/auth/client';

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: 'MALE' | 'FEMALE' | 'UNSPECIFIED';
  birthDate: string;
}

function userToForm(u: AuthUser): ProfileForm {
  return {
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    email: u.email ?? '',
    phone: u.phone ?? '',
    gender: (u.gender as ProfileForm['gender']) ?? 'UNSPECIFIED',
    birthDate:
      u.birthDate instanceof Date
        ? u.birthDate.toISOString().slice(0, 10)
        : typeof u.birthDate === 'string'
          ? u.birthDate.slice(0, 10)
          : '',
  };
}

export default function ProfilePage() {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [form, setForm] = React.useState<ProfileForm | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    me().then((res) => {
      if (res.success) {
        setUser(res.data.user);
        setForm(userToForm(res.data.user));
      }
      setLoading(false);
    });
  }, []);

  const reset = () => {
    if (user) setForm(userToForm(user));
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const res = await updateProfile({
      firstName: form.firstName.trim() || null,
      lastName: form.lastName.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      gender: form.gender,
      birthDate: form.birthDate || null,
    });
    setSaving(false);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    setUser(res.data.user);
    setForm(userToForm(res.data.user));
    toast({ title: 'Saqlandi', variant: 'success' });
  };

  const stats = [
    { label: 'Buyurtmalar', value: 0, icon: Package, accent: 'bg-sky-100 text-sky-700' },
    {
      label: 'Sodiqlik balli',
      value: user?.loyaltyPoints ?? 0,
      icon: Gift,
      accent: 'bg-amber-100 text-amber-700',
    },
    { label: 'Sharhlar', value: 0, icon: Star, accent: 'bg-violet-100 text-violet-700' },
    { label: 'Daraja', value: 'Bronze', icon: Crown, accent: 'bg-emerald-100 text-emerald-700' },
  ];

  if (loading || !form) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Shaxsiy ma&apos;lumotlar</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Ma&apos;lumotlaringizni yangilang va xavfsizlikni ta&apos;minlang
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-lg ${s.accent}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">{s.label}</div>
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
            <Input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </Field>
          <Field label="Familiya">
            <Input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Telefon">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Jinsi">
            <select
              value={form.gender}
              onChange={(e) =>
                setForm({ ...form, gender: e.target.value as ProfileForm['gender'] })
              }
              className="border-input bg-background focus:border-primary h-10 w-full rounded-md border px-3 text-sm outline-none"
            >
              <option value="MALE">Erkak</option>
              <option value="FEMALE">Ayol</option>
              <option value="UNSPECIFIED">Belgilamagan</option>
            </select>
          </Field>
          <Field label="Tug`ilgan kun">
            <Input
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={reset} disabled={saving}>
            Bekor qilish
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
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
