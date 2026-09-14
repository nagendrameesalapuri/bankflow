import { v4 as uuid } from 'uuid';
import { ApiError } from '../utils/ApiError';
import { compareValue, hashValue } from '../utils/password';
import {
  signAccessToken,
  signRefreshToken,
  signPendingLoginToken,
  verifyPendingLoginToken,
  verifyRefreshToken,
  signPasswordResetToken,
  verifyPasswordResetToken,
} from '../utils/jwt';
import * as userRepo from '../repositories/userRepository';
import * as sessionRepo from '../repositories/sessionRepository';
import * as loginHistoryRepo from '../repositories/loginHistoryRepository';
import * as otpService from './otpService';
import { recordAudit } from './auditService';
import { pushAdminActivity } from './activityFeedService';
import { toPublicUser } from '../types/domain';
import { env } from '../config/env';

interface RequestMeta {
  ipAddress: string;
  userAgent?: string;
}

export async function login(username: string, password: string, rememberMe: boolean, meta: RequestMeta) {
  const user = await userRepo.findByUsernameOrEmail(username);

  if (!user) {
    await loginHistoryRepo.recordLoginAttempt({
      userId: null,
      usernameAttempted: username,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      status: 'FAILED',
      reason: 'USER_NOT_FOUND',
    });
    throw ApiError.unauthorized('Invalid username or password.');
  }

  if (user.status === 'LOCKED' && user.locked_until && user.locked_until.getTime() > Date.now()) {
    await loginHistoryRepo.recordLoginAttempt({
      userId: user.id,
      usernameAttempted: username,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      status: 'FAILED',
      reason: 'ACCOUNT_LOCKED',
    });
    throw new ApiError(423, 'ACCOUNT_LOCKED', `Account is locked until ${user.locked_until.toISOString()}.`);
  }

  if (user.status === 'DISABLED') {
    throw ApiError.forbidden('This account has been disabled. Contact support.');
  }

  const passwordOk = await compareValue(password, user.password_hash);
  if (!passwordOk) {
    const updated = await userRepo.incrementFailedAttempts(user.id);
    let reason = 'BAD_PASSWORD';
    if (updated.failed_login_attempts >= env.loginMaxAttempts) {
      const until = new Date(Date.now() + env.loginLockoutMinutes * 60_000);
      await userRepo.lockUser(user.id, until);
      reason = 'ACCOUNT_LOCKED_THIS_ATTEMPT';
    }
    await loginHistoryRepo.recordLoginAttempt({
      userId: user.id,
      usernameAttempted: username,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      status: 'FAILED',
      reason,
    });
    await recordAudit({
      actorUserId: user.id,
      actorUsername: user.username,
      action: 'LOGIN_FAILED',
      ipAddress: meta.ipAddress,
      result: 'FAILURE',
      metadata: { reason },
    });
    throw ApiError.unauthorized('Invalid username or password.');
  }

  await userRepo.resetFailedAttempts(user.id);

  if (!user.mfa_enabled) {
    const session = await createSessionForUser(user.id, rememberMe, meta);
    await loginHistoryRepo.recordLoginAttempt({
      userId: user.id,
      usernameAttempted: username,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      status: 'SUCCESS',
    });
    return { requiresOtp: false as const, ...session, user: toPublicUser(user) };
  }

  const loginToken = signPendingLoginToken({ sub: user.id, type: 'login_pending', rememberMe });
  const otp = await otpService.issueOtp(user.id, 'LOGIN');
  return { requiresOtp: true as const, loginToken, ...otp };
}

export async function resendLoginOtp(loginToken: string) {
  const payload = verifyPendingLoginToken(loginToken);
  return otpService.issueOtp(payload.sub, 'LOGIN');
}

export async function verifyLoginOtp(loginToken: string, code: string, meta: RequestMeta) {
  const payload = verifyPendingLoginToken(loginToken);
  await otpService.verifyOtp(payload.sub, 'LOGIN', code);

  const user = await userRepo.findById(payload.sub);
  if (!user) throw ApiError.unauthorized();

  const session = await createSessionForUser(user.id, payload.rememberMe, meta);
  await loginHistoryRepo.recordLoginAttempt({
    userId: user.id,
    usernameAttempted: user.username,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    status: 'SUCCESS',
  });
  await recordAudit({
    actorUserId: user.id,
    actorUsername: user.username,
    action: 'LOGIN_SUCCESS',
    ipAddress: meta.ipAddress,
    result: 'SUCCESS',
  });
  pushAdminActivity('LOGIN', `${user.full_name} (${user.role_name}) logged in.`, { username: user.username, ip: meta.ipAddress });

  return { ...session, user: toPublicUser(user) };
}

async function createSessionForUser(userId: string, rememberMe: boolean, meta: RequestMeta) {
  const user = await userRepo.findById(userId);
  if (!user) throw ApiError.unauthorized();

  // Generate the session id up-front so it can be embedded in the refresh
  // JWT before the token (and its hash) is ever computed or stored.
  const sessionId = uuid();
  const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000);
  const refreshToken = signRefreshToken({ sub: userId, sessionId });
  const refreshTokenHash = await hashValue(refreshToken);

  await sessionRepo.createSession({
    id: sessionId,
    userId,
    refreshTokenHash,
    deviceLabel: guessDeviceLabel(meta.userAgent),
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    expiresAt,
  });

  const accessToken = signAccessToken({
    sub: userId,
    username: user.username,
    role: user.role_name,
    sessionId,
  });
  return { accessToken, refreshToken, sessionId };
}

function guessDeviceLabel(userAgent?: string): string {
  if (!userAgent) return 'Unknown device';
  if (/mobile/i.test(userAgent)) return 'Mobile browser';
  if (/mac os/i.test(userAgent)) return 'Mac - Browser';
  if (/windows/i.test(userAgent)) return 'Windows - Browser';
  return 'Browser';
}

export async function refreshSession(refreshToken: string, meta: RequestMeta) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Session expired. Please log in again.');
  }

  const session = await sessionRepo.findSessionById(payload.sessionId);
  if (!session || session.revoked_at || session.expires_at.getTime() < Date.now()) {
    throw ApiError.unauthorized('Session expired. Please log in again.');
  }
  const matches = await compareValue(refreshToken, session.refresh_token_hash);
  if (!matches) {
    throw ApiError.unauthorized('Session expired. Please log in again.');
  }

  const user = await userRepo.findById(session.user_id);
  if (!user || user.status !== 'ACTIVE') throw ApiError.unauthorized();

  const accessToken = signAccessToken({
    sub: user.id,
    username: user.username,
    role: user.role_name,
    sessionId: session.id,
  });
  return { accessToken, user: toPublicUser(user) };
}

export async function logout(sessionId: string | undefined) {
  if (sessionId) await sessionRepo.revokeSession(sessionId);
}

export async function forgotPassword(email: string) {
  const user = await userRepo.findByUsernameOrEmail(email);
  if (!user) {
    // Do not reveal whether the email exists.
    return { devResetToken: undefined };
  }
  const token = signPasswordResetToken({ sub: user.id, type: 'password_reset' });
  return { devResetToken: env.isProduction ? undefined : token };
}

export async function resetPassword(token: string, newPassword: string) {
  let payload;
  try {
    payload = verifyPasswordResetToken(token);
  } catch {
    throw ApiError.badRequest('This reset link is invalid or has expired.');
  }
  const hash = await hashValue(newPassword);
  await userRepo.updatePasswordHash(payload.sub, hash);
  await sessionRepo.revokeAllSessions(payload.sub);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await userRepo.findById(userId);
  if (!user) throw ApiError.notFound();
  const ok = await compareValue(currentPassword, user.password_hash);
  if (!ok) throw ApiError.badRequest('Current password is incorrect.');
  const hash = await hashValue(newPassword);
  await userRepo.updatePasswordHash(userId, hash);
}
