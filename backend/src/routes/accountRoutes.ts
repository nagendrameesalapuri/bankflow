import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { chaosMiddleware } from '../middleware/chaosMiddleware';
import * as accountController from '../controllers/accountController';

const router = Router();

router.use(requireAuth, requireRole('CUSTOMER'));
router.get('/', chaosMiddleware(), accountController.listAccounts);
router.get('/:id', chaosMiddleware(), accountController.getAccount);

export default router;
