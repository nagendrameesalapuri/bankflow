import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: 'CUSTOMER' | 'SUPPORT_AGENT' | 'ADMIN';
  sessionId: string;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
}

export interface PendingLoginPayload {
  sub: string;
  type: 'login_pending';
  rememberMe: boolean;
}

export function signPendingLoginToken(payload: PendingLoginPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: '5m' });
}

export function verifyPendingLoginToken(token: string): PendingLoginPayload {
  const payload = jwt.verify(token, env.jwtAccessSecret) as PendingLoginPayload;
  if (payload.type !== 'login_pending') throw new Error('Invalid token type');
  return payload;
}

export interface PasswordResetPayload {
  sub: string;
  type: 'password_reset';
}

export function signPasswordResetToken(payload: PasswordResetPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: '15m' });
}

export function verifyPasswordResetToken(token: string): PasswordResetPayload {
  const payload = jwt.verify(token, env.jwtAccessSecret) as PasswordResetPayload;
  if (payload.type !== 'password_reset') throw new Error('Invalid token type');
  return payload;
}
