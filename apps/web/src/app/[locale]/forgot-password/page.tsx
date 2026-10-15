import { Card, CardContent } from '@ecom/ui';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

import { SupportChannels } from '../../../components/support/support-channels';
import { hasSupport, supportContacts } from '../../../lib/support';

export const metadata = { title: 'Parolni tiklash', robots: { index: false, follow: false } };

/**
 * Parolni tiklash.
 *
 * Ilgari bu sahifa 600 ms kutib «Email yuborildi» deb ko'rsatardi — hech qanday
 * xat yuborilmasdi (audit FUN-03): mijoz kutib, hisobiga qaytolmay qolardi.
 * Email yuborish xizmati hali ulanmagan, shuning uchun halol yo'l: qo'llab-
 * quvvatlash xizmati hisobni tekshirib, parolni tiklab beradi. Email/SMS xizmati
 * ulanganda bu sahifa haqiqiy tiklash formasiga almashtiriladi.
 */
export default function ForgotPasswordPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const support = supportContacts();

  return (
    <div className="mx-auto max-w-md">
      <Link
        href="/login"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft size={14} aria-hidden="true" /> Kirish sahifasiga qaytish
      </Link>
      <Card>
        <CardContent className="space-y-5 p-6 md:p-8">
          <div className="text-center">
            <div className="bg-primary/10 text-primary mx-auto grid h-14 w-14 place-items-center rounded-full">
              <KeyRound size={26} aria-hidden="true" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">Parolni unutdingizmi?</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Parolni tiklash uchun qo&apos;llab-quvvatlash xizmatiga yozing: hisobingizdagi email
              yoki telefon raqamini ayting, biz tekshirib, yangi parol o&apos;rnatishga yordam
              beramiz.
            </p>
          </div>
          {hasSupport(support) ? (
            <SupportChannels support={support} />
          ) : (
            <p className="text-muted-foreground text-center text-sm">
              Aloqa kanallari tez orada shu yerda paydo bo&apos;ladi.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
