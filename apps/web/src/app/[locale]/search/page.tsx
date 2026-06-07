import { EmptyState } from '@ecom/ui';
import { Search } from 'lucide-react';
import { useLocale } from 'next-intl';
import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: { q?: string };
}

export const metadata = { title: 'Qidiruv' };

export default function SearchPage({ searchParams }: PageProps) {
  const locale = useLocale();
  // /catalog ham qidiruvni qo'llab-quvvatlaydi — shu yerga yo'naltirib yuboramiz
  if (searchParams.q) {
    redirect(`/${locale}/catalog?q=${encodeURIComponent(searchParams.q)}`);
  }
  return (
    <EmptyState
      icon={Search}
      title="Qidiruvni boshlang"
      description="Yuqoridagi qidiruv qatoriga mahsulot nomi, brend yoki kategoriya nomini kiriting"
    />
  );
}
