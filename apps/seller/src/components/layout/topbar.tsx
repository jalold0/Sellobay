'use client';

import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Sheet,
  SheetContent,
  SheetTrigger,
  toast,
} from '@ecom/ui';
import { Bell, LogOut, Menu, Moon, Search, Sun, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { logoutSeller, meSeller, type SellerUser } from '@/lib/auth/client';
import { useTheme } from '../../providers';
import { Sidebar } from './sidebar';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const router = useRouter();
  const { resolved, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [user, setUser] = React.useState<SellerUser | null>(null);

  React.useEffect(() => {
    meSeller().then((res) => {
      if (res.success) setUser(res.data.user);
    });
  }, []);

  const handleSignOut = async () => {
    await logoutSeller();
    toast({ title: 'Tizimdan chiqdingiz', variant: 'success' });
    router.push('/login');
    router.refresh();
  };

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.email ||
    user?.phone ||
    'Sotuvchi';
  const initials = (() => {
    const f = user?.firstName?.[0]?.toUpperCase();
    const l = user?.lastName?.[0]?.toUpperCase();
    if (f && l) return f + l;
    if (f) return f;
    if (user?.email) return user.email[0]?.toUpperCase() ?? 'S';
    return 'S';
  })();
  const isPending = user?.status === 'PENDING';

  return (
    <header className="bg-background/80 sticky top-0 z-30 flex h-16 items-center gap-2 border-b px-4 backdrop-blur md:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        className="hidden lg:inline-flex"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative ml-auto hidden max-w-sm flex-1 md:block">
        <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input type="search" placeholder="Mahsulot, buyurtma..." className="pl-9" />
      </div>

      <div className="ml-auto flex items-center gap-1 md:ml-2">
        <Button variant="ghost" size="icon" onClick={toggle}>
          {resolved === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="hover:bg-accent flex items-center gap-2 rounded-md p-1.5">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden text-left leading-tight md:block">
              <div className="text-sm font-medium">{displayName}</div>
              <div className="text-muted-foreground text-[10px]">
                {isPending ? 'Tasdiq kutilmoqda' : 'Sotuvchi'}
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{displayName}</div>
              <div className="text-muted-foreground text-xs font-normal">
                {user?.email ?? user?.phone ?? ''}
              </div>
              {isPending ? (
                <div className="mt-1 inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                  Tasdiq kutilmoqda
                </div>
              ) : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/')}>
              <User className="mr-2 h-4 w-4" /> Bosh sahifa
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" /> Chiqish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
