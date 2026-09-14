import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { chaosMiddleware } from '../middleware/chaosMiddleware';
import { validate } from '../middleware/validate';
import { photoUpload, documentUpload } from '../middleware/upload';
import * as controller from '../controllers/profileController';
import {
  updateProfileSchema,
  sensitiveUpdateSchema,
  confirmSensitiveUpdateSchema,
  preferencesSchema,
} from '../validators/profileValidators';

const router = Router();
router.use(requireAuth);

router.get('/', chaosMiddleware(), controller.getProfile);
router.patch('/', validate({ body: updateProfileSchema }), controller.updateProfile);
router.post('/sensitive-update/initiate', validate({ body: sensitiveUpdateSchema }), controller.initiateSensitiveUpdate);
router.post(
  '/sensitive-update/confirm',
  validate({ body: confirmSensitiveUpdateSchema }),
  controller.confirmSensitiveUpdate,
);
router.post('/photo', photoUpload.single('photo'), controller.uploadPhoto);
router.patch('/preferences', validate({ body: preferencesSchema }), controller.updatePreferences);

router.get('/documents', controller.listDocuments);
router.post('/documents', documentUpload.single('document'), controller.uploadDocument);
router.get('/documents/:id/download', controller.downloadDocument);

export default router;
