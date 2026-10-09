// Yetkazish holati o'tishlari — sof mantiq.
//
// Eslatma: bu fayl `courier-server.ts` ni import qiladi, u esa
// `@/lib/db` ni. Prisma klienti DANGASA (Proxy) — import DB engine'ini
// ko'tarmaydi, shuning uchun test bazasiz ishlaydi.

import { describe, expect, it } from 'vitest';

import {
  canTransition,
  isTerminalDeliveryStatus,
  nextDeliveryStatuses,
  orderStatusFor,
  serializeDelivery,
  tashkentDayStart,
} from './courier-server';

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

describe('javobga o`girish', () => {
  // Faqat `serializeDelivery` ga kerak bo'lgan maydonlar; qolgani
  // o'girishga ta'sir qilmaydi.
  const row = (over: Record<string, unknown> = {}) =>
    ({
      id: 'd1',
      status: 'ASSIGNED',
      method: 'HOME_DELIVERY',
      destinationAddress: 'Toshkent, Yunusobod 1',
      destinationLat: null,
      destinationLng: null,
      assignedAt: null,
      pickedUpAt: null,
      deliveredAt: null,
      failureReason: null,
      proofPhotoUrl: null,
      kind: 'OUTBOUND',
      pickupAddress: null,
      items: [],
      createdAt: new Date('2026-10-04T08:00:00.000Z'),
      courierId: null,
      order: {
        id: 'o1',
        number: 'ORD-1',
        grandTotal: { toString: () => '620000' },
        placedAt: new Date('2026-10-04T07:55:00.000Z'),
        notes: null,
        shippingAddress: null,
        items: [],
      },
      ...over,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

  it('egasiz topshiriq ASSIGNED bo`lsa ham `claimed: false`', () => {
    // `ASSIGNED` = "yetkazishga tayinlandi", "kuryerga biriktirildi"
    // EMAS. Ilgari klient bu farqni bilmagani uchun bo'sh topshiriq
    // ustida «Biriktirildi» deb yozib turardi.
    expect(serializeDelivery(row({ courierId: null })).claimed).toBe(false);
  });

  it('kuryer olgan bo`lsa `claimed: true`', () => {
    expect(serializeDelivery(row({ courierId: 'c1' })).claimed).toBe(true);
  });

  it('`nextStatuses` holatdan hisoblanadi', () => {
    expect(serializeDelivery(row({ status: 'IN_TRANSIT' })).nextStatuses).toEqual([
      'ARRIVED',
      'DELIVERED',
      'FAILED',
    ]);
    expect(serializeDelivery(row({ status: 'DELIVERED' })).nextStatuses).toEqual([]);
  });

  it('qaytarishda FAQAT shu topshiriqdagi mahsulotlar', () => {
    // Buyurtma ikki omborga bo'linganda har bir topshiriq o'ziga
    // tegishli mahsulotni ko'rsatishi kerak. Buyurtmaning to'liq
    // ro'yxatini bersak, kuryer boshqa manzilga ketadigan mahsulotni
    // ham olib ketardi.
    const row2 = row({
      kind: 'RETURN',
      pickupAddress: 'Toshkent, Yunusobod 1',
      items: [{ quantity: 2, orderItem: { id: 'oi-1', nameSnapshot: { uz: 'Nike' } } }],
      order: {
        id: 'o1',
        number: 'ORD-1',
        grandTotal: { toString: () => '620000' },
        placedAt: new Date('2026-10-04T07:55:00.000Z'),
        notes: null,
        shippingAddress: null,
        // Buyurtmada UCHTA mahsulot bor, topshiriqda esa bittasi.
        items: [
          { id: 'oi-1', quantity: 2, nameSnapshot: { uz: 'Nike' } },
          { id: 'oi-2', quantity: 1, nameSnapshot: { uz: 'Adidas' } },
          { id: 'oi-3', quantity: 5, nameSnapshot: { uz: 'Puma' } },
        ],
      },
    });

    const out = serializeDelivery(row2);
    expect(out.kind).toBe('RETURN');
    expect(out.pickupAddress).toBe('Toshkent, Yunusobod 1');
    expect(out.order.items).toHaveLength(1);
    expect(out.order.itemCount).toBe(1);
    expect(out.order.items[0]?.id).toBe('oi-1');
  });

  it('oddiy yetkazishda BUTUN buyurtma ko`rsatiladi', () => {
    // `DeliveryItem` faqat qaytarishda yoziladi; bo'sh bo'lsa
    // buyurtmaning o'z ro'yxati ishlatiladi.
    const out = serializeDelivery(
      row({
        order: {
          id: 'o1',
          number: 'ORD-1',
          grandTotal: { toString: () => '620000' },
          placedAt: new Date('2026-10-04T07:55:00.000Z'),
          notes: null,
          shippingAddress: null,
          items: [
            { id: 'oi-1', quantity: 2, nameSnapshot: { uz: 'Nike' } },
            { id: 'oi-2', quantity: 1, nameSnapshot: { uz: 'Adidas' } },
          ],
        },
      }),
    );
    expect(out.kind).toBe('OUTBOUND');
    expect(out.order.items).toHaveLength(2);
  });

  it('isbot surati — BORLIGI qaytadi, yo`lning o`zi EMAS', () => {
    // Suratda mijozning uyi va eshigi bo'ladi. Kuryerga «biriktirdim»ni
    // bilish yetarli; yo'l qaytsa, uni bilgan har kim fayl so'ray
    // olardi.
    const withPhoto = serializeDelivery(row({ proofPhotoUrl: 'delivery-proofs/2026-10/x.jpg' }));
    expect(withPhoto.hasProofPhoto).toBe(true);
    expect(JSON.stringify(withPhoto)).not.toContain('delivery-proofs');

    expect(serializeDelivery(row()).hasProofPhoto).toBe(false);
  });
});

describe('Toshkent kunining boshlanishi', () => {
  // Kun chegarasi UTC'da hisoblansa, Toshkentdagi 00:00-05:00 oralig'i
  // «kechagi» kunga tushib qolardi: kuryer tunda yetkazgan buyurtmani
  // ertalab statistikada ko'rmasdi.
  it('tunda (Toshkent 01:00) — O`SHA kunning boshi', () => {
    // 2026-10-04T20:00Z = 2026-10-05 01:00 Toshkent.
    expect(tashkentDayStart(new Date('2026-10-04T20:00:00.000Z')).toISOString()).toBe(
      '2026-10-04T19:00:00.000Z',
    );
  });

  it('ertalab (Toshkent 08:00) — O`SHA kunning boshi', () => {
    // 2026-10-04T03:00Z = 2026-10-04 08:00 Toshkent. UTC yarim tuni
    // (2026-10-04T00:00Z) NOTO'G'RI javob bo'lardi.
    const start = tashkentDayStart(new Date('2026-10-04T03:00:00.000Z'));
    expect(start.toISOString()).toBe('2026-10-03T19:00:00.000Z');
    expect(start.toISOString()).not.toBe('2026-10-04T00:00:00.000Z');
  });

  it('kun boshining O`ZIDA ham o`sha kun', () => {
    // Chegarada: 19:00Z aynan Toshkent yarim tuni.
    expect(tashkentDayStart(new Date('2026-10-04T19:00:00.000Z')).toISOString()).toBe(
      '2026-10-04T19:00:00.000Z',
    );
  });
});

describe('buyurtma holati yetkazishga ergashadi', () => {
  // Ilgari buyurtma holatiga FAQAT `DELIVERED` da tegilardi, shuning
  // uchun mijoz kuzatuvida «Kutilmoqda» dan to'g'ridan-to'g'ri
  // «Yetkazildi» ga sakrash ko'rinardi.
  it('oraliq qadamlar ham buyurtmaga ko`chadi', () => {
    expect(orderStatusFor('PICKED_UP')).toBe('SHIPPED');
    expect(orderStatusFor('IN_TRANSIT')).toBe('OUT_FOR_DELIVERY');
    expect(orderStatusFor('DELIVERED')).toBe('DELIVERED');
  });

  it('`ARRIVED` alohida buyurtma holatini ochmaydi', () => {
    // Mijoz uchun «yo'lda» va «eshik oldida» bitta holat; buyurtma
    // enumida alohida qiymat yo'q.
    expect(orderStatusFor('ARRIVED')).toBe(orderStatusFor('IN_TRANSIT'));
  });

  it('`FAILED` buyurtmaga TEGMAYDI', () => {
    // Muvaffaqiyatsiz urinish buyurtmani bekor qilmaydi — ertaga
    // qayta urinish mumkin, qarorni admin qabul qiladi.
    expect(orderStatusFor('FAILED')).toBeNull();
  });

  it('`ASSIGNED` ham tegmaydi', () => {
    // Yozuv ochilishi mijoz uchun yangilik emas.
    expect(orderStatusFor('ASSIGNED')).toBeNull();
  });
});
