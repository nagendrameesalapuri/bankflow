import { apiClient } from './apiClient';
import type { User } from '../types/api';

export interface LoginResponse {
  requiresOtp: boolean;
  loginToken?: string;
  expiresInSeconds?: number;
  devOtp?: string;
  accessToken?: string;
  user?: User;
}

export async function login(username: string, password: string, rememberMe: boolean) {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { username, password, rememberMe });
  return data;
}

export async function verifyOtp(loginToken: string, otp: string) {
  const { data } = await apiClient.post<{ accessToken: string; user: User }>('/auth/verify-otp', {
    loginToken,
    otp,
  });
  return data;
}

export async function resendOtp(loginToken: string) {
  const { data } = await apiClient.post<{ otpId: string; devOtp?: string; expiresInSeconds: number }>(
    '/auth/resend-otp',
    { loginToken },
  );
  return data;
}

export async function refresh() {
  const { data } = await apiClient.post<{ accessToken: string; user: User }>('/auth/refresh');
  return data;
}

export async function logout() {
  await apiClient.post('/auth/logout');
}

export async function forgotPassword(email: string) {
  const { data } = await apiClient.post<{ message: string; devResetToken?: string }>('/auth/forgot-password', {
    email,
  });
  return data;
}

export async function resetPassword(token: string, newPassword: string) {
  const { data } = await apiClient.post<{ message: string }>('/auth/reset-password', { token, newPassword });
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const { data } = await apiClient.post<{ message: string }>('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return data;
}
