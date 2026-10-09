import { z } from 'zod';

/** DI tokeni: servisning tekshirilgan muhit o'zgaruvchilari. */
export const ENV = Symbol('ENV');

/** Hamma servisga umumiy o'zgaruvchilar. */
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'log', 'debug', 'verbose']).default('log'),
  /**
   * Gateway → servis ichki kaliti. Qo'yilsa, servis undan boshqa so'rovni rad etadi
   * (tarmoq noto'g'ri ochilib qolgan taqdirda ham xavfsizlik qatlami).
   */
  INTERNAL_API_KEY: z.string().min(16).optional(),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;

/**
 * Muhitni tekshiradi. Xato bo'lsa jarayon ISHGA TUSHMAYDI va nima yetishmayotgani
 * aniq aytiladi: noto'g'ri sozlangan servis jim ishlab turgandan ko'ra yiqilgani yaxshi.
 */
export function loadEnv<S extends z.ZodTypeAny>(
  schema: S,
  source: Record<string, string | undefined> = process.env,
): z.infer<S> {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`,
    );
    throw new Error(`Muhit o'zgaruvchilari noto'g'ri:\n${lines.join('\n')}`);
  }
  return parsed.data;
}

/** `true`/`false`/`1`/`0` matnini mantiqiy qiymatga aylantiradi (z.coerce.boolean() "false" ni true qiladi). */
export const envBool = (defaultValue: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v === undefined ? defaultValue : v === 'true' || v === '1'));
