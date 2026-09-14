import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as sessionRepo from '../repositories/sessionRepository';
import * as loginHistoryRepo from '../repositories/loginHistoryRepository';
import { query } from '../db/pool';
import { ApiError } from '../utils/ApiError';

export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const sessions = await sessionRepo.listActiveSessions(req.user!.sub);
  res.status(200).json({
    data: sessions.map((s) => ({
      id: s.id,
      deviceLabel: s.device_label,
      ipAddress: s.ip_address,
      userAgent: s.user_agent,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
      isCurrent: s.id === req.user!.sessionId,
    })),
  });
});

export const revokeSession = asyncHandler(async (req: Request, res: Response) => {
  const session = await sessionRepo.findSessionById(req.params.id);
  if (!session || session.user_id !== req.user!.sub) throw ApiError.notFound('Session not found.');
  await sessionRepo.revokeSession(req.params.id);
  res.status(200).json({ message: 'Session revoked.' });
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await sessionRepo.revokeAllSessions(req.user!.sub, req.user!.sessionId);
  res.status(200).json({ message: 'Logged out from all other devices.' });
});

export const loginHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await loginHistoryRepo.listLoginHistory(req.user!.sub, 30);
  res.status(200).json({ data: history });
});

export const setMfa = asyncHandler(async (req: Request, res: Response) => {
  const { enabled } = req.body as { enabled: boolean };
  await query('UPDATE users SET mfa_enabled = $2, updated_at = now() WHERE id = $1', [req.user!.sub, enabled]);
  res.status(200).json({ message: `MFA ${enabled ? 'enabled' : 'disabled'}.` });
});
