import { query } from '../db/pool';

export interface SessionRow {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  device_label: string;
  ip_address: string;
  user_agent: string | null;
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
}

export async function createSession(input: {
  id: string;
  userId: string;
  refreshTokenHash: string;
  deviceLabel: string;
  ipAddress: string;
  userAgent?: string;
  expiresAt: Date;
}): Promise<SessionRow> {
  const { rows } = await query<SessionRow>(
    `INSERT INTO sessions (id, user_id, refresh_token_hash, device_label, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      input.id,
      input.userId,
      input.refreshTokenHash,
      input.deviceLabel,
      input.ipAddress,
      input.userAgent ?? null,
      input.expiresAt,
    ],
  );
  return rows[0];
}

export async function findSessionById(id: string): Promise<SessionRow | null> {
  const { rows } = await query<SessionRow>('SELECT * FROM sessions WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function listActiveSessions(userId: string): Promise<SessionRow[]> {
  const { rows } = await query<SessionRow>(
    `SELECT * FROM sessions WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now() ORDER BY created_at DESC`,
    [userId],
  );
  return rows;
}

export async function revokeSession(id: string): Promise<void> {
  await query('UPDATE sessions SET revoked_at = now() WHERE id = $1', [id]);
}

export async function revokeAllSessions(userId: string, exceptId?: string): Promise<void> {
  await query(
    `UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL AND id != COALESCE($2, '00000000-0000-0000-0000-000000000000')`,
    [userId, exceptId ?? null],
  );
}
