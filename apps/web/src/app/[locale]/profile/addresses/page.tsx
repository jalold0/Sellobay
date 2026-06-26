'use client';

import { Button, Card, EmptyState, Input, Label, Skeleton, toast } from '@ecom/ui';
import { Briefcase, Home, MapPin, Plus, Trash2, X } from 'lucide-react';
import * as React from 'react';

interface Address {
  id: string;
  label: string | null;
  type: 'HOME' | 'WORK' | 'PICKUP' | 'OTHER';
  recipientName: string;
  phone: string;
  region: string;
  city: string;
  district: string | null;
  street: string;
  building: string | null;
  apartment: string | null;
  landmark: string | null;
  isDefault: boolean;
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

const TYPE_ICON = {
  HOME: Home,
  WORK: Briefcase,
  PICKUP: MapPin,
  OTHER: MapPin,
} as const;

const TYPE_LABEL = {
  HOME: 'Uy',
  WORK: 'Ish',
  PICKUP: 'Olib ketish',
  OTHER: 'Boshqa',
} as const;

const EMPTY_FORM = {
  label: '',
  type: 'HOME' as Address['type'],
  recipientName: '',
  phone: '+998 ',
  region: 'Toshkent',
  city: '',
  district: '',
  street: '',
  building: '',
  apartment: '',
  landmark: '',
  isDefault: false,
};

export default function AddressesPage() {
  const [items, setItems] = React.useState<Address[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_FORM);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/addresses', { credentials: 'same-origin' });
      const json = (await res.json()) as ApiResult<{ items: Address[] }>;
      if (json.success && json.data) setItems(json.data.items);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.recipientName.trim() ||
      !form.phone.trim() ||
      !form.city.trim() ||
      !form.street.trim()
    ) {
      toast({ title: "Asosiy maydonlarni to'ldiring", variant: 'warning' });
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(form),
    });
    const json = (await res.json()) as ApiResult<{ address: Address }>;
    setSubmitting(false);
    if (!json.success) {
      toast({ title: json.error?.message ?? 'Saqlanmadi', variant: 'destructive' });
      return;
    }
    toast({ title: "Manzil qo'shildi", variant: 'success' });
    setForm(EMPTY_FORM);
    setShowForm(false);
    void load();
  };

  const onDelete = async (id: string, label: string) => {
    if (!confirm(`"${label}" manzilini o'chirasizmi?`)) return;
    const res = await fetch(`/api/addresses/${id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    const json = (await res.json()) as ApiResult<{ deleted: true }>;
    if (json.success) {
      toast({ title: "Manzil o'chirildi", variant: 'success' });
      setItems((p) => p.filter((a) => a.id !== id));
    } else {
      toast({ title: json.error?.message ?? 'Xato', variant: 'destructive' });
    }
  };

  const onMakeDefault = async (id: string) => {
    const res = await fetch(`/api/addresses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ isDefault: true }),
    });
    const json = (await res.json()) as ApiResult<{ address: Address }>;
    if (json.success) {
      toast({ title: 'Asosiy manzil yangilandi', variant: 'success' });
      void load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Manzillar</h1>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={16} className="mr-1" /> : <Plus size={16} className="mr-1" />}
          {showForm ? 'Bekor qilish' : 'Yangi manzil'}
        </Button>
      </div>

      {showForm ? (
        <Card className="p-5">
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Yorliq</Label>
              <Input
                value={form.label ?? ''}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Uy, Ish..."
              />
            </div>
            <div>
              <Label className="text-xs">Turi</Label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as Address['type'] })}
                className="border-input bg-background focus:border-primary h-10 w-full rounded-md border px-3 text-sm outline-none"
              >
                <option value="HOME">Uy</option>
                <option value="WORK">Ish</option>
                <option value="PICKUP">Olib ketish</option>
                <option value="OTHER">Boshqa</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Qabul qiluvchi*</Label>
              <Input
                value={form.recipientName}
                onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label className="text-xs">Telefon*</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+998 90 ..."
                required
              />
            </div>
            <div>
              <Label className="text-xs">Viloyat</Label>
              <Input
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="Toshkent"
              />
            </div>
            <div>
              <Label className="text-xs">Shahar*</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Ko&apos;cha, uy*</Label>
              <Input
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                placeholder="Mustaqillik ko'chasi 12"
                required
              />
            </div>
            <div>
              <Label className="text-xs">Kvartira/podyezd</Label>
              <Input
                value={form.apartment ?? ''}
                onChange={(e) => setForm({ ...form, apartment: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Mo&apos;ljal</Label>
              <Input
                value={form.landmark ?? ''}
                onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                placeholder="Park yonida"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="h-4 w-4"
                />
                Asosiy manzil qilib belgilash
              </label>
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={MapPin}
            title="Hali manzillar yo'q"
            description="Tezroq yetkazib berish uchun bir nechta manzil qo'shing"
            action={
              <Button onClick={() => setShowForm(true)}>
                <Plus size={16} className="mr-1" /> Manzil qo&apos;shish
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            const Icon = TYPE_ICON[a.type];
            const full = [a.region, a.city, a.district, a.street, a.building, a.apartment]
              .filter(Boolean)
              .join(', ');
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-brand-bordeaux/10 grid h-10 w-10 shrink-0 place-items-center rounded-lg">
                    <Icon size={18} className="text-brand-bordeaux" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{a.label || TYPE_LABEL[a.type]}</span>
                      {a.isDefault ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                          Asosiy
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-sm">
                      {a.recipientName} · {a.phone}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-xs">{full}</div>
                    {a.landmark ? (
                      <div className="text-muted-foreground mt-1 text-[11px] italic">
                        Mo&apos;ljal: {a.landmark}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    {!a.isDefault ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMakeDefault(a.id)}
                        className="text-xs"
                      >
                        Asosiy
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(a.id, a.label || TYPE_LABEL[a.type])}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
