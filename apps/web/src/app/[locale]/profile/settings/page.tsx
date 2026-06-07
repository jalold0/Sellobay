'use client';

import { Button, Card, Input, Label, Switch, toast } from '@ecom/ui';
import { AlertTriangle } from 'lucide-react';

export default function ProfileSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Sozlamalar</h1>

      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Parolni almashtirish</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">Joriy parol</Label>
            <Input type="password" />
          </div>
          <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">Yangi parol</Label>
              <Input type="password" />
            </div>
            <div>
              <Label className="text-xs">Yangi parolni takrorlang</Label>
              <Input type="password" />
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={() => toast({ title: 'Parol yangilandi', variant: 'success' })}>Yangilash</Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Bildirishnomalar</h2>
        <div className="space-y-3">
          {[
            { label: 'Email bildirishnomalar', desc: 'Buyurtmalar, aksiyalar' },
            { label: 'SMS bildirishnomalar', desc: 'Faqat muhimlar' },
            { label: 'Push bildirishnomalar', desc: 'Mobil ilovaga' },
            { label: 'Marketing emaillar', desc: 'Yangi mahsulotlar haqida' },
          ].map((n, i) => (
            <div key={n.label} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">{n.label}</div>
                <div className="text-xs text-muted-foreground">{n.desc}</div>
              </div>
              <Switch defaultChecked={i < 2} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-red-200 p-5">
        <h2 className="mb-2 flex items-center gap-2 font-semibold text-red-700">
          <AlertTriangle size={16} /> Xavfli zona
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Hisobni o&apos;chirish — bu amal ortga qaytarilmaydi. Barcha ma&apos;lumotlaringiz 30 kun ichida butunlay o&apos;chiriladi.
        </p>
        <Button variant="destructive">Hisobni o&apos;chirish</Button>
      </Card>
    </div>
  );
}
