import { env } from '../config/env';
import { hashValue, compareValue } from '../utils/password';
import * as otpRepo from '../repositories/otpRepository';
import { ApiError } from '../utils/ApiError';

export type OtpPurpose = 'LOGIN' | 'TRANSFER' | 'ADD_BENEFICIARY' | 'PAYMENT' | 'PROFILE_UPDATE';

function generateCode(): string {
  const max = 10 ** env.otpLength;
  const code = Math.floor(Math.random() * max)
    .toString()
    .padStart(env.otpLength, '0');
  return code;
}

export async function issueOtp(userId: string, purpose: OtpPurpose, context: Record<string, unknown> = {}) {
  const code = generateCode();
  const codeHash = await hashValue(code);
  const expiresAt = new Date(Date.now() + env.otpExpiresInSeconds * 1000);
  const otp = await otpRepo.insertOtp({
    userId,
    purpose,
    codeHash,
    // Stored only so the dev-only API response / Challenge Lab can surface a
    // predictable OTP for local automation - never done in a real bank.
    devCode: code,
    context,
    expiresAt,
  });
  return {
    otpId: otp.id,
    expiresInSeconds: env.otpExpiresInSeconds,
    devOtp: env.isProduction ? undefined : code,
  };
}

export async function verifyOtp(userId: string, purpose: OtpPurpose, code: string): Promise<Record<string, unknown>> {
  const otp = await otpRepo.findLatestOtp(userId, purpose);
  if (!otp) {
    throw ApiError.badRequest('No OTP has been requested for this action.');
  }
  if (otp.expires_at.getTime() < Date.now()) {
    throw ApiError.badRequest('OTP has expired. Please request a new one.');
  }
  if (otp.attempt_count >= 5) {
    throw ApiError.tooManyRequests('Too many incorrect OTP attempts. Please request a new code.');
  }

  const isValid = await compareValue(code, otp.code_hash);
  if (!isValid) {
    await otpRepo.incrementOtpAttempts(otp.id);
    throw ApiError.badRequest('Incorrect OTP. Please try again.');
  }

  await otpRepo.consumeOtp(otp.id);
  return otp.context;
}
