import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { LoginFlow } from '../../../components/auth/login-flow';

export const metadata = { title: 'Kirish' };

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { next?: string };
}) {
  // Allaqachon kirgan bo'lsa login formasini ko'rsatmaymiz — aks holda kirgandan
  // keyin ham forma ko'rinib turadi ("login qismi yopilmayapti" bug'i).
  const user = await getCurrentUser();
  if (user) {
    const next = searchParams.next;
    redirect(next && next.startsWith('/') ? next : `/${params.locale}/profile`);
  }
  return <LoginFlow />;
}
