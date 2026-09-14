import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homeRouteForRole } from '../utils/roleHome';

export default function NotFoundPage() {
  const { user } = useAuth();
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-ink-50 p-6 text-center">
      <span className="mb-2 bg-brand-gradient bg-clip-text text-6xl font-black text-transparent">404</span>
      <h1 className="text-2xl font-bold text-ink-900">Page not found</h1>
      <p className="max-w-md text-sm text-ink-500">The page you're looking for doesn't exist.</p>
      <Link to={user ? homeRouteForRole(user.role) : '/login'} className="btn-primary mt-2">
        Back to dashboard
      </Link>
    </div>
  );
}
