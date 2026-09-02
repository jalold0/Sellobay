import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface AccessPayload extends JWTPayload {
  sub: string;
  roles: string[];
  sid?: string;
}

export interface RefreshPayload extends JWTPayload {
  sub: string;
  jti: string;
  family: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  issuer?: string;
  audience?: string;
}

const encoder = new TextEncoder();

/**
 * Sirni kalitga o'giradi va BO'SHLIGINI shu yerda rad etadi.
 *
 * Ilgari chaqiruvchilar `process.env.JWT_SECRET ?? ''` yozardi va sir
 * qo'yilmagan muhitda token BO'SH kalit bilan imzolanardi. Bu ikki xil
 * zarar keltirardi:
 *
 *   1. Xavfsizlik — bo'sh kalit sir emas. Uni bilgan (ya'ni hamma)
 *      istalgan foydalanuvchi nomidan haqiqiy access token yasab, API
 *      himoyasidan o'tib keta olardi.
 *
 *   2. Tushunarsiz xatolik — jose Node runtime'da nol uzunlikdagi HMAC
 *      kalitni qabul qiladi, Edge runtime'dagi WebCrypto esa RAD ETADI.
 *      Natijada login va /api/auth/me ishlab turardi, lekin edge
 *      middleware o'sha tokenni "yaroqsiz" deb bilib, kirgan
 *      foydalanuvchini har safar /login ga qaytaraverardi.
 *
 * Endi bu holat jim o'tmaydi.
 */
function keyFrom(secret: string): Uint8Array {
  if (!secret) {
    throw new Error(
      'JWT siri bo`sh. JWT_SECRET muhit o`zgaruvchisini qo`ying (Vercel: Project > Settings > Environment Variables).',
    );
  }
  return encoder.encode(secret);
}

export async function signAccessToken(payload: Omit<AccessPayload, 'iat' | 'exp'>, cfg: JwtConfig) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(cfg.expiresIn)
    .setIssuer(cfg.issuer ?? 'ecommerce')
    .sign(keyFrom(cfg.secret));
}

export async function signRefreshToken(
  payload: Omit<RefreshPayload, 'iat' | 'exp'>,
  cfg: JwtConfig,
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(cfg.expiresIn)
    .setIssuer(cfg.issuer ?? 'ecommerce')
    .sign(keyFrom(cfg.secret));
}

export async function verifyToken<T extends JWTPayload>(token: string, secret: string): Promise<T> {
  const { payload } = await jwtVerify(token, keyFrom(secret));
  return payload as T;
}
