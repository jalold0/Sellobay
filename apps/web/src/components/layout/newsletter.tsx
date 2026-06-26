'use client';

import { Button, toast } from '@ecom/ui';
import { Loader2, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

export function NewsletterForm() {
  const t = useTranslations('footer.newsletter');
  const [email, setEmail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      toast({ title: t('invalid'), variant: 'warning' });
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    toast({
      title: t('thanks'),
      variant: 'success',
      duration: 4000,
    });
    setEmail('');
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
