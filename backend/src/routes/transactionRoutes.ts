import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { chaosMiddleware } from '../middleware/chaosMiddleware';
import { validate } from '../middleware/validate';
import { listTransactionsSchema } from '../validators/transactionValidators';
import * as transactionController from '../controllers/transactionController';

const router = Router();

router.get(
  '/',
  requireAuth,
  requireRole('CUSTOMER', 'SUPPORT_AGENT'),
  chaosMiddleware(),
  validate({ query: listTransactionsSchema }),
  transactionController.listTransactions,
);

export default router;
