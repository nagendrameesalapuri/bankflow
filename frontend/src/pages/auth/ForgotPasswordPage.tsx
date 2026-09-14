import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as authApi from '../../services/authApi';
import { getApiErrorMessage } from '../../services/apiClient';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const result = await authApi.forgotPassword(email);
      setDevToken(result.devResetToken);
      setSubmitted(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-md card">
        <h1 className="text-lg font-semibold text-ink-900">Reset your password</h1>
        <p className="mb-5 mt-1 text-sm text-ink-500">Enter your account email and we'll send reset instructions.</p>
        {submitted ? (
          <div>
            <p className="text-sm text-ink-700">
              If an account exists for <strong>{email}</strong>, password reset instructions have been sent.
            </p>
            {devToken && (
              <div className="mt-4 rounded-lg bg-ink-50 p-3 text-xs text-ink-500">
                <p className="font-semibold text-ink-700">Dev mode</p>
                <p className="break-all">Reset token: {devToken}</p>
                <Link to={`/reset-password?token=${devToken}`} className="mt-1 inline-block font-medium text-brand-600 hover:underline">
                  Continue to reset password
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <label htmlFor="email" className="label">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p role="alert" className="field-error">{error}</p>}
            <button type="submit" disabled={isSubmitting} className="btn-primary mt-4 w-full">
              {isSubmitting ? 'Sending...' : 'Send reset instructions'}
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
