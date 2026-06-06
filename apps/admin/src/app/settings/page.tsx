'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  StatusBadge,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@ecom/ui';
import { Key, Lock, Mail, Plus, ShieldCheck, User2, Webhook } from 'lucide-react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { formatRelative, initials } from '../../lib/format';
import { mockAdminUsers } from '../../lib/mock';

const ROLES = [
  { key: 'SUPER_ADMIN', label: 'Super Admin', desc: 'Barcha huquqlar' },
  { key: 'ADMIN', label: 'Admin', desc: 'Asosiy boshqaruv' },
  { key: 'MARKETING_MANAGER', label: 'Marketing menejeri', desc: 'Kampaniyalar, promo' },
  { key: 'FINANCE_MANAGER', label: 'Moliya menejeri', desc: 'Hisob, payout' },
  { key: 'SUPPORT_AGENT', label: "Qo`llab-quvvatlash", desc: 'Tikets, mijoz' },
  { key: 'WAREHOUSE_STAFF', label: 'Ombor xodimi', desc: 'WMS, inventar' },
];

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Sozlamalar"
        description="Tizim sozlamalari, foydalanuvchilar, rollar va integratsiyalar"
      />

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">
            <User2 className="mr-1 h-3.5 w-3.5" /> Profil
          </TabsTrigger>
          <TabsTrigger value="users">
            <User2 className="mr-1 h-3.5 w-3.5" /> Foydalanuvchilar
          </TabsTrigger>
          <TabsTrigger value="roles">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Rollar
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="mr-1 h-3.5 w-3.5" /> Xavfsizlik
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Webhook className="mr-1 h-3.5 w-3.5" /> Integratsiyalar
          </TabsTrigger>
          <TabsTrigger value="general">Umumiy</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Shaxsiy profil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback>DA</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm">
                  Rasm yuklash
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Ism</Label>
                  <Input defaultValue="Demo" />
                </div>
                <div>
                  <Label>Familiya</Label>
                  <Input defaultValue="Admin" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" defaultValue="admin@example.uz" />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input defaultValue="+998 90 000 00 00" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => toast({ title: 'Saqlandi', variant: 'success' })}>
                  Saqlash
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Admin foydalanuvchilar</CardTitle>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Yangi
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {mockAdminUsers.map((u) => (
                  <li key={u.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={u.avatarUrl} />
                      <AvatarFallback className="text-[10px]">
                        {initials(`${u.firstName} ${u.lastName}`)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">
                        {u.firstName} {u.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                    <div className="hidden gap-1 md:flex">
                      {u.roles.map((r) => (
                        <StatusBadge key={r} tone="info" dot={false}>
                          {r}
                        </StatusBadge>
                      ))}
                    </div>
                    <div className="hidden text-xs text-muted-foreground md:block">
                      {u.lastLoginAt ? formatRelative(u.lastLoginAt) : '—'}
                    </div>
                    <Button variant="ghost" size="sm">
                      Tahrirlash
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles */}
        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle>Rol va huquqlar (RBAC)</CardTitle>
              <p className="text-xs text-muted-foreground">
                Har bir rolga tegishli huquqlarni boshqaring. O`zgarishlar real-time foydalanuvchilarga tatbiq qilinadi.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {ROLES.map((r) => (
                <div
                  key={r.key}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <div className="font-medium">{r.label}</div>
                    <div className="text-xs text-muted-foreground">{r.desc}</div>
                  </div>
                  <Button variant="outline" size="sm">
                    Huquqlar
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Parol almashtirish</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Joriy parol</Label>
                  <Input type="password" />
                </div>
                <div>
                  <Label>Yangi parol</Label>
                  <Input type="password" />
                </div>
                <div>
                  <Label>Yangi parolni takrorlang</Label>
                  <Input type="password" />
                </div>
                <Button>Yangilash</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>2FA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">SMS-OTP</div>
                    <div className="text-xs text-muted-foreground">+998 90 *** ** 00</div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">TOTP (Authenticator)</div>
                    <div className="text-xs text-muted-foreground">Google/Microsoft authenticator</div>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Aktiv sessiyalar</div>
                    <div className="text-xs text-muted-foreground">3 ta qurilma</div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Key className="mr-2 h-4 w-4" /> Boshqarish
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

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
                <div key={i.name} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">{i.name}</div>
                    <div className="text-xs text-muted-foreground">{i.desc}</div>
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
                <Select defaultValue="uz">
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
                <Select defaultValue="UZS">
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
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Maintenance rejimi</div>
                  <div className="text-xs text-muted-foreground">Sayt vaqtinchalik o`chiriladi</div>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Email bildirishnomalar</div>
                  <div className="text-xs text-muted-foreground">Yangi buyurtma, payout</div>
                </div>
                <Switch defaultChecked />
              </div>
              <Button onClick={() => toast({ title: 'Saqlandi', variant: 'success' })}>
                <Mail className="mr-2 h-4 w-4" /> Saqlash
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
