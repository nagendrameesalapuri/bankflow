import { query } from '../db/pool';

export interface OtpRow {
  id: string;
  user_id: string;
  purpose: string;
  code_hash: string;
  dev_code: string | null;
  context: Record<string, unknown>;
  attempt_count: number;
  consumed_at: Date | null;
  expires_at: Date;
  created_at: Date;
}

export async function insertOtp(input: {
  userId: string;
  purpose: string;
  codeHash: string;
  devCode: string;
  context: Record<string, unknown>;
  expiresAt: Date;
}): Promise<OtpRow> {
  // Invalidate any prior outstanding OTPs of the same purpose for this user
  await query(
    `UPDATE otp_codes SET consumed_at = now() WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`,
    [input.userId, input.purpose],
  );
  const { rows } = await query<OtpRow>(
    `INSERT INTO otp_codes (user_id, purpose, code_hash, dev_code, context, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [input.userId, input.purpose, input.codeHash, input.devCode, JSON.stringify(input.context), input.expiresAt],
  );
  return rows[0];
}

export async function findLatestOtp(userId: string, purpose: string): Promise<OtpRow | null> {
  const { rows } = await query<OtpRow>(
    `SELECT * FROM otp_codes WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [userId, purpose],
  );
  return rows[0] ?? null;
}

export async function incrementOtpAttempts(id: string): Promise<void> {
  await query(`UPDATE otp_codes SET attempt_count = attempt_count + 1 WHERE id = $1`, [id]);
}

export async function consumeOtp(id: string): Promise<void> {
  await query(`UPDATE otp_codes SET consumed_at = now() WHERE id = $1`, [id]);
}
