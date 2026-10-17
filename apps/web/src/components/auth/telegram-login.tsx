'use client';

import { toast } from '@ecom/ui';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { pollTelegramLogin, startTelegramLogin } from '@/lib/auth/client';

const POLL_MS = 2000;

type State =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'waiting'; token: string; code: string; botUrl: string; expiresAt: number }
  | { kind: 'expired' };

function TelegramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#229ED9" aria-hidden>
      <path d="M21.9 4.3L18.8 19.2c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8L18 6.6c.4-.3-.1-.5-.6-.2L6.7 13.2l-4.6-1.4c-1-.3-1-1 .2-1.5L20.5 3c.8-.3 1.6.2 1.4 1.3z" />
    </svg>
  );
}

/**
 * Telegram orqali kirish (ADR 0018). Avval kod ko'rsatiladi, keyin foydalanuvchi o'zi
 * Telegram'ni ochadi: botda ham shu kod chiqadi — begona havola bilan kelgan odam
 * tanimagan kodni ko'rib to'xtaydi. Sahifa har 2 soniyada tasdiqni so'raydi.
 */
export function TelegramLogin({ onSuccess }: { onSuccess: () => void }) {
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

  const waitingToken = state.kind === 'waiting' ? state.token : null;

  // Telefonda panel forma ostida, ekrandan pastda ochiladi — kodni ko'rsatish uchun aylantiramiz.
  React.useEffect(() => {
    if (!waitingToken) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    panelRef.current?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  }, [waitingToken]);

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
      if (res.success && res.data.status === 'ok') {
        onSuccess();
        return;
      }
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
  }, [waitingToken, expiresAt, onSuccess, t]);

  if (state.kind === 'waiting') {
    return (
      <div ref={panelRef} className="border-border rounded-2xl border p-5" aria-live="polite">
        <div className="text-brand-ink flex items-center gap-2 text-sm font-bold">
          <TelegramIcon />
          {t('telegram.title')}
        </div>
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
          className="bg-primary hover:bg-primary/90 mt-4 flex h-[52px] items-center justify-center gap-2 rounded-full text-sm font-bold text-white transition"
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
        {state.kind === 'expired' ? t('telegram.retry') : t('loginWithTelegram')}
      </button>
    </div>
  );
}
