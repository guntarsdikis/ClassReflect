/**
 * React Hook for Job Status Polling
 * Automatically polls job status and provides real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { jobStatusService, type JobStatusResponse } from '../services/job-status.service';
import { useAuthStore } from '@store/auth.store';

export function useJobStatus(jobId: string | null) {
  const [status, setStatus] = useState<JobStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!jobId || !token) {
      setStatus(null);
      return;
    }

    let active = true;
    setIsPolling(true);
    setError(null);

    // Start polling
    jobStatusService.pollUntilComplete(
      jobId,
      token,
      (newStatus) => {
        if (active) {
          setStatus(newStatus);
        }
      },
      {
        pollInterval: 2000, // Poll every 2 seconds
        maxAttempts: 300    // 10 minutes max
      }
    )
      .then((finalStatus) => {
        if (active) {
          setStatus(finalStatus);
          setIsPolling(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Failed to poll job status');
          setIsPolling(false);
        }
      });

    return () => {
      active = false;
    };
  }, [jobId, token]);

  const refetch = useCallback(async () => {
    if (!jobId || !token) return;

    try {
      const newStatus = await jobStatusService.getJobStatus(jobId, token);
      setStatus(newStatus);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch job status');
    }
  }, [jobId, token]);

  return {
    status,
    error,
    isPolling,
    refetch,
    isComplete: status?.progress.stage === 'completed',
    isFailed: status?.progress.stage === 'failed'
  };
}