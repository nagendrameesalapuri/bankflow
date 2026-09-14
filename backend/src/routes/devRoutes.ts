import { Router } from 'express';
import { requireAuth, requireRole, requireDevTool } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import * as controller from '../controllers/devController';
import { upsertChaosRuleSchema } from '../validators/devValidators';

const router = Router();
router.use(requireDevTool, requireAuth, requireRole('ADMIN'));

router.get('/chaos-config', controller.listChaosRoutes);
router.put('/chaos-config', validate({ body: upsertChaosRuleSchema }), controller.upsertChaosRule);
router.post('/chaos-config/reset', controller.resetChaos);

router.post('/reset', controller.resetEnvironment);

router.get('/api-lab/endpoints', controller.apiLabEndpoints);

router.get('/challenges', controller.challenges);
router.post('/challenges/:id/reset', controller.resetChallenge);

export default router;
