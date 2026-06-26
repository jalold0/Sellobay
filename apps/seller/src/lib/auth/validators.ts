import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Email yoki telefon kerak'),
  password: z.string().min(1, 'Parol kerak'),
});

export type LoginInput = z.infer<typeof loginSchema>;
