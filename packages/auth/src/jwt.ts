// Access token — HS256 JWT.
//
// Refresh token JWT EMAS: u tasodifiy opaque satr bo'lib, bazada SHA-256 hash
// sifatida saqlanadi va rotatsiyada revoke qilinadi (qarang auth/session.ts).
// Shu sababli ilgari bu yerda turgan `signRefreshToken` va `RefreshPayload`
// hech qayerda ishlatilmasdi — ular olib tashlandi. `JWT_REFRESH_SECRET`
// o'zgaruvchisi ham shu sababli ishlatilmaydi.
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface AccessPayload extends JWTPayload {
  sub: string;
  roles: string[];
  sid?: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  issuer?: string;
  audience?: string;
}

const encoder = new TextEncoder();

export async function signAccessToken(payload: Omit<AccessPayload, 'iat' | 'exp'>, cfg: JwtConfig) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(cfg.expiresIn)
    .setIssuer(cfg.issuer ?? 'ecommerce')
    .sign(encoder.encode(cfg.secret));
}

export async function verifyToken<T extends JWTPayload>(token: string, secret: string): Promise<T> {
  const { payload } = await jwtVerify(token, encoder.encode(secret));
  return payload as T;
}
