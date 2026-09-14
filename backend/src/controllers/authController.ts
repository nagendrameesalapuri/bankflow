import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { getRequestMeta } from '../utils/requestMeta';
import { env } from '../config/env';
import * as authService from '../services/authService';

const REFRESH_COOKIE = 'bf_refresh_token';

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.crossSiteCookies || env.isProduction,
    sameSite: env.crossSiteCookies ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password, rememberMe } = req.body;
  const result = await authService.login(username, password, rememberMe, getRequestMeta(req));
  if (result.requiresOtp) {
    return res.status(200).json({
      requiresOtp: true,
      loginToken: result.loginToken,
      expiresInSeconds: result.expiresInSeconds,
      devOtp: result.devOtp,
    });
  }
  setRefreshCookie(res, result.refreshToken);
  res.status(200).json({ requiresOtp: false, accessToken: result.accessToken, user: result.user });
});

export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.resendLoginOtp(req.body.loginToken);
  res.status(200).json(result);
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { loginToken, otp } = req.body;
  const result = await authService.verifyLoginOtp(loginToken, otp, getRequestMeta(req));
  setRefreshCookie(res, result.refreshToken);
  res.status(200).json({ accessToken: result.accessToken, user: result.user });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No active session.' } });
  }
  const result = await authService.refreshSession(token, getRequestMeta(req));
  res.status(200).json(result);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.user?.sessionId);
  clearRefreshCookie(res);
  res.status(204).send();
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.forgotPassword(req.body.email);
  res.status(200).json({
    message: 'If that account exists, password reset instructions have been sent.',
    devResetToken: result.devResetToken,
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  res.status(200).json({ message: 'Password has been reset. Please log in.' });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.changePassword(req.user!.sub, req.body.currentPassword, req.body.newPassword);
  res.status(200).json({ message: 'Password changed successfully.' });
});
