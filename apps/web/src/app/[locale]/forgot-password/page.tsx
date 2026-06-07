'use client';

import { Button, Card, CardContent, Input, Label, toast } from '@ecom/ui';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setSent(true);
    toast({ title: 'Email yuborildi', variant: 'success' });
  };

  return (
    <div className="mx-auto max-w-md">
      <Link
        href="/login"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> Loginga qaytish
      </Link>
      <Card>
        <CardContent className="space-y-5 p-6 md:p-8">
          {sent ? (
            <>
              <div className="text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                  <Mail size={28} />
                </div>
                <h1 className="mt-4 text-2xl font-bold">Pochtangizni tekshiring</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Biz <strong>{email}</strong> manziliga parolni tiklash havolasini yubordik.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Email yetib kelmadimi? Spam papkasini tekshiring yoki{' '}
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="text-primary hover:underline"
                  >
                    qaytadan yuboring
                  </button>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold">Parolni unutdingizmi?</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Emailingizni kiriting — parolni tiklash havolasini yuboramiz
                </p>
              </div>
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <Label className="text-xs">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      placeholder="email@example.uz"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Yuborish
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
