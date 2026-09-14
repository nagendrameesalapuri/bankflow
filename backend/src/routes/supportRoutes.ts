import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import * as controller from '../controllers/supportController';

const router = Router();
router.use(requireAuth, requireRole('SUPPORT_AGENT', 'ADMIN'));

const listSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get('/customers', validate({ query: listSchema }), controller.searchCustomers);
router.get('/customers/:id', controller.getCustomer);
router.get('/customers/:id/transactions', controller.getCustomerTransactions);

export default router;
