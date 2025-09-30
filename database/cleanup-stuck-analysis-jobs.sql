-- Cleanup script for stuck analysis jobs
-- Run this to clean up jobs that have been stuck in 'processing' for too long
-- Safe to run repeatedly

-- Mark analysis jobs stuck for more than 30 minutes as failed
UPDATE analysis_jobs
SET
  status = 'failed',
  error_message = 'Job timed out - exceeded maximum processing time (30 minutes)',
  completed_at = NOW()
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL 30 MINUTE;

-- Update audio_jobs to reflect the status of their MOST RECENT analysis job
UPDATE audio_jobs aj
JOIN (
  SELECT
    job_id,
    MAX(created_at) as latest_created_at
  FROM analysis_jobs
  GROUP BY job_id
) latest ON aj.id = latest.job_id
JOIN analysis_jobs ajob ON ajob.job_id = latest.job_id
  AND ajob.created_at = latest.latest_created_at
SET
  aj.analysis_status = ajob.status,
  aj.analysis_completed_at = CASE
    WHEN ajob.status IN ('completed', 'failed') THEN ajob.completed_at
    ELSE aj.analysis_completed_at
  END
WHERE ajob.status IN ('completed', 'failed')
  AND aj.analysis_status IN ('processing', 'queued');

-- Report
SELECT
  'Cleanup complete' as status,
  (SELECT COUNT(*) FROM analysis_jobs WHERE status = 'processing') as still_processing,
  (SELECT COUNT(*) FROM audio_jobs WHERE analysis_status = 'processing') as audio_jobs_processing;