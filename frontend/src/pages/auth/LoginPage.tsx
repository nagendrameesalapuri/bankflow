import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../services/apiClient';
import * as authApi from '../../services/authApi';
import { homeRouteForRole } from '../../utils/roleHome';
import type { User } from '../../types/api';

interface CredentialsForm {
  username: string;
  password: string;
  rememberMe: boolean;
}

export default function LoginPage() {
  const { login, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const explicitFrom = (location.state as { from?: string } | null)?.from;

  function landingRoute(user: User): string {
    // If the user was bounced to /login from a specific protected URL,
    // send them back there; otherwise land on the right home page for
    // their role (ProtectedRoute still guards against a mismatched "from").
    return explicitFrom && explicitFrom !== '/' ? explicitFrom : homeRouteForRole(user.role);
  }

  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [loginToken, setLoginToken] = useState('');
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [expiresIn, setExpiresIn] = useState(120);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [serverError, setServerError] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CredentialsForm>({ defaultValues: { rememberMe: false } });

  useEffect(() => {
    if (step !== 'otp') return;
    setSecondsLeft(expiresIn);
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, expiresIn]);

  async function onSubmitCredentials(values: CredentialsForm) {
    setServerError('');
    try {
      const result = await login(values.username, values.password, values.rememberMe);
      if (result.requiresOtp && result.loginToken) {
        setLoginToken(result.loginToken);
        setDevOtp(result.devOtp);
        setExpiresIn(result.expiresInSeconds ?? 120);
        setStep('otp');
      } else if (result.user) {
        navigate(landingRoute(result.user), { replace: true });
      }
    } catch (err) {
      setServerError(getApiErrorMessage(err, 'Login failed. Please try again.'));
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpError('');
    setIsVerifying(true);
    try {
      const user = await verifyOtp(loginToken, otp);
      navigate(landingRoute(user), { replace: true });
    } catch (err) {
      setOtpError(getApiErrorMessage(err, 'Invalid OTP. Please try again.'));
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    try {
      const result = await authApi.resendOtp(loginToken);
      setDevOtp(result.devOtp);
      setExpiresIn(result.expiresInSeconds);
      setSecondsLeft(result.expiresInSeconds);
      setOtpError('');
    } catch (err) {
      setOtpError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="flex min-h-screen bg-ink-50">
      <div className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-sidebar-gradient p-10 text-white lg:flex xl:w-2/5">
        <div className="pointer-events-none absolute inset-0 bg-mesh-glow" aria-hidden="true" />
        <div className="relative flex items-center gap-2.5">
          <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
            <defs>
              <linearGradient id="login-mark" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#5b90ff" />
                <stop offset="1" stopColor="#8a55ef" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="9" fill="url(#login-mark)" />
            <path d="M9 21V13.5L16 9l7 4.5V21" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none" />
            <path d="M13 21v-5h6v5" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none" />
          </svg>
          <span className="text-xl font-bold tracking-tight">BankFlow</span>
        </div>

        <div className="relative">
          <p className="section-eyebrow text-brand-300">Fictional demo bank</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight">Modern banking, built for confident automation testing.</h1>
          <p className="mt-4 max-w-sm text-sm text-white/60">
            Real auth, real OTP flows, real data - a full digital banking experience with nothing at stake.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/80">
            <Feature accent="bg-brand-400" label="JWT + OTP secured sessions" />
            <Feature accent="bg-teal-400" label="Live balances & instant transfers" />
            <Feature accent="bg-violet-400" label="Chaos Mode & API testing lab" />
            <Feature accent="bg-sunset-400" label="25 built-in automation challenges" />
          </ul>
        </div>

        <p className="relative text-xs text-white/40">No real funds or personal data are ever processed.</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-2 lg:hidden">
            <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="#2447ee" />
              <path d="M9 21V13.5L16 9l7 4.5V21" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none" />
              <path d="M13 21v-5h6v5" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="text-xl font-bold text-ink-900">BankFlow</span>
          </div>

          <div className="card">
          {step === 'credentials' ? (
            <>
              <h1 className="text-lg font-semibold text-ink-900">Log in to your account</h1>
              <p className="mb-5 mt-1 text-sm text-ink-500">Fictional demo bank. No real funds are involved.</p>
              <form onSubmit={handleSubmit(onSubmitCredentials)} noValidate>
                <div className="mb-4">
                  <label htmlFor="username" className="label">
                    Username or email
                  </label>
                  <input
                    id="username"
                    autoComplete="username"
                    className="input"
                    aria-invalid={!!errors.username}
                    {...register('username', { required: 'Username or email is required' })}
                  />
                  {errors.username && <p className="field-error">{errors.username.message}</p>}
                </div>
                <div className="mb-4">
                  <label htmlFor="password" className="label">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className="input"
                    aria-invalid={!!errors.password}
                    {...register('password', { required: 'Password is required' })}
                  />
                  {errors.password && <p className="field-error">{errors.password.message}</p>}
                </div>
                <div className="mb-5 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-ink-600">
                    <input type="checkbox" className="h-4 w-4 rounded border-ink-300" {...register('rememberMe')} />
                    Remember this device
                  </label>
                  <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                {serverError && (
                  <p role="alert" className="field-error mb-3">
                    {serverError}
                  </p>
                )}
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                  {isSubmitting ? 'Signing in...' : 'Log in'}
                </button>
              </form>
              <div className="mt-5 rounded-lg bg-ink-50 p-3 text-xs text-ink-500">
                <p className="font-semibold text-ink-700">Demo credentials</p>
                <p>customer01 / Test@123</p>
                <p>support01 / Test@123</p>
                <p>admin01 / Admin@123</p>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-ink-900">Verify your identity</h1>
              <p className="mb-5 mt-1 text-sm text-ink-500">Enter the 6-digit code sent to your registered device.</p>
              <form onSubmit={handleVerifyOtp} noValidate>
                <label htmlFor="otp" className="label">
                  One-time passcode
                </label>
                <input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="input text-center text-lg tracking-[0.4em]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  aria-invalid={!!otpError}
                  aria-describedby={otpError ? 'otp-error' : undefined}
                />
                {devOtp && <p className="mt-1 text-xs text-ink-400">Dev mode OTP (auto-exposed for testing): {devOtp}</p>}
                {otpError && (
                  <p id="otp-error" role="alert" className="field-error">
                    {otpError}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-ink-500">
                    {secondsLeft > 0 ? `Code expires in ${secondsLeft}s` : 'Code expired'}
                  </span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={secondsLeft > 0}
                    className="font-medium text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-ink-400 disabled:no-underline"
                  >
                    Resend OTP
                  </button>
                </div>
                <button type="submit" disabled={otp.length !== 6 || isVerifying} className="btn-primary mt-4 w-full">
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </button>
                <button type="button" className="btn-ghost mt-2 w-full" onClick={() => setStep('credentials')}>
                  Back to login
                </button>
              </form>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ accent, label }: { accent: string; label: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${accent}`} aria-hidden="true" />
      {label}
    </li>
  );
}
