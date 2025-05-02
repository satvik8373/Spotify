import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * A wrapper component that requires authentication to access child routes.
 * Redirects unauthenticated users to the welcome page.
 */
const RequireAuth = () => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to welcome page with a return_to parameter
    return <Navigate to={`/?return_to=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Render child routes if user is authenticated
  return <Outlet />;
};

export default RequireAuth; 