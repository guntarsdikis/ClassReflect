import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@features/auth/components/LoginPage';
import { ForgotPasswordPage } from '@features/auth/components/ForgotPasswordPage';
import { ProtectedRoute } from '@features/auth/components/ProtectedRoute';
import { RoleRoute } from '@features/auth/components/RoleRoute';
import { AppShell } from '@shared/components/Layout/AppShell';
import { DashboardRouter } from '@features/dashboard/components/DashboardRouter';
import { MyProgress } from '@features/dashboard/teacher/MyProgress';
import { TeacherReports } from '@features/dashboard/teacher/TeacherReports';
import { SchoolManagement } from '@features/schools/components/SchoolManagement';
import { SchoolDetail } from '@features/schools/components/SchoolDetail';
import { SubjectManagement } from '@features/schools/components/SubjectManagement';
import { UserManagement } from '@features/users/components/UserManagement';
import { UserDetail } from '@features/users/components/UserDetail';
import { TemplateManagement } from '@features/templates/components/TemplateManagement';
import { TemplateCategoryManagement } from '@features/templates/components/TemplateCategoryManagement';
import { UploadWizard } from '@features/uploads/components/UploadWizard';
import { RecordingsList } from '@features/recordings/components/RecordingsList';
import { AnalysisManager } from '@features/analysis/components/AnalysisManager';
import { ProfilePage } from '@features/profile';
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
            <Route path="/progress" element={<MyProgress />} />
            <Route path="/reports" element={<TeacherReports />} />
            {/* <Route path="/feedback/:jobId" element={<FeedbackView />} /> */}
          </Route>
          
          {/* School Manager and Super Admin Only Routes */}
          <Route element={<RoleRoute roles={['school_manager', 'super_admin']} />}>
            <Route path="/upload" element={<UploadWizard />} />
          </Route>

          {/* School Manager and Super Admin Only Routes */}
          <Route element={<RoleRoute roles={['school_manager', 'super_admin']} />}>
            <Route path="/analysis" element={<AnalysisManager />} />
          </Route>

          {/* School Manager and Super Admin Routes */}
          <Route element={<RoleRoute roles={['school_manager', 'super_admin']} />}>
            <Route path="/recordings" element={<RecordingsList />} />
            <Route path="/templates" element={<TemplateManagement />} />
            <Route path="/categories" element={<TemplateCategoryManagement />} />
            <Route path="/subjects" element={<SubjectManagement />} />
            <Route path="/teachers" element={<UserManagement />} />
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
            <Route path="/admin/recordings" element={<RecordingsList />} />
            <Route path="/admin/analysis" element={<AnalysisManager />} />
            <Route path="/admin/templates" element={<TemplateManagement />} />
            <Route path="/admin/categories" element={<TemplateCategoryManagement />} />
            <Route path="/admin/subjects" element={<SubjectManagement />} />
          </Route>
          
          {/* Shared Routes - Super Admin and School Manager */}
          <Route element={<RoleRoute roles={['super_admin', 'school_manager']} />}>
            <Route path="/users/:id" element={<UserDetail />} />
            <Route path="/teachers/:id" element={<UserDetail />} />
          </Route>
          
          {/* Shared Routes - All roles */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<div>Settings - Coming Soon</div>} />
        </Route>
      </Route>
      
      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}