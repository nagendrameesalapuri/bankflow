import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import * as controller from '../controllers/securityController';

const router = Router();
router.use(requireAuth);

router.get('/sessions', controller.listSessions);
router.delete('/sessions/:id', controller.revokeSession);
router.post('/logout-all', controller.logoutAll);
router.get('/login-history', controller.loginHistory);
router.patch('/mfa', validate({ body: z.object({ enabled: z.boolean() }) }), controller.setMfa);

export default router;
