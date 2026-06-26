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
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { loginWithEmail, sendOtp, verifyOtp } from '@/lib/auth/client';

type OtpStage = 'phone' | 'code';

function useNextHref(): string {
  const params = useSearchParams();
  const next = params.get('next');
  return next && next.startsWith('/') ? next : '/profile';
}

export function LoginFlow() {
  const t = useTranslations('auth');
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardContent className="space-y-5 p-6 md:p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">{t('loginTitle')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t('loginWelcome')}</p>
          </div>

          <Tabs defaultValue="phone">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="phone">
                <Phone size={14} className="mr-1" /> {t('tabPhone')}
              </TabsTrigger>
              <TabsTrigger value="email">
                <Mail size={14} className="mr-1" /> {t('tabEmail')}
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
            <div className="bg-border absolute inset-x-0 top-1/2 h-px" />
            <div className="bg-card text-muted-foreground relative mx-auto w-fit px-3 text-xs">
              {t('or')}
            </div>
          </div>

          <div className="grid gap-2">
            <OAuthButton provider="google" />
            <OAuthButton provider="telegram" />
            <OAuthButton provider="apple" />
          </div>

          <p className="text-muted-foreground text-center text-xs">
            {t('termsAgree')}{' '}
            <Link href="/terms" className="text-primary hover:underline">
              {t('termsLink')}
            </Link>{' '}
            {t('and')}{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              {t('privacyLink')}
            </Link>
            {t('termsSuffix')}
          </p>
        </CardContent>
      </Card>

      <p className="text-muted-foreground mt-4 text-center text-sm">
        {t('noAccount')}{' '}
        <Link href="/register" className="text-primary font-medium hover:underline">
          {t('registerLink')}
        </Link>
      </p>
    </div>
  );
}

function PhoneOtpForm() {
  const router = useRouter();
  const t = useTranslations('auth');
  const nextHref = useNextHref();
  const [stage, setStage] = React.useState<OtpStage>('phone');
  const [phone, setPhone] = React.useState('+998 ');
  const [code, setCode] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(0);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const sendCode = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 12) {
      toast({ title: t('phoneInvalid'), variant: 'warning' });
      return;
    }
    setSubmitting(true);
    const result = await sendOtp(phone);
    setSubmitting(false);
    if (!result.success) {
      toast({ title: result.error.message, variant: 'destructive' });
      return;
    }
    setStage('code');
    setResendIn(60);
    toast({ title: t('codeSent'), description: phone, variant: 'success' });
  };

  const verify = async () => {
    if (code.length < 4) {
      toast({ title: t('codeInvalid'), variant: 'warning' });
      return;
    }
    setSubmitting(true);
    const result = await verifyOtp(phone, code);
    setSubmitting(false);
    if (!result.success) {
      toast({ title: result.error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('loginSuccess'), variant: 'success' });
    router.push(nextHref);
    router.refresh();
  };

  if (stage === 'phone') {
    return (
      <div className="space-y-3 pt-2">
        <div>
          <Label className="text-xs">{t('phone')}</Label>
          <div className="relative">
            <Phone className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('phonePlaceholder')}
              className="pl-9"
              autoComplete="tel"
            />
          </div>
          <p className="text-muted-foreground mt-1 text-[11px]">{t('phoneHint')}</p>
        </div>
        <Button onClick={sendCode} disabled={submitting} className="w-full">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('sendCode')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      <button
        type="button"
        onClick={() => setStage('phone')}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft size={12} /> {t('changePhone')}
      </button>
      <div>
        <Label className="text-xs">{t('codeLabel')}</Label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="------"
          inputMode="numeric"
          maxLength={6}
          className="text-center text-lg tracking-[0.5em]"
          autoFocus
        />
        <p className="text-muted-foreground mt-1 text-[11px]">{t('codeSentTo', { phone })}</p>
      </div>
      <Button onClick={verify} disabled={submitting} className="w-full">
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('verify')}
      </Button>
      <button
        type="button"
        onClick={() => {
          if (resendIn === 0) {
            setResendIn(60);
            toast({ title: t('codeResent'), variant: 'success' });
          }
        }}
        disabled={resendIn > 0}
        className="text-muted-foreground hover:text-foreground block w-full text-center text-xs disabled:cursor-not-allowed disabled:opacity-50"
      >
        {resendIn > 0 ? t('resendIn', { seconds: resendIn }) : t('resend')}
      </button>
    </div>
  );
}

function EmailForm() {
  const router = useRouter();
  const t = useTranslations('auth');
  const nextHref = useNextHref();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await loginWithEmail(email.trim(), password);
    setSubmitting(false);
    if (!result.success) {
      toast({ title: result.error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('loginSuccess'), variant: 'success' });
    router.push(nextHref);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-3 pt-2">
      <div>
        <Label className="text-xs">{t('email')}</Label>
        <div className="relative">
          <Mail className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9"
            placeholder={t('emailPlaceholder')}
            autoComplete="email"
            required
          />
        </div>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <Label className="text-xs">{t('password')}</Label>
          <Link href="/forgot-password" className="text-primary text-[11px] hover:underline">
            {t('forgotPassword')}
          </Link>
        </div>
        <div className="relative">
          <Lock className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9"
            placeholder={t('passwordPlaceholder')}
            autoComplete="current-password"
            required
          />
        </div>
      </div>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('loginSubmit')}
      </Button>
      <div className="bg-secondary/40 text-muted-foreground rounded-md p-2 text-[11px]">
        <ShieldCheck size={11} className="mr-1 inline text-emerald-600" />
        {t('passwordSecure')}
      </div>
    </form>
  );
}

const OAUTH_CFG: Record<
  'google' | 'telegram' | 'apple',
  { key: 'loginWithGoogle' | 'loginWithTelegram' | 'loginWithApple'; emoji: string }
> = {
  google: { key: 'loginWithGoogle', emoji: '🔵' },
  telegram: { key: 'loginWithTelegram', emoji: '💬' },
  apple: { key: 'loginWithApple', emoji: '' },
};

function OAuthButton({ provider }: { provider: keyof typeof OAUTH_CFG }) {
  const t = useTranslations('auth');
  const cfg = OAUTH_CFG[provider];
  const label = t(cfg.key);
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full justify-start gap-3"
      onClick={() => toast({ title: t('oauthSoon', { provider: label }), duration: 2000 })}
    >
      <span className="text-base">{cfg.emoji}</span>
      <span>{label}</span>
    </Button>
  );
}
