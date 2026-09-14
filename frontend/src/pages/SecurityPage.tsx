import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { securityApi } from '../services/resourceApis';
import * as authApi from '../services/authApi';
import { getApiErrorMessage } from '../services/apiClient';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/format';
import { Tabs } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { IconShield } from '../components/ui/icons';

interface Session {
  id: string;
  deviceLabel: string;
  ipAddress: string;
  createdAt: string;
  isCurrent: boolean;
}
interface LoginHistoryRow {
  id: string;
  ip_address: string;
  status: 'SUCCESS' | 'FAILED';
  reason: string | null;
  created_at: string;
}

export default function SecurityPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const sessionsQuery = useQuery({ queryKey: ['security', 'sessions'], queryFn: securityApi.sessions });
  const historyQuery = useQuery({ queryKey: ['security', 'history'], queryFn: securityApi.loginHistory });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => securityApi.revokeSession(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['security', 'sessions'] }),
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setIsChangingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      showToast({ title: 'Password changed', variant: 'success' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordError(getApiErrorMessage(err));
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Security" description="Manage your password, sessions, and login activity." tone="rose" icon={<IconShield />} />

      <div className="card">
        <Tabs
          tabs={[
            {
              id: 'password',
              label: 'Change Password',
              content: (
                <form onSubmit={changePassword} className="max-w-sm space-y-3">
                  <div>
                    <label htmlFor="currentPassword" className="label">
                      Current password
                    </label>
                    <input id="currentPassword" type="password" required className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="newPassword" className="label">
                      New password
                    </label>
                    <input id="newPassword" type="password" required minLength={8} className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  </div>
                  {passwordError && <p role="alert" className="field-error">{passwordError}</p>}
                  <button type="submit" disabled={isChangingPassword} className="btn-primary">
                    {isChangingPassword ? 'Updating...' : 'Update password'}
                  </button>
                </form>
              ),
            },
            {
              id: 'sessions',
              label: 'Active Sessions',
              content: (
                <div>
                  <div className="mb-3 flex justify-end">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={async () => {
                        await securityApi.logoutAll();
                        queryClient.invalidateQueries({ queryKey: ['security', 'sessions'] });
                        showToast({ title: 'Logged out from all other devices', variant: 'success' });
                      }}
                    >
                      Log out all other devices
                    </button>
                  </div>
                  {(sessionsQuery.data ?? []).length === 0 ? (
                    <EmptyState title="No active sessions" />
                  ) : (
                    <ul className="space-y-2">
                      {(sessionsQuery.data as Session[] | undefined ?? []).map((s) => (
                        <li key={s.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium text-ink-800">
                              {s.deviceLabel} {s.isCurrent && <span className="ml-1 text-xs text-brand-600">(this device)</span>}
                            </p>
                            <p className="text-xs text-ink-400">{s.ipAddress} &middot; since {formatDateTime(s.createdAt)}</p>
                          </div>
                          {!s.isCurrent && (
                            <button type="button" className="btn-ghost text-red-600" onClick={() => revokeMutation.mutate(s.id)}>
                              Revoke
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ),
            },
            {
              id: 'history',
              label: 'Login History',
              content:
                (historyQuery.data ?? []).length === 0 ? (
                  <EmptyState title="No login history" />
                ) : (
                  <ul className="space-y-2">
                    {(historyQuery.data as LoginHistoryRow[] | undefined ?? []).map((h) => (
                      <li key={h.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm">
                        <span>{h.ip_address} &middot; {formatDateTime(h.created_at)}</span>
                        <StatusBadge status={h.status} />
                      </li>
                    ))}
                  </ul>
                ),
            },
            {
              id: 'mfa',
              label: 'MFA Settings',
              content: (
                <div className="max-w-sm">
                  <p className="mb-3 text-sm text-ink-600">
                    Two-factor authentication is currently <strong>{user?.mfaEnabled ? 'enabled' : 'disabled'}</strong> for your account.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={async () => {
                      await securityApi.setMfa(!user?.mfaEnabled);
                      showToast({ title: `MFA ${user?.mfaEnabled ? 'disabled' : 'enabled'}`, variant: 'success' });
                    }}
                  >
                    {user?.mfaEnabled ? 'Disable MFA' : 'Enable MFA'}
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
