'use client';

import { toast } from '@ecom/ui';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import {
  linkTelegramLogin,
  pollTelegramLogin,
  startTelegramLogin,
  updateProfile,
  type TelegramPollData,
} from '@/lib/auth/client';

const POLL_MS = 2000;
const LINK_MAX_ATTEMPTS = 5;

type State =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'waiting'; token: string; code: string; botUrl: string; expiresAt: number }
  | { kind: 'link'; token: string; maskedEmail: string | null }
  | { kind: 'name'; firstName: string; lastName: string }
  | { kind: 'expired' };

function TelegramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#229ED9" aria-hidden>
      <path d="M21.9 4.3L18.8 19.2c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8L18 6.6c.4-.3-.1-.5-.6-.2L6.7 13.2l-4.6-1.4c-1-.3-1-1 .2-1.5L20.5 3c.8-.3 1.6.2 1.4 1.3z" />
    </svg>
  );
}

const inputCls =
  'border-border text-brand-ink focus:border-primary focus:ring-primary/15 placeholder:text-muted-foreground h-11 w-full rounded-xl border bg-white px-3.5 text-sm outline-none transition focus:ring-2';
const primaryBtnCls =
  'bg-primary hover:bg-primary/90 flex h-[52px] w-full items-center justify-center gap-2 rounded-full text-sm font-bold text-white transition disabled:opacity-60';

/**
 * Telegram orqali kirish / ro'yxatdan o'tish (ADR 0018).
 *
 * 1. Kod ko'rsatiladi, foydalanuvchi o'zi Telegram'ni ochadi (botda ham shu kod — begona
 *    havola bilan kelgan odam tanimagan kodni ko'rib to'xtaydi), sahifa tasdiqni kutadi.
 * 2. Raqam parolli eski hisobda tasdiqlanmagan bo'lsa — parol bilan o'sha hisobga qaytish
 *    yoki yangi hisob.
 * 3. Yangi hisob — ism va familiyani tasdiqlash (Telegram'dagi bilan oldindan to'ldirilgan).
 */
export function TelegramLogin({
  onSuccess,
  label,
}: {
  onSuccess: () => void;
  /** Tugma matni (kirish yoki ro'yxatdan o'tish sahifasi). */
  label?: string;
}) {
  const t = useTranslations('auth');
  const [state, setState] = React.useState<State>({ kind: 'idle' });
  const panelRef = React.useRef<HTMLDivElement>(null);

  const start = async () => {
    setState({ kind: 'starting' });
    const res = await startTelegramLogin();
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      setState({ kind: 'idle' });
      return;
    }
    setState({
      kind: 'waiting',
      token: res.data.token,
      code: res.data.code,
      botUrl: res.data.botUrl,
      expiresAt: Date.now() + res.data.expiresInSec * 1000,
    });
  };

  /** Server javobidan keyingi qadam: kirildi (yangi bo'lsa — ism), yoki parol bilan bog'lash. */
  const handleResult = React.useCallback(
    (token: string, data: TelegramPollData) => {
      if (data.status === 'ok') {
        if (data.isNew) {
          setState({
            kind: 'name',
            firstName: data.user.firstName ?? '',
            lastName: data.user.lastName ?? '',
          });
        } else {
          onSuccess();
        }
        return true;
      }
      if (data.status === 'link') {
        setState({ kind: 'link', token, maskedEmail: data.maskedEmail });
        return true;
      }
      return false;
    },
    [onSuccess],
  );

  const panelKey = state.kind === 'idle' || state.kind === 'starting' ? null : state.kind;
  // Telefonda panel forma ostida, ekrandan pastda ochiladi — ko'rinadigan joyga aylantiramiz.
  React.useEffect(() => {
    if (!panelKey || panelKey === 'expired') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    panelRef.current?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  }, [panelKey]);

  const waitingToken = state.kind === 'waiting' ? state.token : null;
  const expiresAt = state.kind === 'waiting' ? state.expiresAt : 0;
  React.useEffect(() => {
    if (!waitingToken) return undefined;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stopped) return;
      if (Date.now() > expiresAt) {
        setState({ kind: 'expired' });
        return;
      }
      const res = await pollTelegramLogin(waitingToken);
      if (stopped) return;
      if (res.success && handleResult(waitingToken, res.data)) return;
      if (!res.success && res.error.code !== 'NETWORK' && res.error.code !== 'RATE_LIMIT') {
        if (res.error.code === 'TELEGRAM_EXPIRED') {
          setState({ kind: 'expired' });
        } else {
          toast({ title: res.error.message || t('telegram.failed'), variant: 'destructive' });
          setState({ kind: 'idle' });
        }
        return;
      }
      timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [waitingToken, expiresAt, handleResult, t]);

  if (state.kind === 'waiting') {
    return (
      <div ref={panelRef} className="border-border rounded-2xl border p-5" aria-live="polite">
        <PanelTitle>{t('telegram.title')}</PanelTitle>
        <p className="text-muted-foreground mt-2 text-[13px] leading-[1.55]">
          {t('telegram.instruction')}
        </p>
        <p className="text-muted-foreground mt-4 text-xs">{t('telegram.codeHint')}</p>
        <div className="bg-soft text-brand-ink mt-1.5 rounded-xl py-3 text-center text-[28px] font-extrabold tabular-nums tracking-[0.35em]">
          {state.code}
        </div>
        <a
          href={state.botUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${primaryBtnCls} mt-4`}
        >
          {t('telegram.open')}
        </a>
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {t('telegram.waiting')}
          </span>
          <button
            type="button"
            onClick={() => setState({ kind: 'idle' })}
            className="text-brand-ink font-semibold hover:underline"
          >
            {t('telegram.cancel')}
          </button>
        </div>
      </div>
    );
  }

  if (state.kind === 'link') {
    return (
      <div ref={panelRef} className="border-border rounded-2xl border p-5">
        <LinkForm
          token={state.token}
          maskedEmail={state.maskedEmail}
          onDone={(token, data) => {
            if (!handleResult(token, data)) setState({ kind: 'idle' });
          }}
          onRestart={() => setState({ kind: 'idle' })}
        />
      </div>
    );
  }

  if (state.kind === 'name') {
    return (
      <div ref={panelRef} className="border-border rounded-2xl border p-5">
        <NameForm initialFirst={state.firstName} initialLast={state.lastName} onDone={onSuccess} />
      </div>
    );
  }

  return (
    <div>
      {state.kind === 'expired' ? (
        <p className="text-muted-foreground mb-2 text-center text-xs" role="status">
          {t('telegram.expired')}
        </p>
      ) : null}
      <button
        type="button"
        onClick={start}
        disabled={state.kind === 'starting'}
        className="border-border text-brand-ink hover:bg-muted flex h-[52px] w-full items-center justify-center gap-2.5 rounded-full border-[1.5px] text-sm font-semibold transition disabled:opacity-60"
      >
        {state.kind === 'starting' ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <TelegramIcon />
        )}
        {state.kind === 'expired' ? t('telegram.retry') : (label ?? t('loginWithTelegram'))}
      </button>
    </div>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-brand-ink flex items-center gap-2 text-sm font-bold">
      <TelegramIcon />
      {children}
    </div>
  );
}

/** Raqami tasdiqlanmagan eski hisobga parol bilan qaytish yoki yangi hisob. */
function LinkForm({
  token,
  maskedEmail,
  onDone,
  onRestart,
}: {
  token: string;
  maskedEmail: string | null;
  onDone: (token: string, data: TelegramPollData) => void;
  onRestart: () => void;
}) {
  const t = useTranslations('auth');
  const passwordId = React.useId();
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState<'link' | 'new' | null>(null);
  const [left, setLeft] = React.useState(LINK_MAX_ATTEMPTS);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setBusy('link');
    const res = await linkTelegramLogin(token, password);
    setBusy(null);
    if (res.success) {
      onDone(token, res.data);
      return;
    }
    if (res.error.code === 'WRONG_PASSWORD') {
      const next = left - 1;
      setLeft(next);
      setPassword('');
      setError(
        next > 0 ? t('telegram.wrongPassword', { left: next }) : t('telegram.tooManyAttempts'),
      );
    } else if (res.error.code === 'LINK_TOO_MANY') {
      setLeft(0);
      setError(t('telegram.tooManyAttempts'));
    } else if (res.error.code === 'TELEGRAM_EXPIRED') {
      toast({ title: t('telegram.expired'), variant: 'destructive' });
      onRestart();
    } else {
      setError(res.error.message || t('telegram.failed'));
    }
  };

  const createNew = async () => {
    setBusy('new');
    const res = await pollTelegramLogin(token, 'create-new');
    setBusy(null);
    if (res.success) {
      onDone(token, res.data);
      return;
    }
    toast({ title: res.error.message || t('telegram.failed'), variant: 'destructive' });
    onRestart();
  };

  return (
    <form onSubmit={submit}>
      <PanelTitle>{t('telegram.linkTitle')}</PanelTitle>
      <p className="text-muted-foreground mt-2 text-[13px] leading-[1.55]">
        {maskedEmail
          ? t('telegram.linkHint', { email: maskedEmail })
          : t('telegram.linkHintNoEmail')}
      </p>
      {left > 0 ? (
        <>
          <label
            htmlFor={passwordId}
            className="text-brand-ink mb-1.5 mt-4 block text-xs font-semibold"
          >
            {t('password')}
          </label>
          <input
            id={passwordId}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${passwordId}-err` : undefined}
          />
        </>
      ) : null}
      {error ? (
        <p id={`${passwordId}-err`} className="text-destructive mt-2 text-xs" role="alert">
          {error}
        </p>
      ) : null}
      {left > 0 ? (
        <button
          type="submit"
          disabled={!password || busy !== null}
          className={`${primaryBtnCls} mt-4`}
        >
          {busy === 'link' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {t('telegram.linkSubmit')}
        </button>
      ) : null}
      <button
        type="button"
        onClick={createNew}
        disabled={busy !== null}
        className="text-brand-ink mt-3 w-full py-2 text-center text-[13px] font-semibold hover:underline disabled:opacity-60"
      >
        {busy === 'new' ? (
          <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : null}
        {t('telegram.createNew')}
      </button>
    </form>
  );
}

/** Yangi hisob: ism va familiyani tasdiqlash (ikkalasi majburiy). */
function NameForm({
  initialFirst,
  initialLast,
  onDone,
}: {
  initialFirst: string;
  initialLast: string;
  onDone: () => void;
}) {
  const t = useTranslations('auth');
  const firstId = React.useId();
  const lastId = React.useId();
  const [firstName, setFirstName] = React.useState(initialFirst);
  const [lastName, setLastName] = React.useState(initialLast);
  const [busy, setBusy] = React.useState(false);
  const valid = firstName.trim().length > 0 && lastName.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    const res = await updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() });
    setBusy(false);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    onDone();
  };

  return (
    <form onSubmit={submit}>
      <PanelTitle>{t('telegram.nameTitle')}</PanelTitle>
      <p className="text-muted-foreground mt-2 text-[13px] leading-[1.55]">
        {t('telegram.nameHint')}
      </p>
      <label htmlFor={firstId} className="text-brand-ink mb-1.5 mt-4 block text-xs font-semibold">
        {t('firstName')}
      </label>
      <input
        id={firstId}
        autoComplete="given-name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        maxLength={50}
        required
        className={inputCls}
      />
      <label htmlFor={lastId} className="text-brand-ink mb-1.5 mt-3 block text-xs font-semibold">
        {t('lastName')}
      </label>
      <input
        id={lastId}
        autoComplete="family-name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        maxLength={50}
        required
        className={inputCls}
      />
      <button type="submit" disabled={!valid || busy} className={`${primaryBtnCls} mt-5`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {t('telegram.confirm')}
      </button>
    </form>
  );
}
