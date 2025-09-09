# ClassReflect — Web Recording Delivery Plan & Task List

Author: Engineering
Owner: Product/Engineering
Status: Draft (ready to execute)
Last Updated: {{today}}

---

## Overview

Goal: Enable teachers and managers to start recording classroom audio directly in the browser and submit it to the existing processing pipeline. Ship in incremental phases with a safe, proven path first (MVP), then add reliability for long sessions (chunking, recovery), and mobile UX refinements.

Non-goal: A complete mobile-native app (considered as an alternative path below).

---

## Success Criteria (Acceptance)

- Users can start, pause, stop a recording inside the web app.
- After stopping, the audio is uploaded and a job is created/processed successfully (status transitions to completed; transcript appears).
- iOS/Android mobile recording works for typical 30–45 minute sessions with guidance (screen awake, network warnings).
- Clear fallback path to “Upload a file” remains available and reliable.
- No regressions to existing upload flows (S3 presigned and direct buffer).

---

## Quick Architecture Fit

- Reuse existing endpoints in `backend/src/routes/upload-new.ts`:
  - `POST /api/upload/direct` (multipart/form-data)
  - `POST /api/upload/presigned-put` → S3 PUT URL
  - `POST /api/upload/complete` → start processing from S3
  - `GET /api/upload/status/:jobId`
- Frontend integrates recording UI into the existing Upload Wizard:
  - `frontend/src/features/uploads/components/UploadWizard.tsx`
  - New supporting modules for recording service and UI components.

---

## Prerequisites & Decisions

- [x] Decide audience: allow Teachers to access recording (recommended) or keep Managers/Admins only.
  - If allowing Teachers, enable the route for role `teacher` in `frontend/src/app/AppRouter.tsx`.
- [ ] Confirm env vars for S3 path (if using S3 for large files): `AWS_REGION`, `S3_BUCKET_NAME` or `S3_BUCKET` (backend).
- [ ] Confirm `FRONTEND_URL` CORS origin in `backend/.env` matches dev/prod web origins.
- [ ] Confirm `ASSEMBLYAI_API_KEY` is configured for the deployed environment.
- [ ] Define maximum direct upload size for recordings (recommend: use existing AssemblyAI direct limit; fallback to S3 for larger blobs).

---

## Phase 1 — MVP: Record → Upload → Process (Estimated: 1–1.5 weeks)

Ship a simple, reliable path first: capture audio with MediaRecorder, upload as a single blob using existing endpoints, and start processing.

Frontend
- [x] Add a recording method choice to the Upload Wizard (Record vs Upload)
  - File: `frontend/src/features/uploads/components/UploadWizard.tsx`
  - UX: New step/cards to pick “Record in Browser” or “Upload File”
- [x] Implement recording service (MediaRecorder wrapper)
  - File: `frontend/src/services/recording.service.ts` (new)
  - Features: `getUserMedia`, mime detection, start/pause/resume/stop, timeslice support, error handling
  - Mimes: Prefer `audio/webm;codecs=opus`; fallback to `audio/mp4` or `audio/wav` in Safari
- [x] Implement recording UI
  - File: `frontend/src/features/uploads/components/RecordingPanel.tsx` (new)
  - Controls: Start, Pause, Stop; timer; simple audio level meter
  - States: permission prompt, not supported, recording, paused, stopped
- [x] Hook submission to existing upload flow
  - Small/medium blobs: `POST /api/upload/direct`
  - Large blobs: request `POST /api/upload/presigned-put` → PUT to S3 → `POST /api/upload/complete`
  - Reuse current metadata fields (teacherId, schoolId, class info, notes)
- [x] Route access (if enabling Teachers)
  - File: `frontend/src/app/AppRouter.tsx`
  - Allow teachers to access `/upload` (or add `/record` route that reuses the wizard)
- [x] Visual guidance banners
  - Explain keeping the screen awake on mobile; “Upload a file instead” fallback CTA

Playback
- [x] Expose playback URL endpoint (presigned S3 GET)
  - File: `backend/src/routes/upload-new.ts` → `GET /api/upload/playback-url/:jobId`
- [x] Add Play action and audio modal in recordings list
  - File: `frontend/src/features/recordings/components/RecordingsList.tsx`

Backend
- [x] Verify `upload-new.ts` allows the recorded mime types (webm, ogg, m4a, wav) — already present, confirm on test
- [x] Validate S3 presign path works with recorded content types
- [x] Confirm job creation and status polling show up in dashboards

Docs & Comms
- [x] Add a short “Recording Tips” section in user docs (iOS keep-awake, stable Wi‑Fi, headset optional)

Exit Criteria
- [ ] Record 10–15 min on desktop Chrome; job completes and transcript is stored
- [ ] Record 10–15 min on iOS Safari; job completes reliably with user guidance
- [ ] Clear fallback to file upload works end-to-end

---

## Phase 2 — Reliability: Chunking, Recovery, Progressive Upload (Estimated: 1 week)

Stabilize long recordings (30–90 min) with chunked capture, local backup, and progressive upload.

Frontend
- [ ] Enable timeslice capture (e.g., 30–60s slices) and hold only N recent chunks in memory
- [ ] IndexedDB local backup per session
  - File: `frontend/src/services/local-backup.service.ts` (new)
  - Methods: save/get/list/clear chunks by `sessionId`
- [ ] Recovery flow
  - On reload, offer to restore unfinished session and retry upload/processing
- [ ] Progressive upload
  - Option A (preferred): S3 multipart upload (best for long sessions)
  - Option B: Server chunk POST + merge (simpler infra; more server work)

Backend (choose one path)
Option A — S3 Multipart Upload
- [ ] `POST /api/upload/multipart/start` → returns `uploadId` and `key`
- [ ] `POST /api/upload/multipart/parts` → returns presigned PUT URLs for part numbers
- [ ] `POST /api/upload/multipart/complete` → finalize with ETags
- [ ] `POST /api/upload/multipart/abort` (cleanup)
- [ ] On complete: call existing `processingService.enqueueJobFromS3(jobId)`

Option B — Server Chunk Merge
- [ ] `POST /api/upload/chunk/start` → returns `sessionId` and target `jobId`
- [ ] `POST /api/upload/chunk/:index` → stores chunk to temporary S3 prefix
- [ ] `POST /api/upload/chunk/complete` → server merges chunks to a single S3 object
- [ ] On complete: enqueue processing from S3

UX
- [ ] Show background upload progress per chunk
- [ ] Resume uploads after transient network failure with retry/backoff

Exit Criteria
- [ ] 45–60 min recording on Android Chrome completes without OOM
- [ ] Browser crash/reload during recording can be recovered (no data loss beyond the last short slice)

---

## Phase 3 — Mobile UX Refinements (Estimated: 0.5–1 week)

- [ ] iOS: Start recording only on user gesture; alert about screen lock; add “Keep Screen Awake” toggle
- [ ] Use Screen Wake Lock API where available; fallback to NoSleep approach
- [ ] Visibility change handling (warn when app backgrounds; offer to pause or continue)
- [ ] Adaptive quality for low memory/network (reduce sample rate/bitrate)
- [ ] Improved audio level meter and clear timers for long sessions

Exit Criteria
- [ ] 30–45 min session on iPhone Safari with screen-on guidance is successful
- [ ] 45–60 min session on Android Chrome is successful

---

## Phase 4 — QA, Observability, and Release (Estimated: 0.5 week)

Testing
- [ ] Desktop: Chrome, Safari, Firefox, Edge — 15–30 min session each
- [ ] Mobile: iOS Safari (iPhone, iPad), Android Chrome — 30–45 min
- [ ] Edge cases: permissions denied, device switch, tab backgrounding, flaky Wi‑Fi

Observability
- [ ] Add client logs for permission/mime/support decisions
- [ ] Add backend logs for presign, upload completion, processing start times
- [ ] Optional: lightweight analytics event for success/failure/fallback usage

Release
- [ ] Feature flag: `VITE_ENABLE_WEB_RECORDING=true` (frontend) to gradually roll out
- [ ] Update user docs and onboarding tips
- [ ] Announce to pilot users; collect feedback

---

## File-Level Pointers (for implementers)

- Frontend entry points
  - Wizard: `frontend/src/features/uploads/components/UploadWizard.tsx`
  - Router: `frontend/src/app/AppRouter.tsx`
  - Recording service (new): `frontend/src/services/recording.service.ts`
  - Local backup (new): `frontend/src/services/local-backup.service.ts`
  - Recording UI (new): `frontend/src/features/uploads/components/RecordingPanel.tsx`
- Backend endpoints
  - Upload routes: `backend/src/routes/upload-new.ts`
  - Processing: `backend/src/services/processing.ts`
  - AssemblyAI: `backend/src/services/assemblyai.ts`

---

## Risk Log & Mitigations

- iOS background/lock limitations → Keep-screen-awake guidance; record in shorter sessions; progressive upload
- Safari mime quirks → Runtime mime detection; fallback to WAV if needed (larger files, reserve for short sessions)
- Long-session memory risk → Timeslice, chunking, IndexedDB backup, progressive upload
- Network instability → Chunked uploads with retry/backoff and resume

---

## Alternatives (if web-only is insufficient)

PWA (Progressive Web App)
- Pros: Installable; better UX cohesion
- Cons: Still subject to iOS background limits
- Tasks: Add manifest, service worker, offline UX for UI, optional caching

Hybrid (Capacitor shell around React app)
- Pros: Native mic/background support via plugins; reuse current UI
- Cons: App store pipeline; some native maintenance
- Tasks: Capacitor init, plugin wiring for background recording, bridge upload API

WebRTC Ingest
- Pros: Server-side recording; minimal client state
- Cons: Higher infra complexity, cost; privacy considerations
- Tasks: Deploy media server (e.g., LiveKit), authenticate sessions, ingest/record, handoff to AssemblyAI

---

## Checklist Snapshot (MVP)

- [x] Frontend recording method selector
- [x] MediaRecorder wrapper service with feature detection
- [x] Recording UI with basic controls and meter
- [x] Upload integration (direct + S3 paths)
- [x] Route access for Teachers (if approved)
- [x] Docs: Recording Tips
- [ ] Desktop + iOS basic validation sessions

---

## Notes

- Related doc: `Web_Recording_Implementation_Plan.md` (high-level design). This task list is the execution-ready version with concrete steps and file pointers.

---

## Basic Usage (Developer Preview)

- In the Upload Wizard, Step 1 now offers two tabs: "Record in Browser" and "Upload File".
- Click "Record in Browser" to start/pause/stop. On stop, the captured recording is attached as the selected file and you can proceed to the next step.
- Format defaults to `audio/webm;codecs=opus` where supported; the UI falls back to file upload if recording is not supported.
- The rest of the flow (class info → upload) is unchanged; large recordings will use S3 presigned PUT, smaller recordings can fall back to direct upload.
