// Auth konfiguratsiyasi. Sirlar env'dan keladi.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

export const ACCESS_SECRET = process.env.JWT_SECRET ?? '';
export const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? ACCESS_SECRET;
export const ACCESS_TTL = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
export const REFRESH_TTL_DAYS = 30;

export const COOKIE_ACCESS = 'sb_at';
export const COOKIE_REFRESH = 'sb_rt';

export const OTP_TTL_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 5;

export function assertAuthEnv(): void {
  requireEnv('JWT_SECRET');
}
