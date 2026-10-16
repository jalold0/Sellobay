'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@ecom/ui';
import { User as UserIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link } from '@/i18n/navigation';
import { type AuthUser } from '@/lib/auth/client';
import { useMe } from '@/lib/auth/use-me';

// Ochiladigan menyu (Radix DropdownMenu + floating-ui) birinchi bosishda yuklanadi —
// `locale-switcher.tsx`dagi kabi. Tugma darhol chiziladi; modul tayyor bo'lgach menyu
// ochiq holda uning o'rniga keladi.
const loadDropdown = () => import('./auth-dropdown');
type AuthDropdownType = Awaited<ReturnType<typeof loadDropdown>>['AuthDropdown'];

type TriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  user: AuthUser;
  displayName: string;
  fallbackLabel: string;
};

/** Profil tugmasi — lazy menyu ichida ham aynan shu (asChild orqali) ishlatiladi. */
export const AuthTrigger = React.forwardRef<HTMLButtonElement, TriggerProps>(
  ({ user, displayName, fallbackLabel, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className="hidden flex-col items-center gap-[3px] md:flex"
      aria-label={displayName}
      {...props}
    >
      {/* Sevimlilar va savat bilan bir xil shakl: 22px belgi + kichik yorliq */}
      <Avatar className="h-[22px] w-[22px]">
        <AvatarImage src={user.avatarUrl ?? ''} alt="" />
        <AvatarFallback className="text-[9px]">{getInitials(user)}</AvatarFallback>
      </Avatar>
      <span className="max-w-[72px] truncate text-[10.5px] font-semibold text-[#55555c]">
        {user.firstName || fallbackLabel}
      </span>
    </button>
  ),
);
AuthTrigger.displayName = 'AuthTrigger';

export function AuthMenu() {
  const nav = useTranslations('nav');
  const { data: user } = useMe();
  const [Dropdown, setDropdown] = React.useState<AuthDropdownType | null>(null);
  const preload = () => void loadDropdown();

  // Javob kelguncha ham «Kirish» ko'rinadi: ilgari o'rnida 96px bo'sh joy turardi va javob
  // kelgach u torayib, yonidagi sevimlilar/savat ikonkalari o'ngga sakrardi.
  if (!user) {
    return (
      <Link href="/login" className="hidden flex-col items-center gap-[3px] md:flex">
        <UserIcon size={22} strokeWidth={1.8} className="text-brand-ink" />
        <span className="text-[10.5px] font-semibold text-[#55555c]">{nav('login')}</span>
      </Link>
    );
  }

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.email ||
    user.phone ||
    nav('user');

  if (Dropdown) return <Dropdown user={user} displayName={displayName} />;
  return (
    <AuthTrigger
      user={user}
      displayName={displayName}
      fallbackLabel={nav('profile')}
      aria-haspopup="menu"
      aria-expanded={false}
      onPointerEnter={preload}
      onFocus={preload}
      onClick={() => void loadDropdown().then((m) => setDropdown(() => m.AuthDropdown))}
    />
  );
}

function getInitials(user: AuthUser): string {
  const f = user.firstName?.[0]?.toUpperCase();
  const l = user.lastName?.[0]?.toUpperCase();
  if (f && l) return f + l;
  if (f) return f;
  if (user.email) return (user.email[0] ?? 'U').toUpperCase();
  if (user.phone) return user.phone.slice(-2);
  return 'SB';
}
