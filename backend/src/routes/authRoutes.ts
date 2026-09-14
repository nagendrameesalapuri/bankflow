import { Router } from 'express';
import * as authController from '../controllers/authController';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/authMiddleware';
import { loginLimiter } from '../middleware/rateLimiters';
import { chaosMiddleware } from '../middleware/chaosMiddleware';
import {
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/authValidators';

const router = Router();

router.post('/login', loginLimiter, chaosMiddleware(), validate({ body: loginSchema }), authController.login);
router.post('/verify-otp', chaosMiddleware(), validate({ body: verifyOtpSchema }), authController.verifyOtp);
router.post('/resend-otp', validate({ body: resendOtpSchema }), authController.resendOtp);
router.post('/refresh', chaosMiddleware(), authController.refresh);
router.post('/logout', requireAuth, authController.logout);
router.post('/forgot-password', validate({ body: forgotPasswordSchema }), authController.forgotPassword);
router.post('/reset-password', validate({ body: resetPasswordSchema }), authController.resetPassword);
router.post('/change-password', requireAuth, validate({ body: changePasswordSchema }), authController.changePassword);

export default router;
