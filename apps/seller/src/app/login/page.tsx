'use client';

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@ecom/ui';
import { Loader2, Lock, Mail, Store } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

export default function SellerLoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    router.push('/');
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <div className="relative hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-12 lg:flex lg:flex-col">
        <div className="flex items-center gap-2 text-2xl font-bold text-white">
          <Store className="h-6 w-6" /> Sotuvchi paneli
        </div>
        <div className="mt-auto max-w-md text-white">
          <h2 className="text-3xl font-bold leading-tight">
            Mahsulotlaringizni millionlab xaridorlarga ko`rsating
          </h2>
          <p className="mt-4 text-white/80">
            Buyurtmalar, inventar, hisob-kitob va analitika — barchasi bitta panelda.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Sotuvchi sifatida kirish</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="email" className="pl-9" placeholder="seller@example.uz" />
                </div>
              </div>
              <div>
                <Label>Parol</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" className="pl-9" placeholder="••••••••" />
                </div>
              </div>
              <Button className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Kirish
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Hali sotuvchi emasmisiz?{' '}
                <Link href="/register" className="text-primary hover:underline">
                  Ro`yxatdan o`tish
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
