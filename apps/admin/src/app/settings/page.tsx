'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ecom/ui';
import { Webhook } from 'lucide-react';
import * as React from 'react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Sozlamalar"
        description="Integratsiyalar va umumiy sozlamalar. Xodimlar va rollar — «Xodimlar» bo'limida, shaxsiy profil va parol — «Hisobim»da."
      />

      <Tabs defaultValue="integrations">
        <TabsList className="flex-wrap">
          <TabsTrigger value="integrations">
            <Webhook className="mr-1 h-3.5 w-3.5" /> Integratsiyalar
          </TabsTrigger>
          <TabsTrigger value="general">Umumiy</TabsTrigger>
        </TabsList>

        {/* Integrations */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Integratsiyalar</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {[
                { name: 'Click', status: 'connected', desc: 'To`lov tizimi' },
                { name: 'Payme', status: 'connected', desc: 'To`lov tizimi' },
                { name: 'Uzum Bank', status: 'pending', desc: 'To`lov tizimi' },
                { name: 'SendPulse', status: 'connected', desc: 'Email & SMS' },
                { name: 'Telegram Bot', status: 'connected', desc: 'Mijoz xabarlari' },
                { name: 'Sentry', status: 'connected', desc: 'Xato monitoring' },
              ].map((i) => (
                <div
                  key={i.name}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <div className="font-medium">{i.name}</div>
                    <div className="text-muted-foreground text-xs">{i.desc}</div>
                  </div>
                  {i.status === 'connected' ? (
                    <StatusBadge tone="success">Ulangan</StatusBadge>
                  ) : (
                    <StatusBadge tone="warning">Kutilmoqda</StatusBadge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* General */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Umumiy sozlamalar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Asosiy til</Label>
                <Select defaultValue="uz" disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uz">O`zbek</SelectItem>
                    <SelectItem value="ru">Русский</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Asosiy valyuta</Label>
                <Select defaultValue="UZS" disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UZS">UZS — So`m</SelectItem>
                    <SelectItem value="USD">USD — Dollar</SelectItem>
                    <SelectItem value="EUR">EUR — Evro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3 opacity-60">
                <div>
                  <div className="text-sm font-medium">Maintenance rejimi</div>
                  <div className="text-muted-foreground text-xs">Sayt vaqtinchalik o`chiriladi</div>
                </div>
                <Switch disabled />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3 opacity-60">
                <div>
                  <div className="text-sm font-medium">Email bildirishnomalar</div>
                  <div className="text-muted-foreground text-xs">Yangi buyurtma, payout</div>
                </div>
                <Switch disabled />
              </div>
              {/*
                Bu bo'lim uchun backend hali yo'q. Ilgari "Saqlash" tugmasi
                "Saqlandi" deb yozardi — admin maintenance rejimini yoqdim deb
                o'ylardi, sayt esa ishlab turardi. Yolg'on tasdiq berish
                o'rniga boshqaruvlar o'chirilgan va sabab ochiq aytilgan.
              */}
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                Bu bo`lim hali bazaga ulanmagan — sozlamalar saqlanmaydi. Til va valyuta hozircha
                kodda belgilanadi. Kargo tarifi va kurs uchun{' '}
                <span className="font-medium">Sozlamalar → Global</span> bo`limidan foydalaning.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
