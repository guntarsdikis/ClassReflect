# Solution: Upload Progress & Analysis Status Tracking

## Problem
- Frontend can't tell when transcription is done or analysis has started
- No automatic trigger for AI analysis after transcription completes
- Template selection is collected but never used
- User has no visibility into processing stages

## Solution Overview

### 1. Add Job Status API Endpoint (Backend)
**File**: `backend/src/routes/jobs.ts`

Add new endpoint: `GET /api/jobs/:jobId/status`

Returns:
```json
{
  "jobId": "abc-123",
  "status": "analyzing",  // queued → transcribing → analyzing → completed → failed
  "progress": {
    "stage": "analyzing",
    "percent": 45,
    "message": "Analyzing teaching quality..."
  },
  "transcription": {
    "completed": true,
    "text": "..."
  },
  "analysis": {
    "completed": false,
    "resultId": null
  }
}
```

### 2. Update AssemblyAI Service (Backend)
**File**: `backend/src/services/assemblyai.ts`

After successful transcription, automatically trigger analysis:
```typescript
// After line 190 where transcript is stored
if (job.template_id) {
  console.log(`🤖 Auto-triggering analysis with template ${job.template_id}`);
  await this.triggerAnalysis(jobId, job.template_id);
}
```

Add new method:
```typescript
private async triggerAnalysis(jobId: string, templateId: number): Promise<void> {
  // Call analysis service to start AI analysis
  const analysisService = require('./analysisProvider');
  await analysisService.startAnalysisForJob(jobId, templateId);
}
```

### 3. Update Upload Route (Backend)
**File**: `backend/src/routes/upload.ts`

Capture template_id from upload form:
```typescript
const { teacherId, schoolId, className, subject, grade, duration, notes, templateId } = req.body;

// Store in audio_jobs
await pool.execute(
  `INSERT INTO audio_jobs (..., template_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued')`,
  [jobId, teacherId, schoolId, ..., templateId]
);
```

### 4. Add Frontend Status Polling (Frontend)
**File**: `frontend/src/features/uploads/services/job-status.service.ts`

```typescript
export async function pollJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`/api/jobs/${jobId}/status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

// Hook for automatic polling
export function useJobStatus(jobId: string | null) {
  const [status, setStatus] = useState<JobStatus | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      const newStatus = await pollJobStatus(jobId);
      setStatus(newStatus);

      // Stop polling when complete or failed
      if (['completed', 'failed'].includes(newStatus.status)) {
        clearInterval(interval);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [jobId]);

  return status;
}
```

### 5. Update Upload Wizard UI (Frontend)
**File**: `frontend/src/features/uploads/components/UploadWizard.tsx`

After upload succeeds:
```typescript
const [uploadedJobId, setUploadedJobId] = useState<string | null>(null);
const jobStatus = useJobStatus(uploadedJobId);

// After successful upload
const { jobId } = await presignRes.json();
setUploadedJobId(jobId);

// Show status in UI
{jobStatus && (
  <Stack>
    <Progress value={jobStatus.progress.percent} />
    <Text>{jobStatus.progress.message}</Text>
    <Badge>{jobStatus.progress.stage}</Badge>
  </Stack>
)}
```

### 6. Database Schema Updates

Add column to `audio_jobs`:
```sql
ALTER TABLE audio_jobs ADD COLUMN template_id INT NULL;
ALTER TABLE audio_jobs ADD COLUMN analysis_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE audio_jobs ADD INDEX idx_analysis_status (analysis_status);
```

## Implementation Steps

1. ✅ Add database columns
2. ✅ Create job status API endpoint
3. ✅ Update upload route to capture template_id
4. ✅ Update AssemblyAI service to trigger analysis
5. ✅ Create frontend polling service
6. ✅ Update UploadWizard to show progress

## User Experience Flow

**Before:**
1. Upload → "Upload Successful" → redirect
2. ❌ User doesn't know if anything is happening

**After:**
1. Upload → "Uploading... 45%"
2. → "Transcribing audio..."
3. → "Analyzing with [Template Name]..."
4. → "Complete! View results"
5. ✅ User sees exactly what's happening at each stage

## Status Stages

- `queued` - Job created, waiting to process
- `transcribing` - AssemblyAI processing audio
- `analyzing` - AI analyzing transcript with template
- `completed` - All done, results available
- `failed` - Error occurred

## Benefits

✅ **Visibility**: User knows exactly what stage their upload is in
✅ **Confidence**: User sees progress and doesn't worry it's stuck
✅ **Template Integration**: Template selection now actually does something
✅ **Auto-processing**: Analysis starts automatically after transcription
✅ **Better UX**: Professional loading states with real-time updates