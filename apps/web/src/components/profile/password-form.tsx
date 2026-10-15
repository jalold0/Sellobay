'use client';

import { Button, Input, Label, toast } from '@ecom/ui';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

/**
 * Parolni almashtirish — `POST /api/auth/password` ga ulangan (audit FUN-04).
 * Ilgari tugma faqat «parol yangilandi» xabarini ko'rsatardi, parol o'zgarmasdi.
 */
export function PasswordForm() {
  const t = useTranslations('profile.settingsPage');
  const [current, setCurrent] = React.useState('');
  const [next, setNext] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError(t('passwordMismatch'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        data?: { otherSessionsSignedOut?: number };
        error?: { message?: string };
      } | null;
      if (!res.ok || !json?.success) {
        setError(json?.error?.message ?? t('passwordMismatch'));
        return;
      }
      setCurrent('');
      setNext('');
      setConfirm('');
      toast({
        title: t('passwordUpdated'),
        description: json.data?.otherSessionsSignedOut ? t('passwordSignedOut') : undefined,
        variant: 'success',
      });
    } catch {
      setError(t('passwordMismatch'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="pw-current" className="text-xs">
            {t('currentPassword')}
          </Label>
          <Input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
          <div>
            <Label htmlFor="pw-new" className="text-xs">
              {t('newPassword')}
            </Label>
            <Input
              id="pw-new"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              aria-describedby="pw-hint"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            <p id="pw-hint" className="text-muted-foreground mt-1 text-xs">
              {t('passwordHint')}
            </p>
          </div>
          <div>
            <Label htmlFor="pw-confirm" className="text-xs">
              {t('confirmPassword')}
            </Label>
            <Input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-destructive mt-3 text-sm">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex justify-end">
        <Button type="submit" disabled={saving || !current || !next || !confirm}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {saving ? t('saving') : t('update')}
        </Button>
      </div>
    </form>
  );
}
