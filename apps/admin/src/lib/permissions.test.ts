import { describe, expect, it } from 'vitest';

import { adminNav } from './nav';
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  STAFF_ROLES,
  can,
  canOpenPage,
  homeFor,
  isStaff,
  pagePermission,
} from './permissions';

describe('rollar -> ruxsatlar', () => {
  it('bosh admin hamma ruxsatga ega, admin — xodim boshqaruvidan tashqari', () => {
    for (const p of PERMISSIONS) expect(can(['SUPER_ADMIN'], p)).toBe(true);
    expect(can(['ADMIN'], 'staff.manage')).toBe(false);
    expect(can(['ADMIN'], 'payouts.manage')).toBe(true);
  });

  it("bo'lim xodimlari faqat o'z ishini ko'radi", () => {
    expect(can(['SUPPORT_AGENT'], 'orders.manage')).toBe(true);
    expect(can(['SUPPORT_AGENT'], 'payouts.manage')).toBe(false);
    expect(can(['FINANCE_MANAGER'], 'refunds.manage')).toBe(true);
    expect(can(['FINANCE_MANAGER'], 'catalog.manage')).toBe(false);
    expect(can(['MARKETING_MANAGER'], 'catalog.manage')).toBe(true);
    expect(can(['MARKETING_MANAGER'], 'orders.view')).toBe(false);
    expect(can(['WAREHOUSE_STAFF'], 'warehouse.manage')).toBe(true);
    expect(can(['WAREHOUSE_STAFF'], 'customers.view')).toBe(false);
  });

  it('faqat bosh admin xodimlarni boshqaradi', () => {
    const managers = STAFF_ROLES.filter((r) => ROLE_PERMISSIONS[r].includes('staff.manage'));
    expect(managers).toEqual(['SUPER_ADMIN']);
  });

  it('bir nechta rol — ruxsatlar birlashadi', () => {
    const roles = ['SUPPORT_AGENT', 'FINANCE_MANAGER'];
    expect(can(roles, 'orders.manage')).toBe(true);
    expect(can(roles, 'payouts.manage')).toBe(true);
  });

  it('mijoz, sotuvchi, kuryer xodim emas', () => {
    expect(isStaff(['CUSTOMER'])).toBe(false);
    expect(isStaff(['SELLER', 'COURIER'])).toBe(false);
    expect(isStaff(['CUSTOMER', 'WAREHOUSE_STAFF'])).toBe(true);
    expect(can(['CUSTOMER'], 'dashboard.view')).toBe(false);
    expect(isStaff(undefined)).toBe(false);
  });
});

describe('sahifa ruxsatlari', () => {
  it("eng uzun mos prefiks g'olib", () => {
    expect(pagePermission('/orders')).toBe('orders.view');
    expect(pagePermission('/orders/abc-123')).toBe('orders.view');
    expect(pagePermission('/orders/payment-review')).toBe('payments.review');
    expect(pagePermission('/settings/global')).toBe('settings.manage');
    expect(pagePermission('/')).toBe('dashboard.view');
    // '/' prefiks sifatida hamma narsaga mos kelmasligi kerak
    expect(pagePermission('/ordersx')).toBe(null);
  });

  it("shaxsiy sahifa har bir xodimga ochiq, xodim bo'lmaganga yopiq", () => {
    expect(canOpenPage(['WAREHOUSE_STAFF'], '/account')).toBe(true);
    expect(canOpenPage(['CUSTOMER'], '/account')).toBe(false);
  });

  it("ombor xodimi to'lovlarni ochmaydi, moliya ochadi", () => {
    expect(canOpenPage(['WAREHOUSE_STAFF'], '/payouts')).toBe(false);
    expect(canOpenPage(['FINANCE_MANAGER'], '/payouts')).toBe(true);
    expect(canOpenPage(['ADMIN'], '/staff')).toBe(false);
    expect(canOpenPage(['SUPER_ADMIN'], '/staff')).toBe(true);
  });

  it('homeFor — har doim xodim ocha oladigan sahifa', () => {
    for (const r of STAFF_ROLES) expect(canOpenPage([r], homeFor([r]))).toBe(true);
  });

  it("menyudagi har bir bo'lim xaritada bor (yangi sahifa ruxsatsiz qolmasin)", () => {
    for (const item of adminNav) expect(pagePermission(item.href), item.href).not.toBeNull();
  });
});
