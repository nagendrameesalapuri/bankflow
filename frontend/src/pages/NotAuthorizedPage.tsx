import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homeRouteForRole } from '../utils/roleHome';

export default function NotAuthorizedPage() {
  const { user } = useAuth();
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-ink-50 p-6 text-center">
      <span className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sunset-400 to-rose-600 text-white shadow-glow">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </span>
      <h1 className="text-2xl font-bold text-ink-900">You don't have access to this page</h1>
      <p className="max-w-md text-sm text-ink-500">
        Your account role does not have permission to view this section of BankFlow.
      </p>
      <Link to={user ? homeRouteForRole(user.role) : '/login'} className="btn-primary mt-2">
        Back to dashboard
      </Link>
    </div>
  );
}
