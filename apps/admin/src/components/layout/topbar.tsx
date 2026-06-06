'use client';

import {
  Avatar,
  AvatarFallback,
  Badge,
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
} from '@ecom/ui';
import { Bell, Menu, Moon, Search, Sun } from 'lucide-react';
import * as React from 'react';

import { useTheme } from '../../providers/theme-provider';
import { Sidebar } from './sidebar';
import { UserMenu } from './user-menu';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const { resolved, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menyu</span>
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
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buyurtma, mijoz yoki mahsulot qidirish..."
          className="pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-1 md:ml-2">
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Theme">
          {resolved === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Bildirishnomalar">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Bildirishnomalar
              <Badge variant="secondary" className="text-[10px]">
                3 yangi
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[
              { title: '5 yangi sotuvchi tasdiqlash kutilmoqda', time: '10 daq oldin' },
              { title: 'ORD-2026-1234 buyurtma bekor qilindi', time: '1 soat oldin' },
              { title: 'Quyi-stok ogohlantirish: 8 ta mahsulot', time: '2 soat oldin' },
            ].map((n) => (
              <DropdownMenuItem key={n.title} className="flex-col items-start gap-1 py-3">
                <div className="text-sm">{n.title}</div>
                <div className="text-xs text-muted-foreground">{n.time}</div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-sm text-primary">
              Barchasini ko`rish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="mx-2 hidden h-6 w-px bg-border md:block" />
        <UserMenu />
      </div>
    </header>
  );
}

export function TopbarAvatarFallback({ name }: { name: string }) {
  return (
    <Avatar>
      <AvatarFallback>{name[0]}</AvatarFallback>
    </Avatar>
  );
}
