'use client';

import { Button, toast } from '@ecom/ui';
import { Loader2, Mail } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

/**
 * Footer'dagi obuna formasi.
 *
 * Ilgari bu forma serverga UMUMAN murojaat qilmasdi:
 *
 *     await new Promise((r) => setTimeout(r, 600));   // tarmoqqa taqlid
 *     toast({ title: t('thanks'), variant: 'success' });
 *
 * Ya'ni 600ms kutib "Rahmat! Email tasdiqlandi" deb yozardi va emailni
 * tashlab yuborardi. Mijoz obuna bo'ldim deb o'ylardi, ro'yxat esa
 * yig'ilmasdi.
 *
 * Endi `/api/newsletter` ga yoziladi va XATO JIM O'TMAYDI — muvaffaqiyat
 * xabari faqat server qabul qilganda chiqadi.
 */
export function NewsletterForm() {
  const t = useTranslations('footer.newsletter');
  const locale = useLocale();
  const [email, setEmail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      toast({ title: t('invalid'), variant: 'warning' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, locale, source: 'footer' }),
      });
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: { message?: string };
      } | null;

      if (!res.ok || !json?.success) {
        // Server bergan xabarni ko'rsatamiz (masalan chastota cheklovi),
        // bo'lmasa umumiy xato matni.
        toast({ title: json?.error?.message ?? t('error'), variant: 'destructive' });
        return;
      }

      toast({ title: t('thanks'), variant: 'success', duration: 4000 });
      setEmail('');
    } catch {
      // Tarmoq yo'q — bu ham xato, muvaffaqiyat emas.
      toast({ title: t('error'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <div className="relative flex-1">
        <Mail className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('placeholder')}
          className="border-input bg-background focus:border-primary focus:ring-primary/20 h-12 w-full rounded-full border pl-10 pr-5 text-sm outline-none focus:ring-2"
        />
      </div>
      <Button type="submit" size="lg" className="rounded-full px-6" disabled={submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('submit')}
      </Button>
    </form>
  );
}
