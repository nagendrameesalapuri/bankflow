import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import * as controller from '../controllers/adminController';
import {
  listUsersSchema,
  listAccountsSchema,
  listTransactionsSchema,
  auditLogsSchema,
  createUserSchema,
  updateUserSchema,
} from '../validators/adminValidators';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

router.get('/stats', controller.stats);
router.get('/system-health', controller.systemHealth);

router.get('/users', validate({ query: listUsersSchema }), controller.listUsers);
router.post('/users', validate({ body: createUserSchema }), controller.createUser);
router.patch('/users/:id', validate({ body: updateUserSchema }), controller.updateUser);
router.post('/users/:id/activate', controller.activateUser);
router.post('/users/:id/deactivate', controller.deactivateUser);
router.post('/users/:id/lock', controller.lockUser);
router.post('/users/:id/unlock', controller.unlockUser);

router.get('/accounts', validate({ query: listAccountsSchema }), controller.listAccounts);
router.get('/transactions', validate({ query: listTransactionsSchema }), controller.listTransactions);
router.get('/audit-logs', validate({ query: auditLogsSchema }), controller.auditLogs);

export default router;
