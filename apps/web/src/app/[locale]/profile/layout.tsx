import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/session';

import { ProfileShell } from '../../../components/profile/profile-shell';
import { IntlScope } from '../../../i18n/intl-scope';
import { PRIVATE_PAGE_ROBOTS } from '../../../lib/seo';

import type { Metadata } from 'next';

// Shaxsiy kabinet — qidiruvda chiqmaydi (audit SEO-01).
export const metadata: Metadata = { robots: PRIVATE_PAGE_ROBOTS };

export default async function ProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${params.locale}/login?next=/${params.locale}/profile`);
  }
  return (
    <IntlScope scope="profile" locale={params.locale}>
      <ProfileShell user={user}>{children}</ProfileShell>
    </IntlScope>
  );
}
