import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Package,
  RotateCcw,
  ShoppingCart,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group?: string;
}

export const sellerNav: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, group: 'Asosiy' },
  { href: '/products', label: 'Mahsulotlarim', icon: Package, group: 'Katalog' },
  { href: '/inventory', label: 'Inventar', icon: Boxes, group: 'Katalog' },
  { href: '/orders', label: 'Buyurtmalar', icon: ShoppingCart, group: 'Savdo' },
  { href: '/returns', label: 'Qaytarishlar', icon: RotateCcw, group: 'Savdo' },
  { href: '/finance', label: 'Moliya', icon: Wallet, group: 'Hisob' },
  { href: '/analytics', label: 'Analitika', icon: BarChart3, group: 'Hisob' },
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
