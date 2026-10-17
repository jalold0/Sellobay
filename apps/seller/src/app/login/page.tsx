'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  PasswordInput,
  toast,
} from '@ecom/ui';
import { Loader2, Lock, Mail } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { loginSeller } from '@/lib/auth/client';

function SellerLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params?.get('next') || '/';
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({ identifier: '', password: '' });
  // «Meni eslab qol» — belgilanmasa sessiya brauzer yopilganda tugaydi.
  const [remember, setRemember] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.identifier.trim() || !form.password) {
      toast({ title: 'Email/telefon va parolni kiriting', variant: 'warning' });
      return;
    }
    setSubmitting(true);
    const result = await loginSeller(form.identifier.trim(), form.password, remember);
    setSubmitting(false);
    if (!result.success) {
      toast({ title: result.error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Kirildi', variant: 'success' });
    router.push(nextPath);
    router.refresh();
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <div className="bg-bordeaux-gradient relative hidden p-12 lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sellobay-icon-64.png"
            alt="Sellobay"
            className="h-12 w-12 rounded-xl shadow-lg"
          />
          <div className="text-2xl font-bold text-white">Sellobay Sotuvchi</div>
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
                <Label>Email yoki telefon</Label>
                <div className="relative">
                  <Mail className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <Input
                    value={form.identifier}
                    onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                    className="pl-9"
                    placeholder="seller@example.uz yoki +998..."
                    autoComplete="username"
                  />
                </div>
              </div>
              <div>
                <Label>Parol</Label>
                <div className="relative">
                  {/* z-10: PasswordInput o'z konteyneriga ega — input foni belgini yopmasin. */}
                  <Lock className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2" />
                  <PasswordInput
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="pl-9"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                />
                <Label htmlFor="remember" className="cursor-pointer font-normal">
                  Meni eslab qol
                  <span className="text-muted-foreground ml-1 text-xs">(30 kun)</span>
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Kirish
              </Button>
              <p className="text-muted-foreground text-center text-xs">
                Hali sotuvchi emasmisiz?{' '}
                <a
                  href={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.sellobay.uz'}/uz/register?role=seller`}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ariza qoldirish
                </a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SellerLoginPage() {
  return (
    <React.Suspense>
      <SellerLoginForm />
    </React.Suspense>
  );
}
