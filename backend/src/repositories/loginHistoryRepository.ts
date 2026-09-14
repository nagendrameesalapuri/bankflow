import { query } from '../db/pool';

export async function recordLoginAttempt(input: {
  userId: string | null;
  usernameAttempted: string;
  ipAddress: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILED';
  reason?: string;
}): Promise<void> {
  await query(
    `INSERT INTO login_history (user_id, username_attempted, ip_address, user_agent, status, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.userId, input.usernameAttempted, input.ipAddress, input.userAgent ?? null, input.status, input.reason ?? null],
  );
}

export async function listLoginHistory(userId: string, limit = 20) {
  const { rows } = await query(
    `SELECT * FROM login_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit],
  );
  return rows;
}
