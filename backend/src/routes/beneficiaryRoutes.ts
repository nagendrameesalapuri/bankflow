import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { chaosMiddleware } from '../middleware/chaosMiddleware';
import { validate } from '../middleware/validate';
import * as controller from '../controllers/beneficiaryController';
import {
  newBeneficiarySchema,
  confirmOtpSchema,
  updateBeneficiarySchema,
  verifyAccountSchema,
} from '../validators/beneficiaryValidators';

const router = Router();
router.use(requireAuth, requireRole('CUSTOMER'));

router.get('/', chaosMiddleware(), controller.list);
router.post('/verify-account', chaosMiddleware(), validate({ body: verifyAccountSchema }), controller.verifyAccount);
router.post('/', chaosMiddleware(), validate({ body: newBeneficiarySchema }), controller.initiate);
router.post('/confirm', chaosMiddleware(), validate({ body: confirmOtpSchema }), controller.confirm);
router.patch('/:id', validate({ body: updateBeneficiarySchema }), controller.update);
router.post('/:id/activate', controller.activate);
router.post('/:id/deactivate', controller.deactivate);
router.delete('/:id', controller.remove);

export default router;
