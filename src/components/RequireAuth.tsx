import { Navigate, Outlet, useLocation } from 'react-router';
import { getToken } from '@/lib/auth';

/**
 * getToken() is synchronous (js-cookie reads document.cookie), so the decision
 * happens on the FIRST render — no flash of protected content before the
 * redirect. That matters more in an SPA than in Next, where middleware caught
 * it server-side.
 */
export function RequireAuth() {
  const location = useLocation();

  if (!getToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
