// Takroriy so'rovdan himoya — sof yordamchi (DB'ga bog'liq emas, shu sababli
// test qilinadi).

import { createHash } from 'crypto';

/**
 * Klient bergan `Idempotency-Key` ni buyurtma EGASI bilan bog'lab hash qiladi.
 *
 * Xom kalitni to'g'ridan-to'g'ri saqlash xavfli: `Order.idempotencyKey` ustuni
 * global UNIQUE, ya'ni
 *   • ikki xil mijoz bir xil kalit yuborsa ikkinchisining buyurtmasi
 *     to'qnashuv tufayli rad etilardi;
 *   • yomon niyatli klient boshqa odamning kalitini taxmin qilib, takroriy
 *     so'rov javobi orqali uning buyurtmasini ko'rishi mumkin edi.
 *
 * Egasi hash ichiga kiritilgani uchun turli egalarning kalitlari hech qachon
 * to'qnashmaydi va javob faqat o'z egasiga qaytadi.
 */
export function scopeIdempotencyKey(clientKey: string, owner: string): string {
  return createHash('sha256').update(`${owner}:${clientKey}`).digest('hex');
}

/**
 * Buyurtma egasining barqaror identifikatori.
 * Login foydalanuvchi — `userId`; mehmon — telefon raqami (buyurtma aynan
 * shu raqamga bog'lanadi).
 */
export function orderOwnerKey(userId: string | null | undefined, phone: string): string {
  return userId ?? `guest:${phone.trim()}`;
}
