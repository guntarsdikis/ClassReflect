# ClassReflect Features Guide

Last Updated: 2025-09-05

This document describes the features that are currently implemented in ClassReflect across the frontend and backend. It focuses on what works today in local development (JWT auth, AssemblyAI processing, MySQL), with notes where behavior differs in production.

## Product Overview

ClassReflect helps teachers and school leaders analyze classroom audio:
- Upload classroom recordings (no local file storage; processed in-memory)
- Transcribe using AssemblyAI
- Apply analysis templates to produce actionable feedback and scores
- Manage schools, users, teachers, subjects, and templates

## Roles & Access

- Teacher: Upload and track own recordings; view own analyses and profile
- School Manager: Manage teachers, subjects, templates; view school recordings and analyses
- Super Admin: Platform-wide access; manage schools and users across all schools

## Authentication & Authorization

- Auth Method: JWT for local development
  - POST `/api/auth/login` → returns JWT + user payload
  - POST `/api/auth/logout` (stateless client-side logout)
  - GET `/api/auth/profile` → current user
  - POST `/api/auth/change-password`
  - POST `/api/auth/forgot-password`, `/api/auth/reset-password` (stubs with basic flow)
- Middleware: Role-based access enforced per route
  - Roles: `teacher`, `school_manager`, `super_admin`
- CORS: Allows configured `FRONTEND_URL` in `backend/.env`

References:
- `backend/src/middleware/auth.ts`
- `backend/src/routes/auth.ts`
- `backend/src/config/auth.config.ts`

## Upload & Transcription Pipeline

- Direct Upload: In-memory file upload (Multer memory storage)
  - POST `/api/upload/direct` (multipart/form-data)
    - Fields: `audio` (file), `teacherId` (int), `schoolId` (int)
    - Allowed Mime Types: mp3, mpeg, wav, m4a, ogg, webm
    - Max Size: 500 MB
  - Creates an audio job (`audio_jobs`) with status `queued`
  - Immediately enqueues processing via AssemblyAI using the file buffer
- Job Status
  - GET `/api/upload/status/:jobId` → processing status and metadata
  - Finalizes transcript into `transcripts` table
- No S3 storage in local dev (AssemblyAI-only path)

References:
- `backend/src/routes/upload-new.ts`
- `backend/src/services/processing.ts`
- `backend/src/services/assemblyai.ts`

## Recording Management (Jobs)

- School/Platform View
  - GET `/api/jobs/recordings` → paginated list with filters (status, school, search)
  - GET `/api/jobs/:jobId` → job details, transcript linkage, errors
  - DELETE `/api/jobs/:jobId` → soft-cleanup and optional S3 delete if present (prod path)
- Teacher View
  - GET `/api/jobs/teacher/:teacherId` → teacher’s jobs (auth-guarded)
  - GET `/api/jobs/stats/:schoolId` → aggregate school stats (manager/admin)

References:
- `backend/src/routes/jobs.ts`

## Analysis Templates & Results

- Templates
  - Global and School-scoped templates
  - Criteria with weight validation (total must equal 100%)
  - Filters: category, subject, grade, school
  - CRUD for templates and criteria; usage counts updated on apply
- Analysis Execution
  - GET `/api/analysis/recordings` → recordings (completed with transcripts) available for analysis
  - POST `/api/analysis/apply-template` → creates background analysis job
    - Body: `transcriptId`, `templateId`
    - Produces entries in `analysis_jobs` and `analysis_results`
  - GET `/api/analysis/job-status/:jobId` → background analysis job status
  - GET `/api/analysis/results/:transcriptId` → all analysis results for a transcript
  - GET `/api/analysis/school-summary` → high-level school summary
- Result Fields include: `overall_score`, `strengths[]`, `improvements[]`, `detailed_feedback`

References:
- `backend/src/routes/templates.ts`
- `backend/src/routes/analysis.ts`

## Teacher & User Management

- Teachers (School Manager or Super Admin)
  - GET `/api/users/teachers` → list teachers in school (or specified school for super admin)
  - POST `/api/users/teachers` → create teacher with subjects/grades
  - PUT `/api/users/teachers/:id` → update teacher metadata
  - DELETE `/api/users/teachers/:id` → deactivate teacher
  - POST `/api/users/teachers/:id/reset-password` → issue temporary password (dev displays temp password)
- Users (Super Admin)
  - POST `/api/users` → create user as `teacher` or `school_manager`
  - GET `/api/users` → current user (non-admin) or all users (super admin)
  - PUT `/api/users/:id/role` → change role between `teacher` and `school_manager`
  - POST `/api/users/:id/reset-password`

References:
- `backend/src/routes/users.ts`

## School Management (Super Admin)

- Manage schools with quotas and status:
  - Create, update, suspend/activate
  - Fields include: `domain`, `contact_email`, `max_teachers`, `max_monthly_uploads`, `is_active`
- Subject management per school (and system subjects list)

References:
- `backend/src/routes/schools.ts`
- `backend/src/routes/system-subjects.ts`

## Frontend Features (React)

- Auth
  - Login form; logout; protected routes and role routes
  - JWT token stored in state; axios interceptor attaches `Authorization` header
- Uploads
  - Multi-step Upload Wizard with class metadata (class, subject, grade, duration, notes)
  - Client-side validation; progress and status polling
- Dashboards
  - Teacher Dashboard: recent jobs, statuses, quick actions
  - Manager Dashboard: school-level overview (scaffolding in progress)
- Templates
  - Template management UI: create/edit templates; manage criteria and weights; filter by subject/grade/category
- Analysis
  - Pick transcript/recording, apply template, view results with scorecards and feedback
- Users & Schools
  - User management (create, edit, deactivate, reset passwords)
  - School management (create/edit/suspend; subject management)
- Profile
  - View/update profile (name/email), basic account settings

References:
- `frontend/src/shared/services/api.client.ts`
- `frontend/src/features/*` (auth, uploads, analysis, templates, users, schools, dashboard, profile)

## API Base URLs (Local)

- Frontend Dev: `http://localhost:3002`
- Backend API: `http://localhost:3001/api`
  - Configure in `frontend/.env.local` via `VITE_API_URL`
  - Backend CORS allows origin in `backend/.env` via `FRONTEND_URL`

## Data & Storage Notes

- Audio Files: Not stored locally; uploaded buffers are sent to AssemblyAI directly
- Database: MySQL/Aurora-compatible, tables include `users`, `schools`, `audio_jobs`, `transcripts`, `templates`, `template_criteria`, `analysis_jobs`, `analysis_results`
- Secrets: Use `.env` files in local; production should use managed secrets

## Limitations & In-Progress

- Local dev uses JWT-only; Cognito is not active in local
- Email flows (invites, notifications) are placeholders
- WebSocket references exist but not required for current flows
- Some manager dashboard analytics are scaffolded but not fully implemented

## Quick Start (Local)

1) Backend
- `cd backend && npm run dev`
- Ensure `backend/.env` has `PORT=3001`, `FRONTEND_URL=http://localhost:3002`

2) Frontend
- `cd frontend && npm run dev`
- Ensure `frontend/.env.local` has `VITE_APP_URL=http://localhost:3002`, `VITE_API_URL=http://localhost:3001`

3) Login
- Use test users from the docs and go to `http://localhost:3002/login`

