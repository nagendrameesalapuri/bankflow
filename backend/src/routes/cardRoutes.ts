import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { chaosMiddleware } from '../middleware/chaosMiddleware';
import { validate } from '../middleware/validate';
import * as controller from '../controllers/cardController';
import {
  changeLimitSchema,
  listCardTxSchema,
  requestCardSchema,
  updateControlsSchema,
  setPinSchema,
} from '../validators/cardValidators';

const router = Router();
router.use(requireAuth, requireRole('CUSTOMER'));

router.get('/', chaosMiddleware(), controller.list);
router.post('/', chaosMiddleware(), validate({ body: requestCardSchema }), controller.requestCard);
router.get('/:id/transactions', validate({ query: listCardTxSchema }), controller.transactions);
router.post('/:id/block', controller.block);
router.post('/:id/unblock', controller.unblock);
router.post('/:id/freeze', controller.freeze);
router.patch('/:id/limit', validate({ body: changeLimitSchema }), controller.changeLimit);
router.patch('/:id/controls', validate({ body: updateControlsSchema }), controller.updateControls);
router.post('/:id/pin', validate({ body: setPinSchema }), controller.setPin);

export default router;
