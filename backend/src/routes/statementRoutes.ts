import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { chaosMiddleware } from '../middleware/chaosMiddleware';
import { validate } from '../middleware/validate';
import * as controller from '../controllers/statementController';
import { generateStatementSchema, listStatementsSchema } from '../validators/statementValidators';

const router = Router();
router.use(requireAuth, requireRole('CUSTOMER'));

router.get('/', validate({ query: listStatementsSchema }), controller.list);
router.post('/generate', chaosMiddleware(), validate({ body: generateStatementSchema }), controller.generate);
router.get('/:id/download.pdf', chaosMiddleware(), controller.downloadPdf);
router.get('/:id/download.csv', chaosMiddleware(), controller.downloadCsv);

export default router;
