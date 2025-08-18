import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ResultsPage.css';

interface Job {
  id: string;
  file_name: string;
  status: 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed';
  created_at: string;
  processing_completed_at?: string;
  teacher_name?: string;
  school_name?: string;
  transcript_content?: string;
  score?: number;
  feedback?: string;
  error_message?: string;
}

const ResultsPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  
  // For demo purposes, using hardcoded teacher ID
  // In production, this would come from authentication
  const teacherId = 1;

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/jobs/teacher/${teacherId}`
      );
      
      setJobs(response.data.jobs || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '⏳';
      case 'queued': return '⏳';
      case 'uploading': return '📤';
      case 'pending': return '📋';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'processing': return 'status-processing';
      case 'queued': return 'status-processing';
      case 'uploading': return 'status-processing';
      case 'pending': return 'status-pending';
      case 'failed': return 'status-failed';
      default: return '';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="results-page">
      <div className="card">
        <h1 className="card-title">Analysis Results</h1>
        
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading results...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="no-results">
            <p>No recordings uploaded yet.</p>
            <a href="/upload" className="btn btn-primary">Upload Your First Recording</a>
          </div>
        ) : (
          <div className="jobs-list">
            {jobs.map((job) => (
              <div 
                key={job.id} 
                className={`job-item ${selectedJob?.id === job.id ? 'selected' : ''}`}
                onClick={() => setSelectedJob(job)}
              >
                <div className="job-header">
                  <div className="job-info">
                    <h3>{job.file_name}</h3>
                    <p className="job-date">{formatDate(job.created_at)}</p>
                  </div>
                  <div className={`job-status ${getStatusColor(job.status)}`}>
                    <span className="status-icon">{getStatusIcon(job.status)}</span>
                    <span className="status-text">{job.status}</span>
                  </div>
                </div>
                
                {job.status === 'completed' && job.score && (
                  <div className="job-score">
                    <div className="score-circle">
                      <span className="score-value">{job.score}</span>
                      <span className="score-label">Score</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedJob && selectedJob.status === 'completed' && (
        <div className="card analysis-detail">
          <h2 className="card-title">Job Details</h2>
          
          <div className="analysis-section">
            <h3>📊 Job Information</h3>
            <div className="job-details">
              <p><strong>File:</strong> {selectedJob.file_name}</p>
              <p><strong>Created:</strong> {formatDate(selectedJob.created_at)}</p>
              {selectedJob.processing_completed_at && (
                <p><strong>Completed:</strong> {formatDate(selectedJob.processing_completed_at)}</p>
              )}
              {selectedJob.score && (
                <p><strong>Score:</strong> {selectedJob.score}/100</p>
              )}
            </div>
          </div>

          {selectedJob.feedback && (
            <div className="analysis-section">
              <h3>💡 Feedback</h3>
              <div className="feedback-content">
                {selectedJob.feedback}
              </div>
            </div>
          )}

          {selectedJob.transcript_content && (
            <div className="analysis-section">
              <h3>📝 Transcript</h3>
              <div className="transcript-preview">
                {selectedJob.transcript_content.substring(0, 1000)}
                {selectedJob.transcript_content.length > 1000 && '...'}
              </div>
            </div>
          )}

          {selectedJob.status === 'completed' && !selectedJob.transcript_content && (
            <div className="analysis-section">
              <p className="note">Processing completed but no transcript available yet. This might be added after Whisper processing is implemented.</p>
            </div>
          )}
        </div>
      )}

      {selectedJob && selectedJob.status === 'failed' && selectedJob.error_message && (
        <div className="card error-detail">
          <h2 className="card-title">Error Details</h2>
          <div className="error-content">
            <p><strong>Error:</strong> {selectedJob.error_message}</p>
            <p>Please try uploading the file again or contact support if the problem persists.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;