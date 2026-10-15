// Yetkazishning posilka kodi va topshirish kodi (ADR 0017).
//
// Yangi yetkazish kodlari bilan yaratiladi (`newDeliveryCodes`). Bu o'zgarishdan OLDIN
// yaratilganlarida kod yo'q — ular birinchi kerak bo'lganda (yorliq chop etish, mijoz
// sahifasi, kuryer skaneri) `ensureDeliveryCodes` bilan to'ldiriladi. Migratsiyada
// to'ldirilmaydi: SQL'da Crockford kod generatsiyasini takrorlash ikkinchi manba bo'lardi.

import { generateHandoverPin, generateParcelCode } from '@ecom/core-domain';
import { Prisma } from '@ecom/database';

/** Yangi yetkazish yozuviga qo'shiladigan kodlar. */
export function newDeliveryCodes(): { parcelCode: string; handoverPin: string } {
  return { parcelCode: generateParcelCode(), handoverPin: generateHandoverPin() };
}

type CodesClient = Pick<Prisma.TransactionClient, 'delivery'>;

/** Posilka kodi `@unique`: to'qnashuv (≈10^-12) bo'lsa qayta urinamiz. */
const MAX_TRIES = 3;

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

/**
 * Yetkazishda kodlar bo'lmasa — yaratadi; bor bo'lsa tegmaydi.
 *
 * Ikki so'rov bir vaqtda kelsa (`parcelCode: null` sharti) faqat bittasi yozadi,
 * ikkinchisi yozilganini o'qiydi — mijoz va yorliq hech qachon har xil kod ko'rmaydi.
 */
export async function ensureDeliveryCodes(
  db: CodesClient,
  deliveryId: string,
): Promise<{ parcelCode: string; handoverPin: string } | null> {
  for (let attempt = 0; attempt < MAX_TRIES; attempt += 1) {
    const row = await db.delivery.findUnique({
      where: { id: deliveryId },
      select: { parcelCode: true, handoverPin: true },
    });
    if (!row) return null;
    if (row.parcelCode && row.handoverPin) {
      return { parcelCode: row.parcelCode, handoverPin: row.handoverPin };
    }
    const fresh = newDeliveryCodes();
    try {
      await db.delivery.updateMany({
        where: { id: deliveryId, parcelCode: row.parcelCode },
        data: {
          parcelCode: row.parcelCode ?? fresh.parcelCode,
          handoverPin: row.handoverPin ?? fresh.handoverPin,
        },
      });
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }
  }
  throw new Error(`Yetkazish ${deliveryId} uchun posilka kodi yaratilmadi`);
}
