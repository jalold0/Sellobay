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
} from '@ecom/ui';
import { LogOut, Moon, Settings, Sun, User } from 'lucide-react';
import Link from 'next/link';

import { initials } from '../../lib/format';
import { useSession } from '../../providers/session-provider';
import { useTheme } from '../../providers/theme-provider';

export function UserMenu() {
  const { session, signOut } = useSession();
  const { resolved, toggle } = useTheme();
  const name = `${session?.firstName ?? ''} ${session?.lastName ?? ''}`.trim() || 'Admin';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1.5 hover:bg-accent">
        <Avatar className="h-8 w-8">
          <AvatarImage src={session?.avatarUrl ?? undefined} alt={name} />
          <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="hidden text-left leading-tight md:block">
          <div className="text-sm font-medium">{name}</div>
          <div className="text-[10px] text-muted-foreground">
            {session?.roles[0] ?? '—'}
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="text-sm font-medium">{name}</div>
          <div className="text-xs font-normal text-muted-foreground">{session?.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" /> Profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" /> Sozlamalar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggle}>
          {resolved === 'dark' ? (
            <>
              <Sun className="mr-2 h-4 w-4" /> Yorug` rejim
            </>
          ) : (
            <>
              <Moon className="mr-2 h-4 w-4" /> Tungi rejim
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" /> Chiqish
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
