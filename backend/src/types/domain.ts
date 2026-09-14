export type RoleName = 'CUSTOMER' | 'SUPPORT_AGENT' | 'ADMIN';

export interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  role_id: number;
  role_name: RoleName;
  status: 'ACTIVE' | 'LOCKED' | 'DISABLED';
  failed_login_attempts: number;
  locked_until: Date | null;
  mfa_enabled: boolean;
  profile_photo_url: string | null;
  preferences: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export function toPublicUser(u: UserRow) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.full_name,
    phone: u.phone,
    address: u.address,
    role: u.role_name,
    status: u.status,
    mfaEnabled: u.mfa_enabled,
    profilePhotoUrl: u.profile_photo_url,
    preferences: u.preferences,
    createdAt: u.created_at,
  };
}
