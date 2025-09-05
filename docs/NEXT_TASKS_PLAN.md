# Next Tasks & Action Plan (JWT‑only)

Last Updated: 2025-09-05

This plan documents remaining gaps and a prioritized action plan for the current JWT-only ClassReflect implementation (no Cognito), running locally with:
- Frontend: `http://localhost:3002`
- Backend API: `http://localhost:3001`

## Confirmed Scope
- Authentication: JWT only (Cognito not used in local/dev)
- Uploads: Direct in‑memory to AssemblyAI (no S3 in local)
- Database: MySQL/Aurora compatible

## Missing Features & Gaps
1) Profile update endpoint is missing
- Frontend expects: `PUT /api/auth/profile`
- Implemented: only `GET /api/auth/profile`
- References:
  - `frontend/src/features/profile/components/ProfilePage.tsx`
  - `frontend/src/shared/services/api.client.ts`
  - `backend/src/routes/auth.ts`

2) CategoriesManagement uses non‑existent school “criteria” routes
- Frontend calls: `/api/schools/:id/criteria` (CRUD)
- Backend provides: `/api/schools/:id/template-categories` (CRUD)
- References:
  - `frontend/src/features/categories/components/CategoriesManagement.tsx`
  - `backend/src/routes/schools.ts` (template‑categories endpoints exist)

3) User admin endpoints referenced but not implemented
- Missing: `PATCH /api/users/:id/role`
- Missing or unnecessary: `POST /api/users/admin/schools`
- References:
  - `frontend/src/features/users/services/users.service.ts`
  - `backend/src/routes/users.ts` (no matching routes yet)

4) System Subjects routes not mounted
- File exists but not mounted in `backend/src/index.ts`
- References:
  - `backend/src/routes/system-subjects.ts`

5) Password flows are placeholders
- Forgot/reset password lack token+email implementation
- References:
  - `backend/src/routes/auth.ts` (TODOs noted)

6) Dev CORS vs Proxy
- Many frontend calls go direct to `http://localhost:3001`, causing CORS footguns in dev
- Use Vite proxy (`/api`) for dev to avoid CORS config
- References:
  - `frontend/vite.config.ts` proxy defined
  - `frontend/src/shared/services/api.client.ts` uses absolute base URL

7) Duplicate API client layers
- Both `api` object and service classes (`ApiClient`) exist; risk of drift
- References:
  - `frontend/src/shared/services/api.client.ts` and feature `services/*.ts`

## Action Plan (Prioritized)

P0 — Unblock Core UX
- Implement `PUT /api/auth/profile`
  - Validate: firstName, lastName, email (unique)
  - Update `users`; return updated user
  - Acceptance: Profile save works; returns 200 with user payload
- Resolve CategoriesManagement mismatch
  - Option A (recommended): Remove/disable `CategoriesManagement` and standardize on Template Categories UI
  - Option B: Implement `/api/schools/:id/criteria` CRUD and DB schema if the concept is required
  - Acceptance: No calls to non‑existent `/criteria` routes

P1 — Admin & Consistency
- Add `PATCH /api/users/:id/role` ✅ Implemented
  - Validates role; requires `schoolId` for `school_manager`; restricted to `super_admin`
- Remove or implement `POST /api/users/admin/schools`
  - Prefer existing `/schools` + `/users` flows; remove unused endpoint from client
- Mount or remove System Subjects routes
  - If kept, mount at `/api/system-subjects` (super_admin only)

P2 — Dev UX + Docs
- Default to relative API base in dev (avoid CORS)
  - If `import.meta.env.DEV`, set baseURL to `/api`
  - Keep `VITE_API_URL` for preview/prod
- Clean JWT‑only docs
  - Remove/annotate Cognito instructions from dev guides and scripts
- Consolidate on a single client layer
  - Choose `ApiClient` services and phase out the top‑level `api` object (or vice versa)

P3 — Quality & Enhancements (Optional)
- Implement token‑based forgot/reset password with email stubs for dev
- Per‑recording PDF export entry point (component exists):
  - `frontend/src/features/analysis/components/AnalysisReportPDF.tsx`
- Fill average score in user lists from `analysis_results`
- Expand dashboards (manager/teacher analytics)

## Decision Points
- Do we keep “school analysis criteria” separate from template categories?
  - If no → remove CategoriesManagement UI and references
  - If yes → add `/schools/:id/criteria` CRUD + schema
- Implement admin endpoints or refactor UI to existing endpoints?
  - `PATCH /users/:id/role`, `POST /users/admin/schools`
- Keep System Subjects as a platform catalog?
  - Mount and document, or remove

## Execution Order
1) P0: Profile update + resolve Categories vs Template Categories (A or B)
2) P1: Role endpoint + remove/implement admin schools + system subjects decision
3) P2: Dev proxy default + docs cleanup + client consolidation
4) P3: Optional quality features

## Acceptance Checklist
- [ ] `PUT /api/auth/profile` implemented and used by Profile page
- [ ] No references to `/api/schools/:id/criteria` unless implemented server‑side
- [ ] `PATCH /api/users/:id/role` available and guarded by `super_admin`
- [ ] No dead client endpoints (e.g., `/users/admin/schools`)
- [ ] System subjects: mounted or removed
- [ ] Dev API base is relative (`/api`) in dev; CORS issues gone
- [ ] Docs reflect JWT‑only local development; no misleading Cognito steps
- [ ] Single client layer in use across the app

## References
- Backend
  - `backend/src/index.ts`
  - `backend/src/routes/auth.ts`
  - `backend/src/routes/users.ts`
  - `backend/src/routes/schools.ts`
  - `backend/src/routes/templates.ts`
  - `backend/src/routes/analysis.ts`
  - `backend/src/routes/jobs.ts`
  - `backend/src/routes/system-subjects.ts`
- Frontend
  - `frontend/vite.config.ts`
  - `frontend/src/shared/services/api.client.ts`
  - `frontend/src/features/profile/components/ProfilePage.tsx`
  - `frontend/src/features/categories/components/CategoriesManagement.tsx`
  - `frontend/src/features/users/services/users.service.ts`
  - `frontend/src/features/templates/components/TemplateManagement.tsx`
  - `frontend/src/features/analysis/components/AnalysisManager.tsx`
