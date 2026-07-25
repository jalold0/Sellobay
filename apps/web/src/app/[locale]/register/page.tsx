import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { RegisterForm } from '../../../components/auth/register-form';

export const metadata = { title: "Ro'yxatdan o'tish" };

export default async function RegisterPage({ params }: { params: { locale: string } }) {
  // Allaqachon kirgan bo'lsa registratsiya formasini ko'rsatmaymiz.
  const user = await getCurrentUser();
  if (user) {
    redirect(`/${params.locale}/profile`);
  }
  return <RegisterForm />;
}
