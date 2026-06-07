'use client';

import { Button, Card, CardContent, Checkbox, Input, Label, toast } from '@ecom/ui';
import { Loader2, Lock, Mail, Phone, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const isSellerRole = params.get('role') === 'seller';

  const [form, setForm] = React.useState({
    firstName: '',
    lastName: '',
    phone: '+998 ',
    email: '',
    password: '',
    accept: false,
  });
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accept) {
      toast({ title: 'Shartlarga roziligingizni bildiring', variant: 'warning' });
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    toast({
      title: isSellerRole ? "Sotuvchi arizasi qabul qilindi" : "Hisob yaratildi",
      description: isSellerRole ? "24 soat ichida xabarlashamiz" : "Profil bo'limiga o'tamiz",
      variant: 'success',
    });
    router.push(isSellerRole ? '/' : '/profile');
  };

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardContent className="space-y-5 p-6 md:p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              {isSellerRole ? "Sotuvchi bo'lish" : "Ro'yxatdan o'tish"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSellerRole
                ? 'Tayyorlangan formani to`ldiring, biz bog`lanamiz'
                : "Bir necha soniyada hisob yarating"}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Ism</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Familiya</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Telefon</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="pl-9"
                  placeholder="+998 90 123 45 67"
                  required
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Parol</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pl-9"
                  minLength={8}
                  required
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Kamida 8 ta belgi, harf va raqam aralash
              </p>
            </div>

            <label className="flex items-start gap-2 pt-1 text-xs">
              <Checkbox
                checked={form.accept}
                onCheckedChange={(v) => setForm({ ...form, accept: !!v })}
                className="mt-0.5"
              />
              <span>
                Men{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  foydalanish shartlari
                </Link>{' '}
                va{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  maxfiylik siyosati
                </Link>
                ga roziman
              </span>
            </label>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSellerRole ? 'Ariza yuborish' : "Ro'yxatdan o'tish"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Hisobingiz bormi?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Kirish
        </Link>
      </p>
    </div>
  );
}
