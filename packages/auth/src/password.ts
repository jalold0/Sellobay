import type argon2Types from 'argon2';

// argon2 — native (.node) modul. Top-level import qilinsa, build vaqtida
// (Next.js "collect page data") native binary yuklanadi va platforma/abi mos
// kelmasa build yiqiladi. Shuning uchun faqat funksiya chaqirilganda lazy yuklaymiz.
async function loadArgon2(): Promise<typeof argon2Types> {
  const mod = await import('argon2');
  return (mod.default ?? mod) as typeof argon2Types;
}

function argonOptions(argon2: typeof argon2Types): argon2Types.Options {
  return {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  };
}

export async function hashPassword(plain: string): Promise<string> {
  const argon2 = await loadArgon2();
  return argon2.hash(plain, argonOptions(argon2));
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    const argon2 = await loadArgon2();
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function isStrongPassword(value: string): boolean {
  return PASSWORD_POLICY.test(value);
}
