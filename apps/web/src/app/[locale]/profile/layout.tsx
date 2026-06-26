import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { ProfileShell } from '../../../components/profile/profile-shell';

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
  return <ProfileShell user={user}>{children}</ProfileShell>;
}
