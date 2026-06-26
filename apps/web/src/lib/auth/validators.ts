import { z } from 'zod';

// Foydalanuvchi kiritmasi: +998 90 111 22 33 bo'lishi mumkin (bo'shliq/tire bilan).
// Server normalizeUzPhone() bilan E.164 ga keltiradi. Bu yerda asosan "qisman bo'sh emasligini" tekshiramiz.
const phoneSchema = z
  .string()
  .trim()
  .min(9, 'Telefon raqami juda qisqa')
  .max(20, 'Telefon raqami juda uzun')
  .regex(/^[+\d\s()-]+$/, "Telefon faqat raqamlar, +, bo'shliq va () belgilarini o'z ichiga oladi");

const passwordSchema = z
  .string()
  .min(8, 'Kamida 8 ta belgi')
  .regex(/[A-Za-z]/, 'Kamida bitta harf')
  .regex(/\d/, 'Kamida bitta raqam');

export const registerSchema = z
  .object({
    email: z.string().email().optional(),
    phone: phoneSchema.optional(),
    password: passwordSchema,
    firstName: z.string().trim().min(1).max(50).optional(),
    lastName: z.string().trim().min(1).max(50).optional(),
    locale: z.enum(['uz', 'ru', 'en']).default('uz'),
    // Foydalanuvchi turi: customer (default) yoki seller (sotuvchi sifatida ariza)
    role: z.enum(['customer', 'seller']).default('customer'),
  })
  .refine((v) => v.email || v.phone, { message: 'Email yoki telefon kerak' });

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Email yoki telefon kerak'),
  password: z.string().min(1, 'Parol kerak'),
});

export const otpSendSchema = z.object({
  phone: phoneSchema,
});

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, '6 raqamli kod'),
  // Yangi foydalanuvchi uchun ixtiyoriy ism
  firstName: z.string().trim().min(1).max(50).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OtpSendInput = z.infer<typeof otpSendSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
