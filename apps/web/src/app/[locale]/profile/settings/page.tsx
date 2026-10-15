import { Card } from '@ecom/ui';
import { AlertTriangle } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PasswordForm } from '../../../../components/profile/password-form';
import { SupportChannels } from '../../../../components/support/support-channels';
import { hasSupport, supportContacts } from '../../../../lib/support';

/**
 * Profil sozlamalari.
 *
 * Ilgari bu yerda uchta soxta boshqaruv bor edi (audit FUN-04):
 *   • parol formasi faqat «parol yangilandi» xabarini ko'rsatardi — endi API'ga ulangan;
 *   • bildirishnoma kalitlari hech qayerga saqlanmasdi — olib tashlandi (server tomoni
 *     yo'q; qo'shilganda qaytadi);
 *   • «Hisobni o'chirish» tugmasi hech narsa qilmasdi — endi qo'llab-quvvatlash orqali.
 */
export default async function ProfileSettingsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations('profile.settingsPage');
  const support = supportContacts();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('title')}</h1>

      <Card className="p-5">
        <h2 className="mb-4 font-semibold">{t('passwordTitle')}</h2>
        <PasswordForm />
      </Card>

      <Card className="border-red-200 p-5">
        <h2 className="mb-2 flex items-center gap-2 font-semibold text-red-700">
          <AlertTriangle size={16} aria-hidden="true" /> {t('dangerTitle')}
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">{t('dangerViaSupport')}</p>
        {hasSupport(support) ? <SupportChannels support={support} /> : null}
      </Card>
    </div>
  );
}
