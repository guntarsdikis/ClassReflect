import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingOverlay } from '@mantine/core';
import { useAuthStore } from '@store/auth.store';

export function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return <LoadingOverlay visible />;
  }
  
  if (!isAuthenticated) {
    // Redirect to login but save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <Outlet />;
}