import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as authApi from '../../services/authApi';
import { getApiErrorMessage } from '../../services/apiClient';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get('token') ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      await authApi.resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-md card">
        <h1 className="text-lg font-semibold text-ink-900">Choose a new password</h1>
        {success ? (
          <p className="mt-3 text-sm text-emerald-700">Password reset. Redirecting to login...</p>
        ) : (
          <form onSubmit={onSubmit} noValidate className="mt-4">
            <label htmlFor="token" className="label">
              Reset token
            </label>
            <input id="token" className="input" value={token} onChange={(e) => setToken(e.target.value)} required />

            <label htmlFor="newPassword" className="label mt-4">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />

            <label htmlFor="confirmPassword" className="label mt-4">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {error && <p role="alert" className="field-error">{error}</p>}
            <button type="submit" disabled={isSubmitting} className="btn-primary mt-4 w-full">
              {isSubmitting ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}
        <Link to="/login" className="mt-5 block text-center text-sm font-medium text-brand-600 hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  );
}
