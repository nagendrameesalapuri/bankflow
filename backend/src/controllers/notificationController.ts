import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as notificationRepo from '../repositories/notificationRepository';
import { ApiError } from '../utils/ApiError';

function toPublic(n: notificationRepo.NotificationRow) {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    isRead: n.is_read,
    createdAt: n.created_at,
  };
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const { rows, total, unreadCount } = await notificationRepo.listByUser(req.user!.sub, page, limit);
  res.status(200).json({
    data: rows.map(toPublic),
    unreadCount,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationRepo.findById(req.params.id);
  if (!notification || notification.user_id !== req.user!.sub) throw ApiError.notFound('Notification not found.');
  await notificationRepo.markRead(req.params.id);
  res.status(200).json({ message: 'Marked as read.' });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationRepo.markAllRead(req.user!.sub);
  res.status(200).json({ message: 'All notifications marked as read.' });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationRepo.findById(req.params.id);
  if (!notification || notification.user_id !== req.user!.sub) throw ApiError.notFound('Notification not found.');
  await notificationRepo.remove(req.params.id);
  res.status(204).send();
});
