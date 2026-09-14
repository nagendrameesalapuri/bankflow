import { query } from '../db/pool';
import { emitToUser } from '../sockets/io';

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'SECURITY';

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType = 'INFO',
) {
  const { rows } = await query(
    `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, title, message, type],
  );
  const notification = rows[0];
  emitToUser(userId, 'notification:new', {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    isRead: notification.is_read,
    createdAt: notification.created_at,
  });
  return notification;
}
