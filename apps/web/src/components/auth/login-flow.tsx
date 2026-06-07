'use client';

import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@ecom/ui';
import { ArrowLeft, Loader2, Lock, Mail, Phone, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

type OtpStage = 'phone' | 'code';

export function LoginFlow() {
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardContent className="space-y-5 p-6 md:p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Tizimga kirish</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Xush kelibsiz! Quyidagi usullardan birini tanlang.
            </p>
          </div>

          <Tabs defaultValue="phone">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="phone">
                <Phone size={14} className="mr-1" /> Telefon
              </TabsTrigger>
              <TabsTrigger value="email">
                <Mail size={14} className="mr-1" /> Email
              </TabsTrigger>
            </TabsList>

            <TabsContent value="phone">
              <PhoneOtpForm />
            </TabsContent>
            <TabsContent value="email">
              <EmailForm />
            </TabsContent>
          </Tabs>

          <div className="relative">
            <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
            <div className="relative mx-auto w-fit bg-card px-3 text-xs text-muted-foreground">
              yoki
            </div>
          </div>

          <div className="grid gap-2">
            <OAuthButton provider="google" />
            <OAuthButton provider="telegram" />
            <OAuthButton provider="apple" />
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Davom etib, siz{' '}
            <Link href="/terms" className="text-primary hover:underline">
              Foydalanish shartlari
            </Link>{' '}
            va{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              Maxfiylik siyosati
            </Link>
            ga rozilik bildirasiz.
          </p>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Hisobingiz yo&apos;qmi?{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Ro&apos;yxatdan o&apos;tish
        </Link>
      </p>
    </div>
  );
}

function PhoneOtpForm() {
  const router = useRouter();
  const [stage, setStage] = React.useState<OtpStage>('phone');
  const [phone, setPhone] = React.useState('+998 ');
  const [code, setCode] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(0);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendCode = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 12) {
      toast({ title: 'Telefon raqamini to`liq kiriting', variant: 'warning' });
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    setStage('code');
    setResendIn(60);
    toast({ title: 'Kod yuborildi', description: phone, variant: 'success' });
  };

  const verify = async () => {
    if (code.length < 4) {
      toast({ title: '4–6 raqamli kodni kiriting', variant: 'warning' });
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));
    setSubmitting(false);
    toast({ title: 'Tizimga kirdingiz', variant: 'success' });
    router.push('/profile');
  };

  if (stage === 'phone') {
    return (
      <div className="space-y-3 pt-2">
        <div>
          <Label className="text-xs">Telefon raqami</Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
              className="pl-9"
              autoComplete="tel"
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            SMS orqali tasdiqlash kodi yuboramiz
          </p>
        </div>
        <Button onClick={sendCode} disabled={submitting} className="w-full">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Kod yuborish
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      <button
        type="button"
        onClick={() => setStage('phone')}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={12} /> Raqamni o&apos;zgartirish
      </button>
      <div>
        <Label className="text-xs">Kodingizni kiriting</Label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="------"
          inputMode="numeric"
          maxLength={6}
          className="text-center text-lg tracking-[0.5em]"
          autoFocus
        />
        <p className="mt-1 text-[11px] text-muted-foreground">{phone} raqamiga yuborildi</p>
      </div>
      <Button onClick={verify} disabled={submitting} className="w-full">
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Tasdiqlash
      </Button>
      <button
        type="button"
        onClick={() => {
          if (resendIn === 0) {
            setResendIn(60);
            toast({ title: 'Yangi kod yuborildi', variant: 'success' });
          }
        }}
        disabled={resendIn > 0}
        className="block w-full text-center text-xs text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {resendIn > 0 ? `Qayta yuborish (${resendIn}s)` : 'Kodni qayta yuborish'}
      </button>
    </div>
  );
}

function EmailForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    toast({ title: 'Tizimga kirdingiz', variant: 'success' });
    router.push('/profile');
  };

  return (
    <form onSubmit={submit} className="space-y-3 pt-2">
      <div>
        <Label className="text-xs">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9"
            placeholder="example@mail.uz"
            autoComplete="email"
            required
          />
        </div>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <Label className="text-xs">Parol</Label>
          <Link href="/forgot-password" className="text-[11px] text-primary hover:underline">
            Parolni unutdingizmi?
          </Link>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>
      </div>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Kirish
      </Button>
      <div className="rounded-md bg-secondary/40 p-2 text-[11px] text-muted-foreground">
        <ShieldCheck size={11} className="mr-1 inline text-emerald-600" />
        Parolingiz argon2 bilan shifrlanadi — biz uni hech qachon ko&apos;rmaymiz.
      </div>
    </form>
  );
}

const OAUTH_CFG = {
  google: { label: 'Google bilan kirish', emoji: '🔵' },
  telegram: { label: 'Telegram bilan kirish', emoji: '💬' },
  apple: { label: 'Apple bilan kirish', emoji: '' },
} as const;

function OAuthButton({ provider }: { provider: keyof typeof OAUTH_CFG }) {
  const cfg = OAUTH_CFG[provider];
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full justify-start gap-3"
      onClick={() => toast({ title: `${cfg.label} — tez orada`, duration: 2000 })}
    >
      <span className="text-base">{cfg.emoji}</span>
      <span>{cfg.label}</span>
    </Button>
  );
}
