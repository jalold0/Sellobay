'use client';

// /account — har bir xodimning shaxsiy sahifasi: profil va parol (ADR 0019).
// Sozlamalar (/settings) endi faqat tizim sozlamalari — u admin'lar uchun; profil va parol esa
// har kimga kerak, shuning uchun alohida sahifa va u har qanday rol uchun ochiq.
//
// Vaqtinchalik parol bilan kirgan xodim shu yerga yo'naltiriladi va parolini almashtirmaguncha
// panelning boshqa joyiga o'ta olmaydi (API'lar ham PASSWORD_CHANGE_REQUIRED qaytaradi).

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  PageHeader,
  PasswordInput,
  toast,
} from '@ecom/ui';
import { KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { changeAdminPassword, updateAdminProfile } from '../../lib/auth/client';
import { ROLE_LABELS, STAFF_ROLES, homeFor } from '../../lib/permissions';
import { useSession } from '../../providers/session-provider';

export default function AccountPage() {
  const router = useRouter();
  const { session, isLoading, reload } = useSession();
  const forced = session?.mustChangePassword === true;

  const [profile, setProfile] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  React.useEffect(() => {
    if (!session) return;
    setProfile({
      firstName: session.firstName ?? '',
      lastName: session.lastName ?? '',
      email: session.email ?? '',
      phone: session.phone ?? '',
    });
  }, [session]);
  const [savingProfile, setSavingProfile] = React.useState(false);

  const onSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const res = await updateAdminProfile({
      // Bo'sh ism/email yuborilmaydi (o'zgarmaydi): email — kirish logini.
      firstName: profile.firstName.trim() || undefined,
      lastName: profile.lastName.trim() || undefined,
      email: profile.email.trim() || undefined,
      phone: profile.phone.trim() || null,
    });
    setSavingProfile(false);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    await reload();
    toast({ title: 'Profil saqlandi', variant: 'success' });
  };

  const [pw, setPw] = React.useState({ current: '', next: '', repeat: '' });
  const [savingPw, setSavingPw] = React.useState(false);

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next !== pw.repeat) {
      toast({ title: 'Yangi parollar bir xil emas — qayta tering', variant: 'destructive' });
      return;
    }
    setSavingPw(true);
    const res = await changeAdminPassword(pw.current, pw.next);
    setSavingPw(false);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    setPw({ current: '', next: '', repeat: '' });
    toast({
      title: 'Parol almashtirildi',
      description:
        res.data.otherSessionsSignedOut > 0
          ? `Boshqa qurilmalardagi ${res.data.otherSessionsSignedOut} ta sessiya yopildi`
          : undefined,
      variant: 'success',
    });
    if (forced) {
      await reload();
      router.replace(homeFor(session?.roles));
    }
  };

  const roleNames = STAFF_ROLES.filter((r) => session?.roles.includes(r)).map(
    (r) => ROLE_LABELS[r],
  );

  const passwordCard = (
    <Card>
      <CardHeader>
        <CardTitle>{forced ? "O'z parolingizni qo'ying" : 'Parolni almashtirish'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onChangePassword} className="space-y-3">
          <div>
            <Label htmlFor="pw-current">{forced ? 'Vaqtinchalik parol' : 'Joriy parol'}</Label>
            <PasswordInput
              id="pw-current"
              autoComplete="current-password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="pw-next">Yangi parol</Label>
            <PasswordInput
              id="pw-next"
              autoComplete="new-password"
              minLength={8}
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
              aria-describedby="pw-next-hint"
              required
            />
            <p id="pw-next-hint" className="text-muted-foreground mt-1 text-xs">
              Kamida 8 ta belgi, harf va raqam aralash
            </p>
          </div>
          <div>
            <Label htmlFor="pw-repeat">Yangi parolni takrorlang</Label>
            <PasswordInput
              id="pw-repeat"
              autoComplete="new-password"
              value={pw.repeat}
              onChange={(e) => setPw({ ...pw, repeat: e.target.value })}
              required
            />
          </div>
          <Button type="submit" disabled={savingPw}>
            {savingPw
              ? 'Saqlanmoqda…'
              : forced
                ? 'Parolni saqlash va davom etish'
                : 'Parolni almashtirish'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return <div className="text-muted-foreground p-10 text-center text-sm">Yuklanmoqda…</div>;
  }

  if (forced) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <PageHeader title="Xush kelibsiz" description={roleNames.join(', ')} />
        <Alert>
          <KeyRound className="h-4 w-4" />
          <AlertTitle>Avval parolingizni almashtiring</AlertTitle>
          <AlertDescription>
            Sizga berilgan parol vaqtinchalik. Faqat o&apos;zingiz biladigan yangi parol
            qo&apos;ysangiz, panel ochiladi.
          </AlertDescription>
        </Alert>
        {passwordCard}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Hisobim" description={roleNames.join(', ') || undefined} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Shaxsiy ma&apos;lumot</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSaveProfile} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">Ism</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Familiya</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email (kirish uchun)</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  placeholder="+998XXXXXXXXX"
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? 'Saqlanmoqda…' : 'Profilni saqlash'}
              </Button>
            </form>
          </CardContent>
        </Card>
        {passwordCard}
      </div>
    </div>
  );
}
