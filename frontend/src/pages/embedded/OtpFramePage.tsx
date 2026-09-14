import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { setAccessToken } from '../../services/apiClient';
import { transfersApi } from '../../services/resourceApis';

/**
 * Rendered inside an <iframe> by the Transfer wizard as a simulated
 * "secure verification" widget - a realistic pattern for OTP/3-D-Secure
 * style steps, and intentionally useful for Playwright iframe practice.
 * Runs in its own window/JS realm, so it receives the access token via a
 * query param and sets it on its own in-memory apiClient instance.
 */
export default function OtpFramePage() {
  const [params] = useSearchParams();
  const transferId = params.get('refId') ?? '';
  const token = params.get('token') ?? '';
  const devOtp = params.get('devOtp') ?? undefined;

  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<'idle' | 'verifying' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('verifying');
    setError('');
    setAccessToken(token);
    try {
      const result = await transfersApi.verifyOtp(transferId, otp);
      window.parent.postMessage({ source: 'bankflow-otp-frame', status: 'success', payload: result }, window.location.origin);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'Verification failed. Please try again.';
      setError(message);
      setStatus('error');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 p-6">
      <div className="w-full max-w-sm rounded-xl border border-ink-100 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <LockIcon />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink-900">Secure Verification</p>
            <p className="text-xs text-ink-500">BankFlow Verification Service</p>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <label htmlFor="frame-otp" className="label">
            Enter the 6-digit code sent to your registered device
          </label>
          <input
            id="frame-otp"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="input tracking-[0.3em] text-center text-lg"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            aria-invalid={status === 'error'}
            aria-describedby={status === 'error' ? 'frame-otp-error' : undefined}
          />
          {devOtp && <p className="mt-1 text-xs text-ink-400">Dev mode OTP: {devOtp}</p>}
          {status === 'error' && (
            <p id="frame-otp-error" role="alert" className="field-error">
              {error}
            </p>
          )}
          <button type="submit" disabled={otp.length !== 6 || status === 'verifying'} className="btn-primary mt-4 w-full">
            {status === 'verifying' ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
