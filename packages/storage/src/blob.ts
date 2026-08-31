// Obyekt saqlash — Vercel Blob ustidagi yupqa qatlam.
//
// Ikki xil kirish darajasi ATAYLAB ajratilgan:
//
//   • public  — mahsulot rasmlari. Ular saytda, mobil ilovada va qidiruv
//     natijalarida ko'rinishi kerak, ya'ni ochiq bo'lishi TABIIY.
//
//   • private — to'lov cheklari. Chek — karta o'tkazmasi hujjati: unda summa,
//     vaqt va ko'pincha karta raqamining bir qismi bo'ladi. Uni havolani bilgan
//     har kim ocha olmasligi kerak. Shuning uchun bazada FAQAT ichki yo'l
//     (pathname) saqlanadi va rasm admin sessiyasi tekshirilgandan keyin
//     server orqali uzatiladi.
//
// Token bo'lmasa kod JIM QOLMAYDI — StorageNotConfiguredError tashlaydi.
// Sababi: jim ishlaydigan integratsiya ishlayotgandek ko'rinadi, lekin hech
// narsa saqlanmaydi va buni faqat mijoz yo'qolgan chek orqali bilib qoladi.

import { get, put } from '@vercel/blob';

import type { ValidatedImage } from './image.ts';

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      'Fayl saqlash sozlanmagan: BLOB_READ_WRITE_TOKEN yo`q. ' +
        'Vercel loyihasiga Blob do`koni ulanganini tekshiring, lokalda `vercel env pull` qiling.',
    );
    this.name = 'StorageNotConfiguredError';
  }
}

/** Blob do'koni ulanganmi (env token bormi). */
export function isStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function assertConfigured(): void {
  if (!isStorageConfigured()) throw new StorageNotConfiguredError();
}

/** Do'kon ichidagi papkalar — qo'shishdan oldin shu yerga yozing. */
export const FOLDER = {
  productImages: 'products',
  receipts: 'receipts',
} as const;

export type StorageFolder = (typeof FOLDER)[keyof typeof FOLDER];

/**
 * `products/2026-08/rasm` ko'rinishidagi asos. Oy bo'yicha bo'lish keyinchalik
 * eskisini topish va tozalashni osonlashtiradi.
 *
 * Fayl nomi yuklovchidan OLINMAYDI: uning ichida `../`, bo'shliq yoki boshqa
 * belgi bo'lishi mumkin. Nomni biz beramiz, noyobligini `addRandomSuffix`
 * ta'minlaydi (taxmin qilib bo'lmaydigan qo'shimcha).
 */
function buildPathname(folder: StorageFolder, image: ValidatedImage): string {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${folder}/${month}/${folder}.${image.ext}`;
}

/**
 * Blob SDK'si baytlarni Blob/Buffer/Stream ko'rinishida kutadi, biz esa
 * tekshiruvni oddiy `Uint8Array` ustida qilamiz — shu yerda bir marta o'giramiz.
 */
function toBlob(bytes: Uint8Array, contentType: string): Blob {
  return new Blob([bytes as BlobPart], { type: contentType });
}

export interface StoredPublicImage {
  /** Ochiq manzil — bazaga shu yoziladi. */
  url: string;
  /** Do'kon ichidagi yo'l — o'chirish uchun kerak bo'ladi. */
  pathname: string;
}

/** Ochiq rasm saqlaydi (mahsulot rasmlari). */
export async function putPublicImage(
  folder: StorageFolder,
  bytes: Uint8Array,
  image: ValidatedImage,
): Promise<StoredPublicImage> {
  assertConfigured();
  const result = await put(buildPathname(folder, image), toBlob(bytes, image.contentType), {
    access: 'public',
    addRandomSuffix: true,
    // Content-Type faylning HAQIQIY turidan olinadi (yuklovchi aytganidan emas).
    contentType: image.contentType,
    // Rasm o'zgarmaydi — manzil noyob, shuning uchun uzoq kesh xavfsiz.
    cacheControlMaxAge: 31_536_000,
  });
  return { url: result.url, pathname: result.pathname };
}

export interface StoredPrivateImage {
  /** Do'kon ichidagi yo'l — bazaga FAQAT shu yoziladi (ochiq manzil emas). */
  pathname: string;
  contentType: string;
}

/** Yopiq rasm saqlaydi (to'lov cheklari). */
export async function putPrivateImage(
  folder: StorageFolder,
  bytes: Uint8Array,
  image: ValidatedImage,
): Promise<StoredPrivateImage> {
  assertConfigured();
  const result = await put(buildPathname(folder, image), toBlob(bytes, image.contentType), {
    access: 'private',
    addRandomSuffix: true,
    contentType: image.contentType,
  });
  return { pathname: result.pathname, contentType: image.contentType };
}

export interface PrivateImageStream {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  size: number;
}

/**
 * Yopiq faylni o'qiydi. CHAQIRUVCHI AVVAL huquqni tekshirishi shart —
 * bu funksiya hech qanday avtorizatsiya qilmaydi.
 */
export async function readPrivateImage(pathname: string): Promise<PrivateImageStream | null> {
  assertConfigured();
  const result = await get(pathname, { access: 'private' });
  if (!result || result.statusCode !== 200) return null;
  return {
    stream: result.stream,
    contentType: result.blob.contentType,
    size: result.blob.size,
  };
}
