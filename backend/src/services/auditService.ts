import { query } from '../db/pool';

export async function recordAudit(entry: {
  actorUserId?: string | null;
  actorUsername?: string | null;
  action: string;
  target?: string;
  ipAddress: string;
  result: 'SUCCESS' | 'FAILURE';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await query(
    `INSERT INTO audit_logs (actor_user_id, actor_username, action, target, ip_address, result, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      entry.actorUserId ?? null,
      entry.actorUsername ?? null,
      entry.action,
      entry.target ?? null,
      entry.ipAddress,
      entry.result,
      JSON.stringify(entry.metadata ?? {}),
    ],
  );
}
