import { Pool } from 'mysql2/promise';

/**
 * Analysis Job Cleanup Service
 * Automatically cleans up stuck analysis jobs that have been processing for too long
 */

const TIMEOUT_MINUTES = 30; // Jobs stuck for more than 30 minutes are considered failed
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Run cleanup every 5 minutes

let cleanupInterval: NodeJS.Timeout | null = null;
let pool: Pool;

/**
 * Initialize the cleanup service
 */
export function initializeCleanupService(dbPool: Pool): void {
  pool = dbPool;
  console.log('🧹 Initializing analysis job cleanup service...');

  // On startup, mark any jobs in "processing" state as failed
  // These are likely from a previous server crash/restart
  cleanupOrphanedJobs().catch(err => {
    console.error('❌ Orphaned job cleanup failed:', err);
  });

  // Run normal cleanup immediately on startup
  runCleanup().catch(err => {
    console.error('❌ Initial cleanup failed:', err);
  });

  // Schedule periodic cleanup
  cleanupInterval = setInterval(() => {
    runCleanup().catch(err => {
      console.error('❌ Scheduled cleanup failed:', err);
    });
  }, CLEANUP_INTERVAL_MS);

  console.log(`✅ Cleanup service started (runs every ${CLEANUP_INTERVAL_MS / 60000} minutes)`);
}

/**
 * Stop the cleanup service
 */
export function stopCleanupService(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('🛑 Cleanup service stopped');
  }
}

/**
 * Clean up orphaned jobs from previous server crashes/restarts
 * Any job in "processing" state when the server starts is considered orphaned
 */
async function cleanupOrphanedJobs(): Promise<void> {
  try {
    console.log('🔍 Checking for orphaned jobs from previous session...');

    // Find all jobs currently in processing state
    const [orphanedJobs] = await pool.execute<any[]>(`
      SELECT id, job_id, started_at
      FROM analysis_jobs
      WHERE status = 'processing'
    `);

    if (orphanedJobs.length === 0) {
      console.log('✅ No orphaned jobs found');
      return;
    }

    console.log(`⚠️  Found ${orphanedJobs.length} orphaned analysis jobs, marking as failed...`);

    for (const job of orphanedJobs) {
      console.log(`  - Job ${job.id} was orphaned (started at ${job.started_at})`);
    }

    // Mark orphaned analysis jobs as failed
    await pool.execute(`
      UPDATE analysis_jobs
      SET
        status = 'failed',
        error_message = 'Job stopped - backend service was restarted',
        completed_at = NOW()
      WHERE status = 'processing'
    `);

    // Update corresponding audio_jobs
    await pool.execute(`
      UPDATE audio_jobs aj
      JOIN analysis_jobs ajob ON aj.id = ajob.job_id
      SET
        aj.analysis_status = 'failed',
        aj.analysis_completed_at = NOW()
      WHERE ajob.status = 'failed'
        AND ajob.error_message = 'Job stopped - backend service was restarted'
        AND aj.analysis_status = 'processing'
    `);

    console.log(`✅ Orphaned job cleanup complete: ${orphanedJobs.length} jobs marked as failed`);

  } catch (error) {
    console.error('❌ Orphaned job cleanup error:', error);
    throw error;
  }
}

/**
 * Run cleanup of stuck analysis jobs
 */
async function runCleanup(): Promise<void> {
  try {
    // Find stuck jobs
    const [stuckJobs] = await pool.execute<any[]>(`
      SELECT id, job_id, started_at, TIMESTAMPDIFF(MINUTE, started_at, NOW()) as minutes_stuck
      FROM analysis_jobs
      WHERE status = 'processing'
        AND started_at < NOW() - INTERVAL ${TIMEOUT_MINUTES} MINUTE
    `);

    if (stuckJobs.length === 0) {
      console.log('🧹 Cleanup check: No stuck jobs found');
      return;
    }

    console.log(`⚠️  Found ${stuckJobs.length} stuck analysis jobs, marking as failed...`);

    for (const job of stuckJobs) {
      console.log(`  - Job ${job.id} stuck for ${job.minutes_stuck} minutes`);
    }

    // Mark stuck analysis jobs as failed
    const [result] = await pool.execute(`
      UPDATE analysis_jobs
      SET
        status = 'failed',
        error_message = 'Job timed out - exceeded maximum processing time (${TIMEOUT_MINUTES} minutes)',
        completed_at = NOW()
      WHERE status = 'processing'
        AND started_at < NOW() - INTERVAL ${TIMEOUT_MINUTES} MINUTE
    `);

    // Update corresponding audio_jobs
    await pool.execute(`
      UPDATE audio_jobs aj
      JOIN analysis_jobs ajob ON aj.id = ajob.job_id
      SET
        aj.analysis_status = 'failed',
        aj.analysis_completed_at = NOW()
      WHERE ajob.status = 'failed'
        AND ajob.error_message = 'Job timed out - exceeded maximum processing time (${TIMEOUT_MINUTES} minutes)'
        AND aj.analysis_status = 'processing'
    `);

    console.log(`✅ Cleanup complete: ${(result as any).affectedRows} jobs marked as failed`);

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    throw error;
  }
}

/**
 * Manually trigger cleanup (useful for testing or admin commands)
 */
export async function triggerManualCleanup(): Promise<{ cleaned: number }> {
  await runCleanup();

  // Count how many are still stuck
  const [rows] = await pool.execute<any[]>(`
    SELECT COUNT(*) as count FROM analysis_jobs WHERE status = 'processing'
  `);

  return {
    cleaned: rows[0].count
  };
}