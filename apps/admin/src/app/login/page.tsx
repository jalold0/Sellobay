'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
  toast,
} from '@ecom/ui';
import { Loader2, Lock, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [remember, setRemember] = React.useState(true);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Email va parol kerak', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    // Real holatda: const { accessToken, refreshToken } = await apiClient.post('/auth/login', {...}, { authenticated: false });
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    router.push('/');
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <div className="relative hidden bg-gradient-to-br from-primary via-violet-600 to-rose-500 p-12 lg:flex lg:flex-col">
        <div className="text-2xl font-bold text-white">E-Commerce Admin</div>
        <div className="mt-auto max-w-md text-white">
          <h2 className="text-3xl font-bold leading-tight">
            O`zbekistondagi eng yirik e-commerce ekosistemasini boshqaring
          </h2>
          <p className="mt-4 text-white/80">
            Buyurtmalar, mahsulotlar, sotuvchilar, kuryerlar va marketing — barchasi bitta panelda.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Tizimga kirish</CardTitle>
            <p className="text-sm text-muted-foreground">Admin panel uchun login ma`lumotlari</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    placeholder="admin@example.uz"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div>
                <Label>Parol</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={remember} onCheckedChange={setRemember} />
                  Eslab qol
                </label>
                <a className="text-xs text-primary hover:underline" href="#">
                  Parolni unutdingizmi?
                </a>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Kirish
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Yordam kerakmi?{' '}
              <a className="text-primary hover:underline" href="mailto:support@example.uz">
                support@example.uz
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
