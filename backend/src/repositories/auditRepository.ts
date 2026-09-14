import { query } from '../db/pool';

export interface AuditLogRow {
  id: string;
  actor_user_id: string | null;
  actor_username: string | null;
  action: string;
  target: string | null;
  ip_address: string;
  result: string;
  metadata: unknown;
  created_at: Date;
}

export async function listAuditLogs(opts: { page: number; limit: number; action?: string; result?: string }) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (opts.action) {
    params.push(opts.action);
    conditions.push(`action = $${params.length}`);
  }
  if (opts.result) {
    params.push(opts.result);
    conditions.push(`result = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows: countRows } = await query<{ count: string }>(`SELECT COUNT(*) FROM audit_logs ${where}`, params);
  params.push(opts.limit, (opts.page - 1) * opts.limit);
  const { rows } = await query<AuditLogRow>(
    `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { rows, total: Number(countRows[0].count) };
}
