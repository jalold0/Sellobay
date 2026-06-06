import crypto from 'node:crypto';

export function generateOtpCode(length: number = 6): string {
  const max = 10 ** length;
  const value = crypto.randomInt(0, max);
  return value.toString().padStart(length, '0');
}

export function hashOtp(code: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(code).digest('hex');
}

export function verifyOtp(code: string, hash: string, salt: string): boolean {
  const computed = hashOtp(code, salt);
  return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
}
