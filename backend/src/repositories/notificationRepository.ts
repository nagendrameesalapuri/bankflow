import { query } from '../db/pool';

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: Date;
}

export async function listByUser(userId: string, page: number, limit: number) {
  const { rows: countRows } = await query<{ count: string }>(
    'SELECT COUNT(*) FROM notifications WHERE user_id = $1',
    [userId],
  );
  const { rows: unreadRows } = await query<{ count: string }>(
    'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
    [userId],
  );
  const { rows } = await query<NotificationRow>(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [userId, limit, (page - 1) * limit],
  );
  return { rows, total: Number(countRows[0].count), unreadCount: Number(unreadRows[0].count) };
}

export async function findById(id: string): Promise<NotificationRow | null> {
  const { rows } = await query<NotificationRow>('SELECT * FROM notifications WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function markRead(id: string): Promise<void> {
  await query('UPDATE notifications SET is_read = true WHERE id = $1', [id]);
}

export async function markAllRead(userId: string): Promise<void> {
  await query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [userId]);
}

export async function remove(id: string): Promise<void> {
  await query('DELETE FROM notifications WHERE id = $1', [id]);
}
