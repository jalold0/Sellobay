// Parol hashlash — @node-rs/argon2 (Rust/napi prebuilt).
// Eski `argon2` (C++ native) Vercel runtime'da Node ABI mosligi tufayli
// yuklanmasdi (login 401, register 500). @node-rs/argon2 barcha Node
// versiyalari uchun prebuilt binary keltiradi — versiyaga bog'liq emas.
// Standart argon2id PHC hash chiqaradi/o'qiydi → bazadagi eski hash'lar ishlayveradi.
import { hash, verify } from '@node-rs/argon2';

// algorithm tushirib qoldirilgan — @node-rs/argon2 standarti Argon2id.
// (Algorithm enum'i `isolatedModules` ostida import qilib bo'lmaydi.)
const ARGON_OPTIONS = {
  memoryCost: 2 ** 16,
  timeCost: 3,
  parallelism: 1,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON_OPTIONS);
}

export async function verifyPassword(hashStr: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashStr, plain);
  } catch {
    return false;
  }
}

const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function isStrongPassword(value: string): boolean {
  return PASSWORD_POLICY.test(value);
}
