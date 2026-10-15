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

/** Pozitsiyaning rasm/SKU/variant maydonlari — o'girishga kerak, testga ahamiyatsiz. */
const ITEM_EXTRA = { sku: 'SKU-1', variant: null, product: { images: [] } };

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
      parcelCode: null,
      handoverAttempts: 0,
      handoverMethod: null,
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
        payments: [],
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

  it('mijoz ismi, telefoni va izohi faqat topshiriqni olgan kuryerga (P5)', () => {
    const order = {
      id: 'o1',
      number: 'ORD-1',
      grandTotal: { toString: () => '620000' },
      placedAt: new Date('2026-10-04T07:55:00.000Z'),
      notes: 'Domofon 12',
      shippingAddress: { recipientName: 'Ali Valiyev', phone: '+998901234567' },
      payments: [],
      items: [],
    };
    const free = serializeDelivery(row({ courierId: null, order })).order;
    expect([free.recipientName, free.recipientPhone, free.notes]).toEqual([null, null, null]);
    const mine = serializeDelivery(row({ courierId: 'c1', order })).order;
    expect([mine.recipientName, mine.recipientPhone, mine.notes]).toEqual([
      'Ali Valiyev',
      '+998901234567',
      'Domofon 12',
    ]);
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
      items: [
        { quantity: 2, orderItem: { id: 'oi-1', nameSnapshot: { uz: 'Nike' }, ...ITEM_EXTRA } },
      ],
      order: {
        id: 'o1',
        number: 'ORD-1',
        grandTotal: { toString: () => '620000' },
        placedAt: new Date('2026-10-04T07:55:00.000Z'),
        notes: null,
        shippingAddress: null,
        payments: [],
        // Buyurtmada UCHTA mahsulot bor, topshiriqda esa bittasi.
        items: [
          { id: 'oi-1', quantity: 2, nameSnapshot: { uz: 'Nike' }, ...ITEM_EXTRA },
          { id: 'oi-2', quantity: 1, nameSnapshot: { uz: 'Adidas' }, ...ITEM_EXTRA },
          { id: 'oi-3', quantity: 5, nameSnapshot: { uz: 'Puma' }, ...ITEM_EXTRA },
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
          payments: [],
          items: [
            { id: 'oi-1', quantity: 2, nameSnapshot: { uz: 'Nike' }, ...ITEM_EXTRA },
            { id: 'oi-2', quantity: 1, nameSnapshot: { uz: 'Adidas' }, ...ITEM_EXTRA },
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

describe('posilka va topshirish (ADR 0017)', () => {
  const order = (over: Record<string, unknown> = {}) => ({
    id: 'o1',
    number: 'ORD-1',
    grandTotal: { toString: () => '620000' },
    placedAt: new Date('2026-10-04T07:55:00.000Z'),
    notes: null,
    shippingAddress: null,
    payments: [],
    items: [],
    ...over,
  });
  const row = (over: Record<string, unknown> = {}) =>
    ({
      id: 'd1',
      status: 'PICKED_UP',
      method: 'HOME_DELIVERY',
      destinationAddress: 'Toshkent',
      destinationLat: null,
      destinationLng: null,
      assignedAt: null,
      pickedUpAt: null,
      deliveredAt: null,
      failureReason: null,
      proofPhotoUrl: null,
      parcelCode: '7K3M9QXZ',
      handoverPin: '0420',
      handoverAttempts: 0,
      handoverMethod: null,
      kind: 'OUTBOUND',
      pickupAddress: null,
      items: [],
      createdAt: new Date('2026-10-04T08:00:00.000Z'),
      courierId: 'c1',
      order: order(),
      ...over,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

  it('topshirish kodi (PIN) javobda HECH QACHON yo`q', () => {
    expect(JSON.stringify(serializeDelivery(row()))).not.toContain('0420');
  });

  it('posilka kodi faqat olgan kuryerga, formatlangan holda', () => {
    expect(serializeDelivery(row()).parcelCode).toBe('SB-7K3M-9QXZ');
    expect(serializeDelivery(row({ courierId: null })).parcelCode).toBeNull();
  });

  it('kod faqat mijozga yetkazishda so`raladi', () => {
    expect(serializeDelivery(row()).handover.required).toBe(true);
    expect(serializeDelivery(row({ kind: 'RETURN' })).handover.required).toBe(false);
  });

  it('urinishlar tugasa — bloklangan', () => {
    const h = serializeDelivery(row({ handoverAttempts: 5 })).handover;
    expect(h).toMatchObject({ locked: true, attemptsLeft: 0 });
  });

  it('naqd buyurtmada olinadigan summa, to`langanda — null', () => {
    const cod = serializeDelivery(row({ order: order({ payments: [{ id: 'p1' }] }) }));
    expect(cod.order.codAmount).toBe('620000');
    expect(serializeDelivery(row()).order.codAmount).toBeNull();
  });

  it('pozitsiyada variant SKU`si, rasm va tanlov nomi', () => {
    const item = {
      id: 'oi-1',
      quantity: 1,
      nameSnapshot: { uz: 'Ko`ylak' },
      sku: 'SHIRT',
      product: { images: [{ url: 'https://x/1.jpg' }] },
      variant: {
        sku: 'SHIRT-RED-M',
        attributes: [
          {
            optionId: 'opt-red',
            valueString: null,
            valueNumber: null,
            attribute: { name: { uz: 'Rang' }, unit: null },
          },
          {
            optionId: null,
            valueString: null,
            valueNumber: { toString: () => '42' },
            attribute: { name: { uz: 'O`lcham' }, unit: 'EU' },
          },
        ],
      },
    };
    const out = serializeDelivery(
      row({ order: order({ items: [item] }) }),
      new Map([['opt-red', { uz: 'Qizil' }]]),
    );
    expect(out.order.items[0]).toMatchObject({
      sku: 'SHIRT-RED-M',
      imageUrl: 'https://x/1.jpg',
      variant: [
        { name: { uz: 'Rang' }, value: { uz: 'Qizil' } },
        { name: { uz: 'O`lcham' }, value: '42 EU' },
      ],
    });
  });
});
