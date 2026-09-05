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
import { Key, Lock, Plus, ShieldCheck, User2, Webhook } from 'lucide-react';
import * as React from 'react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import {
  listAdminUsers,
  meAdmin,
  updateAdminProfile,
  type AdminStaffUser,
} from '../../lib/auth/client';
import { formatRelative, initials } from '../../lib/format';

const ROLES = [
  { key: 'SUPER_ADMIN', label: 'Super Admin', desc: 'Barcha huquqlar' },
  { key: 'ADMIN', label: 'Admin', desc: 'Asosiy boshqaruv' },
  { key: 'MARKETING_MANAGER', label: 'Marketing menejeri', desc: 'Kampaniyalar, promo' },
  { key: 'FINANCE_MANAGER', label: 'Moliya menejeri', desc: 'Hisob, payout' },
  { key: 'SUPPORT_AGENT', label: 'Qo`llab-quvvatlash', desc: 'Tikets, mijoz' },
  { key: 'WAREHOUSE_STAFF', label: 'Ombor xodimi', desc: 'WMS, inventar' },
];

export default function AdminSettingsPage() {
  // Profil HAQIQIY sessiyadan yuklanadi. Ilgari bu yerda qotib qolgan
  // "Demo Admin / admin@example.uz" turardi va "Saqlash" hech nima qilmasdi.
  const [profile, setProfile] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [loadingProfile, setLoadingProfile] = React.useState(true);
  const [savingProfile, setSavingProfile] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    void meAdmin().then((res) => {
      if (!alive) return;
      if (res.success) {
        const u = res.data.user;
        setProfile({
          firstName: u.firstName ?? '',
          lastName: u.lastName ?? '',
          email: u.email ?? '',
          phone: u.phone ?? '',
        });
      }
      setLoadingProfile(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Panel xodimlari HAQIQIY bazadan. Ilgari bu yerda to'qima ismlar va
  // rollar ko'rsatilardi — admin kimda qanday huquq borligini bilish uchun
  // kirsa, haqiqatga aloqasi yo'q ro'yxatni ko'rardi.
  const [staff, setStaff] = React.useState<AdminStaffUser[]>([]);
  const [loadingStaff, setLoadingStaff] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    void listAdminUsers().then((res) => {
      if (!alive) return;
      if (res.success) setStaff(res.data.items);
      setLoadingStaff(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const onSaveProfile = async () => {
    if (savingProfile) return;
    setSavingProfile(true);
    const res = await updateAdminProfile({
      firstName: profile.firstName.trim() || null,
      lastName: profile.lastName.trim() || null,
      email: profile.email.trim() || null,
      phone: profile.phone.trim() || null,
    });
    setSavingProfile(false);
    // Muvaffaqiyat xabari FAQAT server tasdiqlagach.
    if (res.success) {
      toast({ title: 'Profil saqlandi', variant: 'success' });
    } else {
      toast({ title: res.error.message, variant: 'destructive' });
    }
  };

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
                  <AvatarFallback>
                    {initials(`${profile.firstName} ${profile.lastName}`.trim()) || '—'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">Ism</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    disabled={loadingProfile}
                    onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Familiya</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    disabled={loadingProfile}
                    onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled={loadingProfile}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    disabled={loadingProfile}
                    placeholder="+998XXXXXXXXX"
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={onSaveProfile} disabled={loadingProfile || savingProfile}>
                  {savingProfile ? 'Saqlanmoqda...' : 'Saqlash'}
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
              {loadingStaff ? (
                <div className="text-muted-foreground p-10 text-center text-sm">Yuklanmoqda...</div>
              ) : staff.length === 0 ? (
                <div className="text-muted-foreground p-10 text-center text-sm">
                  Panelga kirish huquqi bor xodim topilmadi.
                </div>
              ) : (
                <ul className="divide-y">
                  {staff.map((u) => (
                    <li key={u.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={u.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {initials(`${u.firstName} ${u.lastName}`.trim()) || '—'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">
                          {`${u.firstName} ${u.lastName}`.trim() || u.email || u.phone}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {u.email ?? u.phone ?? '—'}
                        </div>
                      </div>
                      <div className="hidden gap-1 md:flex">
                        {u.roles.map((r) => (
                          <StatusBadge key={r} tone="info" dot={false}>
                            {r}
                          </StatusBadge>
                        ))}
                      </div>
                      <div className="text-muted-foreground hidden text-xs md:block">
                        {u.lastLoginAt ? formatRelative(u.lastLoginAt) : 'hech qachon'}
                      </div>
                      {/*
                        "Tahrirlash" tugmasi olib tashlandi — u onClick'siz edi
                        va rol o'zgartirish API'si hali yo'q.
                      */}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles */}
        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle>Rol va huquqlar (RBAC)</CardTitle>
              <p className="text-muted-foreground text-xs">
                Har bir rolga tegishli huquqlarni boshqaring. O`zgarishlar real-time
                foydalanuvchilarga tatbiq qilinadi.
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
                    <div className="text-muted-foreground text-xs">{r.desc}</div>
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
                    <div className="text-muted-foreground text-xs">+998 90 *** ** 00</div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">TOTP (Authenticator)</div>
                    <div className="text-muted-foreground text-xs">
                      Google/Microsoft authenticator
                    </div>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Aktiv sessiyalar</div>
                    <div className="text-muted-foreground text-xs">3 ta qurilma</div>
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
