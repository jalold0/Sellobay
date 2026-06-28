'use client';

import { Button, Card, Input, Label, Switch, toast } from '@ecom/ui';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function ProfileSettingsPage() {
  const t = useTranslations('profile.settingsPage');

  const notifications = [
    { label: t('notifEmailLabel'), desc: t('notifEmailDesc') },
    { label: t('notifSmsLabel'), desc: t('notifSmsDesc') },
    { label: t('notifPushLabel'), desc: t('notifPushDesc') },
    { label: t('notifMarketingLabel'), desc: t('notifMarketingDesc') },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('title')}</h1>

      <Card className="p-5">
        <h2 className="mb-4 font-semibold">{t('passwordTitle')}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">{t('currentPassword')}</Label>
            <Input type="password" />
          </div>
          <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">{t('newPassword')}</Label>
              <Input type="password" />
            </div>
            <div>
              <Label className="text-xs">{t('confirmPassword')}</Label>
              <Input type="password" />
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={() => toast({ title: t('passwordUpdated'), variant: 'success' })}>
            {t('update')}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-semibold">{t('notificationsTitle')}</h2>
        <div className="space-y-3">
          {notifications.map((n, i) => (
            <div key={n.label} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">{n.label}</div>
                <div className="text-xs text-muted-foreground">{n.desc}</div>
              </div>
              <Switch defaultChecked={i < 2} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-red-200 p-5">
        <h2 className="mb-2 flex items-center gap-2 font-semibold text-red-700">
          <AlertTriangle size={16} /> {t('dangerTitle')}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">{t('dangerDesc')}</p>
        <Button variant="destructive">{t('deleteAccount')}</Button>
      </Card>
    </div>
  );
}
