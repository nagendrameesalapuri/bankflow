import * as userRepo from '../repositories/userRepository';
import * as otpService from './otpService';
import { toPublicUser } from '../types/domain';
import { ApiError } from '../utils/ApiError';
import { saveUploadedFile } from '../utils/fileStorage';
import { createNotification } from './notificationService';

export async function getProfile(userId: string) {
  const user = await userRepo.findById(userId);
  if (!user) throw ApiError.notFound();
  return toPublicUser(user);
}

export async function updateBasicProfile(userId: string, fields: { fullName?: string; address?: string }) {
  const user = await userRepo.updateProfile(userId, fields);
  return toPublicUser(user);
}

export async function initiateSensitiveUpdate(userId: string, fields: { email?: string; phone?: string }) {
  return otpService.issueOtp(userId, 'PROFILE_UPDATE', { ...fields, userId });
}

export async function confirmSensitiveUpdate(userId: string, code: string) {
  const context = await otpService.verifyOtp(userId, 'PROFILE_UPDATE', code);
  const user = await userRepo.updateProfile(userId, context as { email?: string; phone?: string });
  await createNotification(userId, 'Profile updated', 'Your contact details were updated successfully.', 'INFO');
  return toPublicUser(user);
}

export async function uploadProfilePhoto(userId: string, file: Express.Multer.File) {
  const ext = file.mimetype.split('/')[1].replace('jpeg', 'jpg');
  const filename = `${userId}-${Date.now()}.${ext}`;
  const url = saveUploadedFile('profile-photos', filename, file.buffer);
  const user = await userRepo.updateProfile(userId, { profilePhotoUrl: url });
  return toPublicUser(user);
}

export async function updatePreferences(userId: string, preferences: Record<string, unknown>) {
  const user = await userRepo.findById(userId);
  if (!user) throw ApiError.notFound();
  const merged = { ...user.preferences, ...preferences };
  await userRepo.updatePreferences(userId, merged);
  return merged;
}
