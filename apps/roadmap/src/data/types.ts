/**
 * Ish jarayoni ma'lumot modeli.
 *
 * Ma'lumot ATAYLAB repo ichida, bazada emas: har bir o'zgarish MR orqali o'tadi,
 * ya'ni tarixi, ko'rib chiqilishi va orqaga qaytarilishi bor. Holat "kimdir
 * yangilashni unutdi" sababli eskirib qolmaydi — kod bilan birga o'zgaradi.
 */

/** Bo'lim holati. `gap` — yo'q VA bu xavf; `idle` — yo'q, lekin hozircha zarur emas. */
export type Status = 'done' | 'wip' | 'planned' | 'gap' | 'idle';

/** Vazifa kimning zimmasida. Hodim vazifalari shu bo'yicha guruhlanadi. */
export type Role =
  | 'asoschi'
  | 'backend'
  | 'frontend'
  | 'mobil'
  | 'dizayn'
  | 'operator'
  | 'kontent'
  | 'devops';

export type Priority = 'kritik' | 'yuqori' | 'orta' | 'past';

export type Layer =
  | 'Mijoz ilovalari'
  | 'Kirish qatlami'
  | 'Domen'
  | "Ma'lumot"
  | 'Kesishuvchi'
  | 'Yetkazib berish';

export interface Task {
  title: string;
  role: Role;
  priority: Priority;
  /** Nega kerak — hodim kontekstsiz tushunishi uchun. */
  why?: string;
}

export interface Feature {
  title: string;
  /** Bu funksiya NIMA QILADI — o'qitish uchun, bir jumlada, biznes tilida. */
  does: string;
  status: Status;
  /** Kod manzili yoki o'lchov — bahoni tekshirish mumkin bo'lsin. */
  evidence?: string;
  tasks?: Task[];
}

export interface Module {
  id: string;
  name: string;
  layer: Layer;
  /** Modul nima uchun mavjud — bo'lim tavsifi. */
  purpose: string;
  owner: Role;
  features: Feature[];
}

export const STATUS_LABEL: Record<Status, string> = {
  done: 'Tayyor',
  wip: 'Jarayonda',
  planned: 'Rejada',
  gap: 'Yoʻq — xavf',
  idle: 'Hozircha shart emas',
};

export const STATUS_COLOR: Record<Status, string> = {
  done: 'ok',
  wip: 'wip',
  planned: 'idle',
  gap: 'gap',
  idle: 'idle',
};

export const ROLE_LABEL: Record<Role, string> = {
  asoschi: 'Asoschi',
  backend: 'Backend',
  frontend: 'Frontend',
  mobil: 'Mobil',
  dizayn: 'Dizayn',
  operator: 'Operator',
  kontent: 'Kontent',
  devops: 'DevOps',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  kritik: 'Kritik',
  yuqori: 'Yuqori',
  orta: "O'rta",
  past: 'Past',
};

export const PRIORITY_ORDER: Record<Priority, number> = {
  kritik: 0,
  yuqori: 1,
  orta: 2,
  past: 3,
};

/** Tayyorlik foizi: `done` = 1, `wip` = 0.5, qolgani = 0. `idle` hisobga kirmaydi. */
export function readiness(features: Feature[]): { pct: number; counted: number } {
  const counted = features.filter((f) => f.status !== 'idle');
  if (counted.length === 0) return { pct: 100, counted: 0 };
  const score = counted.reduce(
    (s, f) => s + (f.status === 'done' ? 1 : f.status === 'wip' ? 0.5 : 0),
    0,
  );
  return { pct: Math.round((score / counted.length) * 100), counted: counted.length };
}
