import { Navigate } from 'react-router-dom';
import { useAuthStore, type UserRole } from '@store/auth.store';
import { ManagerDashboard } from '@features/dashboard/manager/ManagerDashboard';
import { SuperAdminDashboard } from '@features/dashboard/admin/SuperAdminDashboard';

export function DashboardRouter() {
  const user = useAuthStore((state) => state.user);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Route to appropriate dashboard based on user role
  switch (user.role) {
    case 'teacher':
      // Simplified teacher experience: use one-pager at /reports
      return <Navigate to="/reports" replace />;
    case 'school_manager':
      return <ManagerDashboard />;
    case 'super_admin':
      return <SuperAdminDashboard />;
    default:
      // Fallback to login if unknown role
      return <Navigate to="/login" replace />;
  }
}
