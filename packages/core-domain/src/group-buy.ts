// Sellobay — Group Buy (guruh xaridi) sof domen logikasi.
// Framework/DB'ga bog'liq emas: web ham, mobil ham shu yerdan hisoblaydi.
//
// Mexanizm: mahsulotga `targetSize` ta mijoz qo'shilsa, guruh to'ladi va
// hamma `groupPrice` bilan oladi. Muddat (`expiresAt`) tugasa va guruh
// to'lmasa — guruh yopiladi.
//
// MUHIM: bu yerdagi hech bir qiymat to'qib chiqarilmaydi. Qatnashchilar soni,
// muddat va narxlar chaqiruvchi tomondan (DB'dan) beriladi.

export type GroupBuyStatusKey = 'OPEN' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

/** Guruhga qo'shilishga urinish natijasi. */
export type JoinRejection =
  | 'NOT_OPEN' // guruh OPEN emas (to'ldi/muddati tugadi/bekor qilindi)
  | 'EXPIRED' // muddat tugagan, lekin status hali OPEN
  | 'FULL' // joy qolmagan
  | 'ALREADY_MEMBER'; // mijoz allaqachon a'zo

export interface GroupBuyState {
  status: GroupBuyStatusKey;
  targetSize: number;
  /** Hozirgi a'zolar soni (DB'dan sanaladi). */
  currentSize: number;
  expiresAt: Date;
}

/**
 * Guruh muddati tugaganmi. `now` majburiy emas — testlarda aniq vaqt berish
 * uchun parametr sifatida olinadi (Date.now()'ga yashirin bog'lanmaydi).
 */
export function isExpired(
  state: Pick<GroupBuyState, 'expiresAt'>,
  now: Date = new Date(),
): boolean {
  return state.expiresAt.getTime() <= now.getTime();
}

/** Guruh to'lganmi (kerakli odam yig'ildimi). */
export function isFull(state: Pick<GroupBuyState, 'targetSize' | 'currentSize'>): boolean {
  return state.currentSize >= state.targetSize;
}

/** Guruh to'lishi uchun yana nechta odam kerak (manfiy bo'lmaydi). */
export function seatsLeft(state: Pick<GroupBuyState, 'targetSize' | 'currentSize'>): number {
  return Math.max(0, state.targetSize - state.currentSize);
}

/** To'lish foizi (0..100, butun son). */
export function progressPercent(state: Pick<GroupBuyState, 'targetSize' | 'currentSize'>): number {
  if (state.targetSize <= 0) return 0;
  return Math.min(100, Math.round((state.currentSize / state.targetSize) * 100));
}

/**
 * Guruh narxidagi chegirma foizi (butun son).
 * `soloPrice` 0 yoki manfiy bo'lsa — 0 (nolga bo'lish yo'q).
 */
export function discountPercent(soloPrice: number, groupPrice: number): number {
  if (!Number.isFinite(soloPrice) || soloPrice <= 0) return 0;
  if (!Number.isFinite(groupPrice) || groupPrice < 0) return 0;
  if (groupPrice >= soloPrice) return 0;
  return Math.round((1 - groupPrice / soloPrice) * 100);
}

/**
 * Mijoz shu guruhga qo'shilishi mumkinmi.
 * `null` — mumkin; aks holda rad etish sababi.
 */
export function canJoin(
  state: GroupBuyState,
  opts: { alreadyMember: boolean; now?: Date },
): JoinRejection | null {
  if (opts.alreadyMember) return 'ALREADY_MEMBER';
  if (state.status !== 'OPEN') return 'NOT_OPEN';
  if (isExpired(state, opts.now)) return 'EXPIRED';
  if (isFull(state)) return 'FULL';
  return null;
}

/**
 * Qo'shilishdan KEYIN guruh qanday statusga o'tishi kerak.
 * Faqat OPEN → COMPLETED o'tishi bor: oxirgi joy to'lsa guruh yopiladi.
 */
export function statusAfterJoin(state: GroupBuyState): GroupBuyStatusKey {
  if (state.status !== 'OPEN') return state.status;
  return state.currentSize + 1 >= state.targetSize ? 'COMPLETED' : 'OPEN';
}

/**
 * Ro'yxatni ko'rsatishda hisoblanadigan status: bazada hali OPEN turgan,
 * lekin muddati o'tgan guruh mijozga EXPIRED sifatida ko'rinadi (cron
 * yozib qo'ymaguncha ham to'g'ri ko'rsatiladi).
 */
export function effectiveStatus(state: GroupBuyState, now: Date = new Date()): GroupBuyStatusKey {
  if (state.status === 'OPEN' && isExpired(state, now)) return 'EXPIRED';
  return state.status;
}

/** Mijozga ko'rsatish uchun qolgan vaqt (millisekund, manfiy bo'lmaydi). */
export function msLeft(state: Pick<GroupBuyState, 'expiresAt'>, now: Date = new Date()): number {
  return Math.max(0, state.expiresAt.getTime() - now.getTime());
}
