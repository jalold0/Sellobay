// Fayl yuklash — rasm to'g'ridan-to'g'ri web backend'iga (Next.js API) boradi.
//
// NEGA alohida fayl: `authedFetch` tanani JSON qilib yuboradi, fayl esa
// multipart/form-data bo'lib ketishi kerak. Content-Type'ni QO'LDA yozmaymiz —
// uni fetch o'zi chegara (boundary) bilan birga qo'yadi, qo'lda yozilsa
// chegara tushib qoladi va server tanani o'qiy olmaydi.

import { API_BASE } from './core';

/** Yuklash oddiy so'rovdan uzoqroq davom etadi (mobil internet). */
const UPLOAD_TIMEOUT_MS = 45_000;

interface UploadResponse {
  success?: boolean;
  data?: { pathname?: string };
  error?: { message?: string };
}

/**
 * To'lov chekini yuklaydi va bazaga yoziladigan ichki yo'lni qaytaradi.
 * Rasmning o'zi yopiq saqlanadi, shuning uchun ochiq havola qaytmaydi.
 */
export async function uploadReceipt(uri: string, mimeType?: string): Promise<string> {
  const type = mimeType && /^image\/(jpeg|png|webp)$/.test(mimeType) ? mimeType : 'image/jpeg';
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';

  const form = new FormData();
  // React Native'da fayl shu uchlik bilan uzatiladi (brauzerdagi File o'rniga).
  form.append('file', { uri, name: `chek.${ext}`, type } as unknown as Blob);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/uploads/receipt`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
      body: form,
    });
    const json = (await res.json().catch(() => null)) as UploadResponse | null;
    if (!res.ok || !json?.success || !json.data?.pathname) {
      throw new Error(json?.error?.message ?? 'Chek yuklanmadi');
    }
    return json.data.pathname;
  } finally {
    clearTimeout(timer);
  }
}
