'use client';

import { toast } from '@ecom/ui';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

import { SellobayMark } from '../brand/sellobay-mark';
import { loginWithEmail, sendOtp, verifyOtp } from '@/lib/auth/client';

type OtpStage = 'phone' | 'code';
// Kirish usuli — email asosiy (SMS hali yoqilmagan), telefon ikkilamchi.
type Method = 'email' | 'phone';

function useNextHref(): string {
  const params = useSearchParams();
  const next = params.get('next');
  return next && next.startsWith('/') ? next : '/profile';
}

/** "90 123 45 67" ko'rinishida guruhlash — faqat ko'rinish uchun */
function formatNational(digits: string): string {
  const d = digits.slice(0, 9);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return parts.join(' ');
}

// Login muvaffaqiyatli bo'lgach — hard navigatsiya (SPA push emas): httpOnly cookie
// fetch orqali o'rnatiladi; production build'da router.push eski RSC keshdan (logout
// paytidagi /login redirect) o'qib foydalanuvchini qaytarib yuborardi. To'liq hujjat
// so'rovi yangi cookie bilan ketadi va keshni chetlab o'tadi.
function goAfterAuth(nextHref: string) {
  window.location.assign(nextHref);
}

export function LoginFlow() {
  const t = useTranslations('auth');

  return (
    // Konteynerdan chiqib, to'liq kenglikdagi split ekran (1e)
    <div className="relative left-1/2 right-1/2 -mx-[50vw] -my-6 w-screen md:-my-10">
      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 md:grid-cols-[minmax(0,600px)_1fr]">
        {/* Chap ink panel — faqat desktop */}
        <div className="bg-brand-ink relative hidden overflow-hidden md:block">
          {/* Brendli gradient fon — tashqi rasmga bog'liq emas (go-live xavfsiz) */}
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_0%,rgba(83,22,37,0.9),transparent_62%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(10,10,12,0.92)] to-[rgba(10,10,12,0.35)]" />
          <div className="relative flex h-full flex-col justify-between p-14">
            <div className="flex items-center gap-3">
              <SellobayMark size={44} priority />
              <span className="font-serif text-2xl font-bold text-white">Sellobay</span>
            </div>
            <div>
              <div className="bg-brand-gold mb-[18px] h-[1.5px] w-8" />
              <h2 className="font-serif text-[38px] font-semibold leading-[1.2] text-white">
                {t('panel.titleLine1')}
                <br />
                {t('panel.titleLine2')}
              </h2>
              <ul className="mt-7 flex flex-col gap-3 text-[13.5px] text-white/80">
                {(['benefit1', 'benefit2', 'benefit3'] as const).map((k) => (
                  <li key={k} className="flex items-center gap-2.5">
                    <span className="text-brand-gold">✓</span>
                    {t(`panel.${k}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* O'ng forma paneli */}
        <div className="flex items-center justify-center px-6 py-16 md:p-14">
          <AuthForms />
        </div>
      </div>
    </div>
  );
}

function AuthForms() {
  const t = useTranslations('auth');
  // SMS hali yoqilmagani uchun email asosiy usul.
  const [method, setMethod] = React.useState<Method>('email');

  return (
    <div className="flex w-full max-w-[400px] flex-col">
      {/* Mobil logo — chap panel yashiringanda */}
      <div className="mb-8 flex items-center gap-3 md:hidden">
        <SellobayMark size={40} />
        <span className="text-brand-ink font-serif text-xl font-bold">Sellobay</span>
      </div>

      <h1 className="text-brand-ink font-serif text-[30px] font-semibold">{t('welcomeTitle')}</h1>

      {/* Usul tanlagich — Email | Telefon */}
      <div className="border-border mt-6 flex rounded-full border p-1 text-[13.5px] font-bold">
        {(['email', 'phone'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={`flex-1 rounded-full py-2.5 transition ${
              method === m
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-brand-ink'
            }`}
          >
            {m === 'email' ? t('tabEmail') : t('tabPhone')}
          </button>
        ))}
      </div>

      {method === 'email' ? <EmailForm /> : <PhoneOtpForm />}

      {/* yoki ajratgich */}
      <div className="my-[26px] flex items-center gap-3.5">
        <div className="bg-border h-px flex-1" />
        <span className="text-[12px] text-[#9a9aa2]">{t('or')}</span>
        <div className="bg-border h-px flex-1" />
      </div>

      {/* Telegram outline pill */}
      <button
        type="button"
        onClick={() =>
          toast({ title: t('oauthSoon', { provider: t('loginWithTelegram') }), duration: 2000 })
        }
        className="border-border text-brand-ink hover:bg-muted flex h-[52px] items-center justify-center gap-2.5 rounded-full border-[1.5px] text-sm font-semibold transition"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#229ED9" aria-hidden>
          <path d="M21.9 4.3L18.8 19.2c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8L18 6.6c.4-.3-.1-.5-.6-.2L6.7 13.2l-4.6-1.4c-1-.3-1-1 .2-1.5L20.5 3c.8-.3 1.6.2 1.4 1.3z" />
        </svg>
        {t('loginWithTelegram')}
      </button>

      {/* Ro'yxatdan o'tish havolasi */}
      <p className="text-muted-foreground mt-6 text-center text-sm">
        {t('noAccount')}{' '}
        <Link href="/register" className="text-primary font-semibold hover:underline">
          {t('registerLink')}
        </Link>
      </p>

      {/* Shartlar izohi */}
      <p className="mt-5 text-center text-[11.5px] leading-[1.6] text-[#9a9aa2]">
        {t('termsPrefix')}{' '}
        <Link href="/offer" className="text-brand-ink border-b border-[#d5d5d9] font-semibold">
          {t('offerLink')}
        </Link>{' '}
        {t('termsJoin')}{' '}
        <Link href="/privacy" className="text-brand-ink border-b border-[#d5d5d9] font-semibold">
          {t('privacyLink')}
        </Link>
        {t('termsAgreeSuffix')}
      </p>
    </div>
  );
}

function EmailForm() {
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
    goAfterAuth(nextHref);
  };

  return (
    <form onSubmit={submit} className="mt-8">
      <div className="text-brand-ink mb-2 text-[12.5px] font-bold">{t('email')}</div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('emailPlaceholder')}
        autoComplete="email"
        required
        className="border-brand-ink text-brand-ink focus:ring-primary/20 h-[54px] w-full rounded-[14px] border-2 px-4 text-[15px] font-semibold outline-none placeholder:text-[#9a9aa2] focus:ring-2"
      />

      <div className="mb-2 mt-5 flex items-center justify-between">
        <span className="text-brand-ink text-[12.5px] font-bold">{t('password')}</span>
        <Link href="/forgot-password" className="text-primary text-[11.5px] font-semibold">
          {t('forgotPassword')}
        </Link>
      </div>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t('passwordPlaceholder')}
        autoComplete="current-password"
        required
        className="border-brand-ink text-brand-ink focus:ring-primary/20 h-[54px] w-full rounded-[14px] border-2 px-4 text-[15px] font-semibold outline-none placeholder:text-[#9a9aa2] focus:ring-2"
      />

      <button
        type="submit"
        disabled={submitting}
        className="bg-primary hover:bg-primary/90 mt-6 flex h-[54px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold text-white transition disabled:opacity-60"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {t('loginSubmit')}
      </button>
    </form>
  );
}

function PhoneOtpForm() {
  const t = useTranslations('auth');
  const nextHref = useNextHref();
  const [stage, setStage] = React.useState<OtpStage>('phone');
  const [national, setNational] = React.useState('');
  const [code, setCode] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(0);

  const fullPhone = `+998${national}`;

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const sendCode = async () => {
    if (national.length < 9) {
      toast({ title: t('phoneInvalid'), variant: 'warning' });
      return;
    }
    setSubmitting(true);
    const result = await sendOtp(fullPhone);
    setSubmitting(false);
    if (!result.success) {
      toast({ title: result.error.message, variant: 'destructive' });
      return;
    }
    setStage('code');
    setResendIn(60);
    toast({ title: t('codeSent'), description: fullPhone, variant: 'success' });
  };

  const verify = async () => {
    if (code.length < 4) {
      toast({ title: t('codeInvalid'), variant: 'warning' });
      return;
    }
    setSubmitting(true);
    const result = await verifyOtp(fullPhone, code);
    setSubmitting(false);
    if (!result.success) {
      toast({ title: result.error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('loginSuccess'), variant: 'success' });
    goAfterAuth(nextHref);
  };

  return (
    <div>
      <p className="text-muted-foreground mt-4 text-sm leading-[1.55]">{t('phoneFirstHint')}</p>

      {stage === 'phone' ? (
        <div className="mt-6">
          <div className="text-brand-ink mb-2 text-[12.5px] font-bold">{t('phone')}</div>
          <label className="border-brand-ink focus-within:ring-primary/20 flex h-[54px] items-center overflow-hidden rounded-[14px] border-2 focus-within:ring-2">
            <span className="bg-muted text-brand-ink border-border flex h-full items-center border-r px-4 text-[15px] font-bold">
              +998
            </span>
            <input
              value={formatNational(national)}
              onChange={(e) => setNational(e.target.value.replace(/\D/g, '').slice(0, 9))}
              placeholder={t('phonePlaceholderNational')}
              inputMode="numeric"
              autoComplete="tel-national"
              className="text-brand-ink h-full flex-1 bg-transparent px-4 text-[15px] font-semibold outline-none placeholder:text-[#9a9aa2]"
            />
          </label>
          <button
            type="button"
            onClick={sendCode}
            disabled={submitting}
            className="bg-primary hover:bg-primary/90 mt-5 flex h-[54px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold text-white transition disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('getCode')}
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setStage('phone')}
            className="text-muted-foreground hover:text-brand-ink mb-3 inline-flex items-center gap-1 text-xs"
          >
            <ArrowLeft size={12} /> {t('changePhone')}
          </button>
          <div className="text-brand-ink mb-2 text-[12.5px] font-bold">{t('codeLabel')}</div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="------"
            inputMode="numeric"
            maxLength={6}
            // OTP maydoniga avtomatik fokus — ataylab qilingan UX
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className="border-brand-ink text-brand-ink focus:ring-primary/20 h-[54px] w-full rounded-[14px] border-2 text-center text-lg font-semibold tracking-[0.5em] outline-none focus:ring-2"
          />
          <p className="text-muted-foreground mt-2 text-[11px]">
            {t('codeSentTo', { phone: fullPhone })}
          </p>
          <button
            type="button"
            onClick={verify}
            disabled={submitting}
            className="bg-primary hover:bg-primary/90 mt-4 flex h-[54px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold text-white transition disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('verify')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (resendIn === 0) {
                setResendIn(60);
                void sendOtp(fullPhone);
                toast({ title: t('codeResent'), variant: 'success' });
              }
            }}
            disabled={resendIn > 0}
            className="text-muted-foreground hover:text-brand-ink mt-3 block w-full text-center text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resendIn > 0 ? t('resendIn', { seconds: resendIn }) : t('resend')}
          </button>
        </div>
      )}
    </div>
  );
}
