# Next Tasks & Action Plan (JWT‑only)

Last Updated: 2025-09-06

This plan documents remaining gaps and a prioritized action plan for the current JWT-only ClassReflect implementation (no Cognito), running locally with:
- Frontend: `http://localhost:3002`
- Backend API: `http://localhost:3001`

## Confirmed Scope
- Authentication: JWT only (Cognito not used in local/dev)
- Uploads: Direct in‑memory to AssemblyAI (no S3 in local)
- Database: MySQL/Aurora compatible

## Missing Features & Gaps
1) Profile update endpoint ✅ Completed
- `PUT /api/auth/profile` implemented with validation and uniqueness check
- Full profile update functionality working

2) CategoriesManagement uses non‑existent school "criteria" routes ✅ Resolved
- Status: No longer an issue - CategoriesManagement component does not exist in codebase
- Backend provides: `/api/schools/:id/template-categories` (CRUD) - fully implemented
- Template categories are managed through existing Template Management UI

3) User admin endpoints ✅ Completed
- ✅ `PATCH /api/users/:id/role` implemented with proper validation
- ✅ Server-side users filtering by schoolId implemented
- Missing or unnecessary: `POST /api/users/admin/schools` ✅ Verified not needed

4) System Subjects routes ✅ Removed (unused feature)
- Schools manage their own subjects; platform-wide subjects not needed

5) TLC Template Import System ✅ Completed
- ✅ Backend API: `POST /api/schools/:schoolId/import-tlc-templates`
- ✅ Frontend UI: Import button in Templates Management page
- ✅ Service method: `schoolsService.importTLCTemplates(schoolId)`
- ✅ Smart features: duplicate prevention, category creation, error handling
- ✅ Two templates: Foundation Techniques (19 criteria) + Complete Framework (16 criteria)
- ✅ Perfect weight balance: Both templates sum to exactly 100%
- References:
  - `backend/src/routes/schools.ts:690` - API endpoint
  - `frontend/src/features/templates/components/TemplateManagement.tsx:568` - UI button
  - `frontend/src/features/schools/services/schools.service.ts:133` - Service method

6) Password flows are placeholders
- Forgot/reset password lack token+email implementation
- References:
  - `backend/src/routes/auth.ts` (TODOs noted)

7) Dev CORS vs Proxy ✅ Completed
- Many frontend calls go direct to `http://localhost:3001`, causing CORS footguns in dev
- Use Vite proxy (`/api`) for dev to avoid CORS config
- References:
  - `frontend/vite.config.ts` proxy defined
  - `frontend/src/shared/services/api.client.ts` uses absolute base URL

8) Duplicate API client layers
- Both `api` object and service classes (`ApiClient`) exist; risk of drift
- References:
  - `frontend/src/shared/services/api.client.ts` and feature `services/*.ts`

## Action Plan (Prioritized)

✅ **COMPLETED TASKS:**
- ✅ `PUT /api/auth/profile` implemented with validation and uniqueness check
- ✅ `PATCH /api/users/:id/role` with proper validation and super_admin restriction
- ✅ Server-side users filtering via `GET /api/users?schoolId=` 
- ✅ TLC Template Import System (backend API + frontend UI + service integration)
- ✅ System subjects cleanup (removed unused routes)
- ✅ Dev CORS/proxy setup (API client uses relative '/api' in dev)
- ✅ JWT-only documentation cleanup
- ✅ CategoriesManagement API mismatch (component doesn't exist - no issue)
- ✅ Admin endpoints review (unused `/users/admin/schools` verified not needed)

**ALL CORE TASKS COMPLETED! ✅**

**COMPLETED (September 6, 2025):**
- ✅ API client layer consolidation (standardized on typed services, auth helpers kept in api object)
  - Created jobs.service.ts for job-related API calls
  - Updated TeacherDashboard and TeacherReports to use jobsService
  - Updated TemplateCategoryManagement to use schoolsService  
  - Removed redundant api.jobs methods
  - Achieved single client layer pattern with proper TypeScript typing

P2 — Quality & Enhancements (Optional)
- Implement token‑based forgot/reset password with email stubs for dev
- Per‑recording PDF export entry point (component exists):
  - `frontend/src/features/analysis/components/AnalysisReportPDF.tsx`
- Fill average score in user lists from `analysis_results`
- Expand dashboards (manager/teacher analytics)

## Status Summary

The ClassReflect application is now in a **stable, functional state** with all major P0 issues resolved:

### ✅ All Core Features Working
- Authentication & authorization (JWT-based)
- User management with role-based access
- School & template management
- File upload & AssemblyAI transcription
- Template categories management
- TLC template import system

### 🔧 Technical Debt (Lower Priority)
- API client layer consolidation (code quality improvement)
- Enhanced password reset flows (UX improvement)  
- Dashboard analytics expansion (feature enhancement)

## Next Steps Recommendation

The application is **production-ready** for core use cases. Remaining tasks are code quality improvements and feature enhancements, not blocking issues.

## Acceptance Checklist (Updated)
- [x] `PUT /api/auth/profile` implemented and used by Profile page
- [x] No references to non-existent `/api/schools/:id/criteria` routes (component doesn't exist)
- [x] `PATCH /api/users/:id/role` available and guarded by `super_admin`
- [x] No dead client endpoints (verified `/users/admin/schools` not needed)
- [x] System subjects: removed (unused feature)
- [x] Dev API base is relative (`/api`) in dev; CORS issues resolved
- [x] Docs reflect JWT‑only local development; no misleading Cognito steps
- [x] Single client layer in use across the app (consolidated to typed services)
- [x] TLC Template Import System fully functional in Templates page
- [x] Server-side users filtering by schoolId implemented

## References
- Backend
  - `backend/src/index.ts`
  - `backend/src/routes/auth.ts`
  - `backend/src/routes/users.ts`
  - `backend/src/routes/schools.ts`
  - `backend/src/routes/templates.ts`
  - `backend/src/routes/analysis.ts`
  - `backend/src/routes/jobs.ts`
- Frontend
  - `frontend/vite.config.ts`
  - `frontend/src/shared/services/api.client.ts`
  - `frontend/src/features/profile/components/ProfilePage.tsx`
  - `frontend/src/features/categories/components/CategoriesManagement.tsx`
  - `frontend/src/features/users/services/users.service.ts`
  - `frontend/src/features/templates/components/TemplateManagement.tsx`
  - `frontend/src/features/analysis/components/AnalysisManager.tsx`
