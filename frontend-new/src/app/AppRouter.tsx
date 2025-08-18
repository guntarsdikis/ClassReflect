import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@features/auth/components/LoginPage';
import { ForgotPasswordPage } from '@features/auth/components/ForgotPasswordPage';
import { ProtectedRoute } from '@features/auth/components/ProtectedRoute';
import { RoleRoute } from '@features/auth/components/RoleRoute';
import { AppShell } from '@shared/components/Layout/AppShell';
import { TeacherDashboard } from '@features/dashboard/teacher/TeacherDashboard';
// import { ManagerDashboard } from '@features/dashboard/manager/ManagerDashboard';
// import { AdminDashboard } from '@features/dashboard/admin/AdminDashboard';
// import { UploadWizard } from '@features/uploads/components/UploadWizard';
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
          
          {/* Teacher Routes */}
          <Route element={<RoleRoute roles={['teacher']} />}>
            <Route path="/dashboard" element={<TeacherDashboard />} />
            {/* <Route path="/feedback/:jobId" element={<FeedbackView />} /> */}
            {/* <Route path="/progress" element={<ProgressView />} /> */}
            {/* <Route path="/reports" element={<ReportsView />} /> */}
          </Route>
          
          {/* School Manager Routes */}
          <Route element={<RoleRoute roles={['school_manager']} />}>
            <Route path="/dashboard" element={<div>Manager Dashboard - Coming Soon</div>} />
            {/* <Route path="/upload" element={<UploadWizard />} /> */}
            {/* <Route path="/teachers" element={<TeacherManagement />} /> */}
            {/* <Route path="/templates" element={<TemplateEditor />} /> */}
            {/* <Route path="/analytics" element={<SchoolAnalytics />} /> */}
          </Route>
          
          {/* Super Admin Routes */}
          <Route element={<RoleRoute roles={['super_admin']} />}>
            <Route path="/admin" element={<div>Admin Dashboard - Coming Soon</div>} />
            {/* <Route path="/admin/schools" element={<SchoolManagement />} /> */}
            {/* <Route path="/admin/platform" element={<PlatformAnalytics />} /> */}
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