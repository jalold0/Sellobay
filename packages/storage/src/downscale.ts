// Rasmni BRAUZERDA kichraytirish. Bu fayl faqat klient tomonda ishlaydi va
// ataylab hech qanday server kutubxonasiga bog'lanmagan — shuning uchun u
// `@ecom/storage/browser` orqali alohida import qilinadi. Aks holda brauzer
// bundle'iga Vercel Blob SDK'si ham tushib qolardi.
//
// NEGA kichraytiramiz: telefon kamerasining rasmi 5-12 MB bo'lishi mumkin.
// Uni to'liq yuborish mobil internetda sekin va qimmat, saqlashda esa keraksiz
// joy egallaydi. Ekranda ko'rsatiladigan o'lchamdan kattasi foyda bermaydi.

export interface DownscaleOptions {
  /** Uzun tomonning maksimal uzunligi (piksel). */
  maxDim?: number;
  /** JPEG sifati 0..1. */
  quality?: number;
  /** Natijaviy fayl nomi. */
  fileName?: string;
}

/**
 * Rasmni kichraytirib JPEG fayl qaytaradi. Rasm allaqachon kichik bo'lsa yoki
 * kichraytirib bo'lmasa — ASL fayl qaytadi (yuklash baribir davom etadi).
 */
export async function downscaleImageFile(
  file: File,
  { maxDim = 1600, quality = 0.85, fileName = 'rasm.jpg' }: DownscaleOptions = {},
): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Rasmni o`qib bo`lmadi'));
      element.src = objectUrl;
    });

    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    // Kichik rasmni qayta kodlash sifatni bekorga pasaytiradi.
    if (scale === 1) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob) return file;
    return new File([blob], fileName, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
