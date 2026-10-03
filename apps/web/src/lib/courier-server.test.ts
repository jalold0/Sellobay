// Yetkazish holati o'tishlari — sof mantiq.
//
// Eslatma: bu fayl `courier-server.ts` ni import qiladi, u esa
// `@/lib/db` ni. Prisma klienti DANGASA (Proxy) — import DB engine'ini
// ko'tarmaydi, shuning uchun test bazasiz ishlaydi.

import { describe, expect, it } from 'vitest';

import { canTransition, isTerminalDeliveryStatus, nextDeliveryStatuses } from './courier-server';

import type { DeliveryStatus } from '@ecom/database';

const ALL: DeliveryStatus[] = [
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVED',
  'DELIVERED',
  'FAILED',
  'RETURNED',
];

describe('yetkazish holati o`tishlari', () => {
  it('odatiy yo`l: ASSIGNED -> PICKED_UP -> IN_TRANSIT -> ARRIVED -> DELIVERED', () => {
    expect(canTransition('ASSIGNED', 'PICKED_UP')).toBe(true);
    expect(canTransition('PICKED_UP', 'IN_TRANSIT')).toBe(true);
    expect(canTransition('IN_TRANSIT', 'ARRIVED')).toBe(true);
    expect(canTransition('ARRIVED', 'DELIVERED')).toBe(true);
  });

  it('yetkazilganda ARRIVED ni o`tkazib yuborish mumkin', () => {
    // Kuryer eshik oldida «yetkazdim» deb bossa, oraliq holatni
    // majburlash bema'ni bo'lardi.
    expect(canTransition('IN_TRANSIT', 'DELIVERED')).toBe(true);
  });

  it('ORQAGA qaytib bo`lmaydi', () => {
    // «Yetkazildi» dan keyin «yo'lda» ga qaytarish mijozning buyurtma
    // tarixini buzardi.
    expect(canTransition('DELIVERED', 'IN_TRANSIT')).toBe(false);
    expect(canTransition('IN_TRANSIT', 'PICKED_UP')).toBe(false);
    expect(canTransition('PICKED_UP', 'ASSIGNED')).toBe(false);
    expect(canTransition('ARRIVED', 'IN_TRANSIT')).toBe(false);
  });

  it('bosqichni sakrab o`tib bo`lmaydi', () => {
    expect(canTransition('ASSIGNED', 'DELIVERED')).toBe(false);
    expect(canTransition('ASSIGNED', 'IN_TRANSIT')).toBe(false);
    expect(canTransition('ASSIGNED', 'ARRIVED')).toBe(false);
  });

  it('istalgan faol bosqichdan FAILED ga chiqish bor', () => {
    for (const from of ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'] as DeliveryStatus[]) {
      expect(canTransition(from, 'FAILED')).toBe(true);
    }
  });

  it('yakuniy holatlardan chiqish yo`q', () => {
    for (const terminal of ['DELIVERED', 'FAILED', 'RETURNED'] as DeliveryStatus[]) {
      expect(isTerminalDeliveryStatus(terminal)).toBe(true);
      expect(nextDeliveryStatuses(terminal)).toEqual([]);
      for (const to of ALL) {
        expect(canTransition(terminal, to)).toBe(false);
      }
    }
  });

  it('faol holatlar yakuniy emas', () => {
    for (const active of ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'] as DeliveryStatus[]) {
      expect(isTerminalDeliveryStatus(active)).toBe(false);
    }
  });

  it('hech bir holat o`ziga o`tmaydi', () => {
    for (const s of ALL) {
      expect(canTransition(s, s)).toBe(false);
    }
  });

  it('har bir holat uchun javob bor — `undefined` qaytmaydi', () => {
    // Sxemaga yangi holat qo'shilsa, bu test uni eslatib turadi.
    for (const s of ALL) {
      expect(Array.isArray(nextDeliveryStatuses(s))).toBe(true);
    }
  });

  it('RETURNED — faqat admin qo`yadi, kuryer emas', () => {
    // Kuryer route'i `status` sifatida RETURNED ni umuman qabul
    // qilmaydi (zod enum), bu yerda esa unga o'tish yo'li ham yo'q.
    for (const from of ALL) {
      expect(canTransition(from, 'RETURNED')).toBe(false);
    }
  });
});
