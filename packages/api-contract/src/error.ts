/**
 * Domen xatosi — HTTP holati va kodi bilan.
 *
 * NEGA UMUMIY ASOS: har bir domenda o'z xato klassi bor edi
 * (`CourierError`, `OrderError`, `ReviewError`, `ReturnError`, ...),
 * hammasi bir xil `(status, code, message)` shaklida. Har route esa
 * ularni ALOHIDA ushlardi:
 *
 *     catch (e) {
 *       if (e instanceof CourierError) return apiError(e.status, e.code, e.message);
 *       throw e;
 *     }
 *
 * Bitta `catch` bloki unutilsa, domen xatosi kutilmagan 500 ga
 * aylanardi va foydalanuvchi «Server xatosi» ko'rardi — holbuki
 * sabab «bu yetkazish sizga biriktirilmagan» edi.
 *
 * Umumiy asos bilan `withApi()` hammasini bitta joyda ushlaydi.
 */
export class ApiDomainError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    /** Validatsiya uchun: maydon nomi -> sabab. */
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * Xato DOMENGA tegishlimi — ya'ni foydalanuvchiga ko'rsatsa bo'ladimi.
 *
 * `instanceof` yetarli emas: monorepo'da bir xil paket ikki nusxada
 * yuklanishi mumkin (web va admin alohida `node_modules` ko'radi) va
 * shunda `instanceof` noto'g'ri `false` qaytaradi. Shuning uchun
 * belgi bo'yicha ham tekshiramiz.
 */
export function isApiDomainError(e: unknown): e is ApiDomainError {
  if (e instanceof ApiDomainError) return true;
  return (
    typeof e === 'object' &&
    e !== null &&
    typeof (e as ApiDomainError).status === 'number' &&
    typeof (e as ApiDomainError).code === 'string' &&
    typeof (e as ApiDomainError).message === 'string'
  );
}
