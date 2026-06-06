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

export async function signAccessToken(payload: Omit<AccessPayload, 'iat' | 'exp'>, cfg: JwtConfig) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(cfg.expiresIn)
    .setIssuer(cfg.issuer ?? 'ecommerce')
    .sign(encoder.encode(cfg.secret));
}

export async function signRefreshToken(payload: Omit<RefreshPayload, 'iat' | 'exp'>, cfg: JwtConfig) {
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
