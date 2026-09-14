import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { chaosMiddleware } from '../middleware/chaosMiddleware';
import { validate } from '../middleware/validate';
import * as controller from '../controllers/paymentController';
import {
  billLookupSchema,
  initiatePaymentSchema,
  verifyPaymentOtpSchema,
  listPaymentsSchema,
} from '../validators/paymentValidators';

const router = Router();
router.use(requireAuth, requireRole('CUSTOMER'));

router.get('/billers', controller.billers);
router.post('/bills/lookup', chaosMiddleware(), validate({ body: billLookupSchema }), controller.lookupBill);
router.get('/', validate({ query: listPaymentsSchema }), controller.list);
router.post('/', chaosMiddleware(), validate({ body: initiatePaymentSchema }), controller.initiate);
router.post('/:id/verify-otp', chaosMiddleware(), validate({ body: verifyPaymentOtpSchema }), controller.verifyOtp);

export default router;
