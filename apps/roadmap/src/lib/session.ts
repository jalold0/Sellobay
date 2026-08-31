export const COOKIE = 'roadmap_session';

/**
 * Sessiya kaliti.
 *
 * Parolni to'g'ridan-to'g'ri kalit sifatida ishlatib bo'lmaydi: HS256 kamida
 * 32 bayt talab qiladi, oddiy parol esa qisqaroq. Shuning uchun paroldan
 * SHA-256 bilan 32 baytli kalit hosil qilamiz — parol uzunligidan qat'i nazar
 * ishlaydi.
 *
 * `crypto.subtle` ikkala muhitda ham mavjud: Edge (middleware) va Node (route).
 */
export async function sessionKey(password: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return new Uint8Array(digest);
}
