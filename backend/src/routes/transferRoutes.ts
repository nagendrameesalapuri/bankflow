import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { chaosMiddleware } from '../middleware/chaosMiddleware';
import { validate } from '../middleware/validate';
import * as controller from '../controllers/transferController';
import { transferInputSchema, verifyTransferOtpSchema } from '../validators/transferValidators';

const router = Router();
router.use(requireAuth, requireRole('CUSTOMER'));

router.post('/quote', chaosMiddleware(), validate({ body: transferInputSchema }), controller.quote);
router.post('/', chaosMiddleware(), validate({ body: transferInputSchema }), controller.initiate);
router.post('/:id/verify-otp', chaosMiddleware(), validate({ body: verifyTransferOtpSchema }), controller.verifyOtp);

export default router;
