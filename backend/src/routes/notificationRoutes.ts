import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { chaosMiddleware } from '../middleware/chaosMiddleware';
import * as controller from '../controllers/notificationController';

const router = Router();
router.use(requireAuth);

router.get('/', chaosMiddleware(), controller.list);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', controller.markRead);
router.delete('/:id', controller.remove);

export default router;
