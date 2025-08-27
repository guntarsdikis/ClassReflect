import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@features/auth/components/LoginPage';
import { ForgotPasswordPage } from '@features/auth/components/ForgotPasswordPage';
import { ProtectedRoute } from '@features/auth/components/ProtectedRoute';
import { RoleRoute } from '@features/auth/components/RoleRoute';
import { AppShell } from '@shared/components/Layout/AppShell';
import { DashboardRouter } from '@features/dashboard/components/DashboardRouter';
import { SchoolManagement } from '@features/schools/components/SchoolManagement';
import { SchoolDetail } from '@features/schools/components/SchoolDetail';
import { UserManagement } from '@features/users/components/UserManagement';
import { UserDetail } from '@features/users/components/UserDetail';
import { TemplateManagement } from '@features/templates/components/TemplateManagement';
import { UploadWizard } from '@features/uploads/components/UploadWizard';
import { JobManagement } from '@features/admin/components/JobManagement';
// import { TeacherManagement } from '@features/teachers/components/TeacherManagement';
// import { TemplateEditor } from '@features/templates/components/TemplateEditor';
// import { SchoolAnalytics } from '@features/analytics/components/SchoolAnalytics';

export function AppRouter() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      
      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Smart Dashboard Route - redirects based on user role */}
          <Route path="/dashboard" element={<DashboardRouter />} />
          
          {/* Teacher Routes */}
          <Route element={<RoleRoute roles={['teacher']} />}>
            {/* <Route path="/feedback/:jobId" element={<FeedbackView />} /> */}
            {/* <Route path="/progress" element={<ProgressView />} /> */}
            {/* <Route path="/reports" element={<ReportsView />} /> */}
          </Route>
          
          {/* School Manager Routes */}
          <Route element={<RoleRoute roles={['school_manager']} />}>
            <Route path="/upload" element={<UploadWizard />} />
            <Route path="/templates" element={<TemplateManagement />} />
            {/* <Route path="/teachers" element={<TeacherManagement />} /> */}
            {/* <Route path="/analytics" element={<SchoolAnalytics />} /> */}
          </Route>
          
          {/* Super Admin Routes */}
          <Route element={<RoleRoute roles={['super_admin']} />}>
            <Route path="/admin/schools" element={<SchoolManagement />} />
            <Route path="/admin/schools/:id" element={<SchoolDetail />} />
            <Route path="/admin/schools/new" element={<SchoolManagement />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/users/:id" element={<UserDetail />} />
            <Route path="/admin/users/new" element={<UserManagement />} />
            <Route path="/admin/templates" element={<TemplateManagement />} />
            <Route path="/admin/jobs" element={<JobManagement />} />
          </Route>
          
          {/* Shared Routes */}
          <Route path="/profile" element={<div>Profile - Coming Soon</div>} />
          <Route path="/settings" element={<div>Settings - Coming Soon</div>} />
        </Route>
      </Route>
      
      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}