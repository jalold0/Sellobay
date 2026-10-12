'use client';

import { Button, Card, CardContent, Checkbox, Input, Label, toast } from '@ecom/ui';
import { Landmark, Loader2, Lock, Mail, Phone, Store, User } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { registerWithEmail } from '@/lib/auth/client';

export function RegisterForm() {
  const t = useTranslations('auth');
  const params = useSearchParams();
  const isSellerRole = params.get('role') === 'seller';

  const [form, setForm] = React.useState({
    firstName: '',
    lastName: '',
    phone: '+998 ',
    email: '',
    password: '',
    accept: false,
    // Sotuvchi arizasi (KYC)
    shopName: '',
    legalName: '',
    tin: '',
    bankName: '',
    bankAccount: '',
  });
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accept) {
      toast({ title: t('acceptWarning'), variant: 'warning' });
      return;
    }
    setSubmitting(true);
    const result = await registerWithEmail({
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      password: form.password,
      firstName: form.firstName.trim() || undefined,
      lastName: form.lastName.trim() || undefined,
      role: isSellerRole ? 'seller' : 'customer',
      ...(isSellerRole
        ? {
            shopName: form.shopName.trim() || undefined,
            legalName: form.legalName.trim() || undefined,
            tin: form.tin.replace(/\s/g, '') || undefined,
            bankName: form.bankName.trim() || undefined,
            bankAccount: form.bankAccount.replace(/\s/g, '') || undefined,
          }
        : {}),
    });
    setSubmitting(false);
    if (!result.success) {
      toast({ title: result.error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: isSellerRole ? t('sellerApplied') : t('accountCreated'),
      description: isSellerRole ? t('sellerAppliedHint') : t('accountCreatedHint'),
      variant: 'success',
      duration: isSellerRole ? 6000 : 3000,
    });
    // Hard navigatsiya (SPA push emas): registratsiya httpOnly cookie'ni fetch orqali
    // o'rnatadi; production build'da router.push eski RSC keshdan o'qib foydalanuvchini
    // qaytarib yuborardi. To'liq hujjat so'rovi yangi cookie bilan ketadi.
    window.location.assign(isSellerRole ? '/sell' : '/profile');
  };

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardContent className="space-y-5 p-6 md:p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              {isSellerRole ? t('sellerApplyTitle') : t('registerTitle')}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {isSellerRole ? t('sellerSubtitle') : t('registerSubtitle')}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">{t('firstName')}</Label>
                <div className="relative">
                  <User className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <Input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">{t('lastName')}</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">{t('phone')}</Label>
              <div className="relative">
                <Phone className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="pl-9"
                  placeholder={t('phonePlaceholder')}
                  required
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">{t('email')}</Label>
              <div className="relative">
                <Mail className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
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
              <Label className="text-xs">{t('password')}</Label>
              <div className="relative">
                <Lock className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pl-9"
                  minLength={8}
                  required
                />
              </div>
              <p className="text-muted-foreground mt-1 text-[11px]">{t('passwordHint')}</p>
            </div>

            {isSellerRole ? (
              <fieldset className="space-y-3 rounded-lg border p-3">
                <legend className="px-1 text-sm font-semibold">{t('sellerKycTitle')}</legend>
                <p className="text-muted-foreground text-[11px]">{t('sellerKycHint')}</p>
                <div>
                  <Label className="text-xs">{t('shopName')}</Label>
                  <div className="relative">
                    <Store className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      value={form.shopName}
                      onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                      className="pl-9"
                      minLength={2}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{t('legalNameLabel')}</Label>
                  <Input
                    value={form.legalName}
                    onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">{t('tin')}</Label>
                  <Input
                    value={form.tin}
                    onChange={(e) => setForm({ ...form, tin: e.target.value })}
                    inputMode="numeric"
                    pattern="\s*(\d\s*){9}|\s*(\d\s*){14}"
                    required
                  />
                  <p className="text-muted-foreground mt-1 text-[11px]">{t('tinHint')}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">{t('bankName')}</Label>
                    <div className="relative">
                      <Landmark className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                      <Input
                        value={form.bankName}
                        onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">{t('bankAccount')}</Label>
                    <Input
                      value={form.bankAccount}
                      onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                      inputMode="numeric"
                      pattern="\s*(\d\s*){20}"
                    />
                  </div>
                </div>
              </fieldset>
            ) : null}

            <label className="flex items-start gap-2 pt-1 text-xs">
              <Checkbox
                checked={form.accept}
                onCheckedChange={(v) => setForm({ ...form, accept: !!v })}
                className="mt-0.5"
              />
              <span>
                {t('acceptTermsPrefix')}{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  {t('termsLinkLower')}
                </Link>{' '}
                {t('acceptTermsMid')}{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  {t('privacyLinkLower')}
                </Link>
                {t('acceptTermsSuffix')}
              </span>
            </label>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSellerRole ? t('sellerSubmit') : t('registerSubmit')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-muted-foreground mt-4 text-center text-sm">
        {t('haveAccount')}{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          {t('loginLink')}
        </Link>
      </p>
    </div>
  );
}
