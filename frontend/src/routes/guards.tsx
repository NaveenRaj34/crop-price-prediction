import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';

/** Redirects unauthenticated users to /login */
export function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

/** Redirects non-admin users to /dashboard */
export function RequireAdmin() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

/** Redirects authenticated users away from login/register */
export function RedirectIfAuthed() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
