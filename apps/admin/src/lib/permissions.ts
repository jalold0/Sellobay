// Admin panel ruxsatlari: qaysi bo'lim xodimi nimani ko'radi va o'zgartiradi (ADR 0019).
//
// Ilgari panel faqat ADMIN/SUPER_ADMIN uchun edi — tekshiruv 55 ta route'da qo'lda
// yozilgan `['ADMIN','SUPER_ADMIN']` edi. Endi har bir route bitta ruxsatni talab qiladi
// (`requirePermission`), rol -> ruxsat xaritasi esa faqat shu faylda. Yangi bo'lim yoki rol
// qo'shilsa — shu yerda o'zgaradi, route'larga tegilmaydi.
//
// Sof modul (Prisma/Next importi yo'q): middleware (Edge), server route'lar va client
// komponentlar bir xil xaritani ishlatadi.

export const PERMISSIONS = [
  'dashboard.view',
  'orders.view',
  'orders.manage',
  'payments.review',
  'refunds.manage',
  'returns.manage',
  'payouts.manage',
  'customers.view',
  'sellers.view',
  'sellers.manage',
  'sellers.bank',
  'catalog.manage',
  'promo.manage',
  'global.catalog',
  'global.fulfillment',
  'warehouse.manage',
  'analytics.view',
  'settings.manage',
  'staff.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Panelga kira oladigan rollar (xodim rollari). CUSTOMER/SELLER/COURIER — yo'q. */
export const STAFF_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPPORT_AGENT',
  'FINANCE_MANAGER',
  'MARKETING_MANAGER',
  'WAREHOUSE_STAFF',
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

const ALL: readonly Permission[] = PERMISSIONS;

export const ROLE_PERMISSIONS: Record<StaffRole, readonly Permission[]> = {
  // Bosh admin — hammasi, shu jumladan xodimlarni boshqarish.
  SUPER_ADMIN: ALL,
  // Admin — hammasi, faqat xodim qo'shish/rol berishdan tashqari.
  ADMIN: ALL.filter((p) => p !== 'staff.manage'),
  // Operator / qo'llab-quvvatlash: buyurtmalar, mijozlar, qaytarishlar.
  SUPPORT_AGENT: [
    'dashboard.view',
    'orders.view',
    'orders.manage',
    'returns.manage',
    'customers.view',
    'sellers.view',
  ],
  // Moliya: karta to'lovlari, pul qaytarish, sotuvchilarga to'lov, bank rekvizitlari.
  FINANCE_MANAGER: [
    'dashboard.view',
    'orders.view',
    'payments.review',
    'refunds.manage',
    'payouts.manage',
    'sellers.view',
    'sellers.bank',
    'analytics.view',
  ],
  // Kontent / marketing: mahsulot, kategoriya, brend, promo, guruh xaridi, global import.
  MARKETING_MANAGER: [
    'dashboard.view',
    'catalog.manage',
    'promo.manage',
    'global.catalog',
    'analytics.view',
  ],
  // Ombor: qabul, inventar, yorliqlar, qaytgan posilkalarni qabul qilish, global yetkazish.
  WAREHOUSE_STAFF: [
    'dashboard.view',
    'orders.view',
    'returns.manage',
    'warehouse.manage',
    'global.fulfillment',
  ],
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  SUPER_ADMIN: 'Bosh admin',
  ADMIN: 'Admin',
  SUPPORT_AGENT: 'Operator',
  FINANCE_MANAGER: 'Moliya',
  MARKETING_MANAGER: 'Kontent va marketing',
  WAREHOUSE_STAFF: 'Ombor',
};

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  SUPER_ADMIN: "Hamma bo'limlar va xodimlarni boshqarish",
  ADMIN: "Hamma bo'limlar, xodimlarni boshqarishdan tashqari",
  SUPPORT_AGENT: 'Buyurtmalar, mijozlar, qaytarishlar',
  FINANCE_MANAGER: "Karta to'lovlari, pul qaytarish, sotuvchilarga to'lovlar",
  MARKETING_MANAGER: 'Mahsulotlar, kategoriyalar, brendlar, promo-kodlar',
  WAREHOUSE_STAFF: 'Ombor qabuli, inventar, posilka yorliqlari',
};

export function isStaffRole(role: string): role is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

/** Rollar to'plami panelga kirishga yetadimi. */
export function isStaff(roles: readonly string[] | undefined | null): boolean {
  return !!roles?.some(isStaffRole);
}

/** Rollardan kelib chiqadigan barcha ruxsatlar (bir nechta rol — birlashma). */
export function permissionsOf(roles: readonly string[] | undefined | null): Set<Permission> {
  const out = new Set<Permission>();
  for (const r of roles ?? []) {
    if (isStaffRole(r)) for (const p of ROLE_PERMISSIONS[r]) out.add(p);
  }
  return out;
}

export function can(roles: readonly string[] | undefined | null, permission: Permission): boolean {
  return permissionsOf(roles).has(permission);
}

/**
 * Panel sahifalari -> kerakli ruxsat. Eng uzun mos prefiks g'olib
 * (`/orders/payment-review` — `payments.review`, `/orders` emas).
 * Ro'yxatda yo'q sahifa — faqat xodim bo'lish yetadi (masalan /change-password).
 */
const PAGE_PERMISSIONS: ReadonlyArray<readonly [string, Permission]> = [
  ['/', 'dashboard.view'],
  ['/orders', 'orders.view'],
  ['/orders/payment-review', 'payments.review'],
  ['/orders/returns', 'returns.manage'],
  ['/orders/global', 'global.fulfillment'],
  ['/payouts', 'payouts.manage'],
  ['/products', 'catalog.manage'],
  ['/products/global', 'global.catalog'],
  ['/categories', 'catalog.manage'],
  ['/brands', 'catalog.manage'],
  ['/customers', 'customers.view'],
  ['/sellers', 'sellers.view'],
  ['/sellers/pending', 'sellers.manage'],
  ['/group-buy', 'promo.manage'],
  ['/marketing', 'promo.manage'],
  ['/analytics', 'analytics.view'],
  ['/inbound', 'warehouse.manage'],
  ['/labels', 'warehouse.manage'],
  ['/inventory', 'warehouse.manage'],
  ['/settings', 'settings.manage'],
  ['/staff', 'staff.manage'],
];

/** Shaxsiy sahifalar: har bir xodim uchun ochiq (parol, profil). */
const OPEN_PAGES = ['/change-password', '/forbidden', '/account'];

export function pagePermission(pathname: string): Permission | null {
  if (OPEN_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  let best: readonly [string, Permission] | null = null;
  for (const entry of PAGE_PERMISSIONS) {
    const [prefix] = entry;
    const match =
      prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(`${prefix}/`);
    if (match && (!best || prefix.length > best[0].length)) best = entry;
  }
  return best ? best[1] : null;
}

export function canOpenPage(
  roles: readonly string[] | undefined | null,
  pathname: string,
): boolean {
  if (!isStaff(roles)) return false;
  const p = pagePermission(pathname);
  return p === null || can(roles, p);
}

/** Ruxsat yo'q sahifadan qaytarish uchun — xodim ochishi mumkin bo'lgan birinchi sahifa. */
export function homeFor(roles: readonly string[] | undefined | null): string {
  if (can(roles, 'dashboard.view')) return '/';
  for (const [prefix, perm] of PAGE_PERMISSIONS) if (can(roles, perm)) return prefix;
  return '/change-password';
}
