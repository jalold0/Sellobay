// Markazlashtirilgan navigatsiya. Yangi bo'lim qo'shilsa shu yerga
// — sidebar, breadcrumb, command palette avtomatik yangilanadi.

import {
  BarChart3,
  Boxes,
  FolderTree,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { UserRole } from './auth';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  // Faqat shu rollar ushbu bo'limni ko'rishi mumkin
  roles?: UserRole[];
  // Sidebar group
  group?: string;
  // Notification dot uchun keyinchalik
  badgeKey?: 'pendingOrders' | 'pendingSellers' | 'pendingReviews';
}

export const adminNav: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, group: 'Asosiy' },
  { href: '/orders', label: 'Buyurtmalar', icon: ShoppingCart, group: 'Savdo', badgeKey: 'pendingOrders' },
  { href: '/products', label: 'Mahsulotlar', icon: Package, group: 'Katalog' },
  { href: '/categories', label: 'Kategoriyalar', icon: FolderTree, group: 'Katalog' },
  { href: '/brands', label: 'Brendlar', icon: Tags, group: 'Katalog' },
  { href: '/customers', label: 'Mijozlar', icon: Users, group: 'CRM' },
  {
    href: '/sellers',
    label: 'Sotuvchilar',
    icon: Store,
    group: 'CRM',
    badgeKey: 'pendingSellers',
  },
  { href: '/marketing', label: 'Marketing', icon: Megaphone, group: 'O`sish' },
  { href: '/analytics', label: 'Analitika', icon: BarChart3, group: 'O`sish' },
  { href: '/inventory', label: 'Inventar', icon: Boxes, group: 'Operatsiyalar' },
  {
    href: '/settings',
    label: 'Sozlamalar',
    icon: Settings,
    group: 'Tizim',
    roles: ['ADMIN', 'SUPER_ADMIN'],
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
