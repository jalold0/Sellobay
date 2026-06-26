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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { logout, me, type AuthUser } from '@/lib/auth/client';

export function AuthMenu() {
  const router = useRouter();
  const nav = useTranslations('nav');
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    me().then((res) => {
      if (!mounted) return;
      if (res.success) setUser(res.data.user);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    toast({ title: nav('signedOut'), variant: 'success' });
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return <div className="hidden h-10 w-24 md:block" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="hover:bg-muted hidden h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium md:flex"
      >
        <UserIcon size={18} />
        <span>{nav('login')}</span>
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
          className="hover:bg-muted hidden h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium md:flex"
        >
          <Avatar className="h-7 w-7">
            <AvatarImage src={user.avatarUrl ?? ''} alt="" />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="max-w-[120px] truncate">{displayName}</span>
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
