'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  toast,
} from '@ecom/ui';
import { LogOut, Package, User as UserIcon, Heart, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, useRouter } from '@/i18n/navigation';
import { logout, type AuthUser } from '@/lib/auth/client';
import { useForgetMe, useMe } from '@/lib/auth/use-me';

export function AuthMenu() {
  const router = useRouter();
  const nav = useTranslations('nav');
  const { data: user } = useMe();
  const forgetMe = useForgetMe();

  const handleSignOut = async () => {
    await logout();
    forgetMe();
    toast({ title: nav('signedOut'), variant: 'success' });
    router.push('/');
    router.refresh();
  };

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

  const initials = getInitials(user);
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.email ||
    user.phone ||
    nav('user');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hidden flex-col items-center gap-[3px] md:flex"
          aria-label={displayName}
        >
          {/* Sevimlilar va savat bilan bir xil shakl: 22px belgi + kichik yorliq */}
          <Avatar className="h-[22px] w-[22px]">
            <AvatarImage src={user.avatarUrl ?? ''} alt="" />
            <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
          </Avatar>
          <span className="max-w-[72px] truncate text-[10.5px] font-semibold text-[#55555c]">
            {user.firstName || nav('profile')}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            <UserIcon size={14} className="mr-2" /> {nav('profile')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile/orders" className="cursor-pointer">
            <Package size={14} className="mr-2" /> {nav('myOrders')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile/wishlist" className="cursor-pointer">
            <Heart size={14} className="mr-2" /> {nav('wishlist')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile/settings" className="cursor-pointer">
            <Settings size={14} className="mr-2" /> {nav('settings')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut size={14} className="mr-2" /> {nav('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
