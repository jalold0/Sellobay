// Markazlashtirilgan navigatsiya. Yangi bo'lim qo'shilsa shu yerga
// — sidebar, breadcrumb, command palette avtomatik yangilanadi.
// Kim nimani ko'radi — lib/permissions.ts (sahifa -> ruxsat xaritasi), bu yerda emas.

import {
  Banknote,
  BarChart3,
  Boxes,
  Clock,
  FolderTree,
  Globe,
  LayoutDashboard,
  Megaphone,
  Package,
  PackageCheck,
  Percent,
  QrCode,
  ReceiptText,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  type LucideIcon,
  Undo2,
  UserCog,
  Users,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  // Sidebar group
  group?: string;
  // Notification dot uchun keyinchalik
  badgeKey?: 'pendingOrders' | 'pendingSellers' | 'pendingReviews' | 'pendingPayments';
}

export const adminNav: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, group: 'Asosiy' },
  {
    href: '/orders',
    label: 'Buyurtmalar',
    icon: ShoppingCart,
    group: 'Savdo',
    badgeKey: 'pendingOrders',
  },
  {
    href: '/orders/payment-review',
    label: 'Karta to`lovlari',
    icon: ReceiptText,
    group: 'Savdo',
    badgeKey: 'pendingPayments',
  },
  {
    href: '/orders/returns',
    label: 'Qaytarishlar',
    icon: Undo2,
    group: 'Savdo',
  },
  { href: '/payouts', label: 'Sotuvchilarga to‘lovlar', icon: Banknote, group: 'Savdo' },
  { href: '/orders/global', label: 'Global zayavkalar', icon: Globe, group: 'Savdo' },
  { href: '/settings/global', label: 'Global sozlamalar', icon: Globe, group: 'Tizim' },
  { href: '/products', label: 'Mahsulotlar', icon: Package, group: 'Katalog' },
  { href: '/products/global', label: 'Global import', icon: Globe, group: 'Katalog' },
  { href: '/categories', label: 'Kategoriyalar', icon: FolderTree, group: 'Katalog' },
  { href: '/brands', label: 'Brendlar', icon: Tags, group: 'Katalog' },
  { href: '/customers', label: 'Mijozlar', icon: Users, group: 'CRM' },
  {
    href: '/sellers',
    label: 'Sotuvchilar',
    icon: Store,
    group: 'CRM',
  },
  {
    href: '/sellers/pending',
    label: 'Tasdiq kutilmoqda',
    icon: Clock,
    group: 'CRM',
    badgeKey: 'pendingSellers',
  },
  { href: '/group-buy', label: 'Guruh xaridi', icon: Users, group: 'O`sish' },
  { href: '/marketing', label: 'Marketing', icon: Megaphone, group: 'O`sish' },
  { href: '/analytics', label: 'Analitika', icon: BarChart3, group: 'O`sish' },
  { href: '/inbound', label: 'Ombor qabuli', icon: PackageCheck, group: 'Operatsiyalar' },
  { href: '/labels', label: 'Posilka yorliqlari', icon: QrCode, group: 'Operatsiyalar' },
  { href: '/inventory', label: 'Inventar', icon: Boxes, group: 'Operatsiyalar' },
  {
    href: '/settings/marketplace',
    label: 'Marketplace tariflari',
    icon: Percent,
    group: 'Tizim',
  },
  { href: '/staff', label: 'Xodimlar', icon: UserCog, group: 'Tizim' },
  {
    href: '/settings',
    label: 'Sozlamalar',
    icon: Settings,
    group: 'Tizim',
  },
];

export function groupNav(items: NavItem[]): Array<{ group: string; items: NavItem[] }> {
  const groups = new Map<string, NavItem[]>();
  for (const item of items) {
    const g = item.group ?? '';
    const list = groups.get(g) ?? [];
    list.push(item);
    groups.set(g, list);
  }
  return Array.from(groups.entries()).map(([group, items]) => ({ group, items }));
}
