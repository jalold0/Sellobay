'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  toast,
} from '@ecom/ui';
import { Heart, LogOut, Package, Settings, User as UserIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, useRouter } from '@/i18n/navigation';
import { logout, type AuthUser } from '@/lib/auth/client';
import { useForgetMe } from '@/lib/auth/use-me';

import { AuthTrigger } from './auth-menu';

/**
 * Profil menyusi — `AuthMenu` tugmasi bosilganda yuklanadi va darhol ochiq holda
 * chiziladi (o'sha fayldagi izoh).
 */
export function AuthDropdown({ user, displayName }: { user: AuthUser; displayName: string }) {
  const router = useRouter();
  const nav = useTranslations('nav');
  const forgetMe = useForgetMe();

  const handleSignOut = async () => {
    await logout();
    forgetMe();
    toast({ title: nav('signedOut'), variant: 'success' });
    router.push('/');
    router.refresh();
  };

  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <AuthTrigger user={user} displayName={displayName} fallbackLabel={nav('profile')} />
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
