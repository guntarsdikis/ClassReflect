import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ResultsPage.css';

interface Job {
  id: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  transcript?: string;
  analysis?: {
    strengths: string[];
    improvements: string[];
    score: number;
  };
}

const ResultsPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      // Mock data for demonstration
      const mockJobs: Job[] = [
        {
          id: '1',
          fileName: 'classroom_session_monday.mp3',
          status: 'completed',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          completedAt: new Date().toISOString(),
          transcript: 'Sample transcript of the classroom session...',
          analysis: {
            strengths: [
              'Clear communication and instruction',
              'Good student engagement techniques',
              'Effective use of questioning'
            ],
            improvements: [
              'Could increase wait time after questions',
              'Consider more varied teaching methods',
              'Encourage more student-to-student interaction'
            ],
            score: 82
          }
        },
        {
          id: '2',
          fileName: 'classroom_session_tuesday.mp3',
          status: 'processing',
          createdAt: new Date(Date.now() - 600000).toISOString()
        },
        {
          id: '3',
          fileName: 'classroom_session_wednesday.mp3',
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      ];
      
      setJobs(mockJobs);
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
      case 'pending': return '📋';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'processing': return 'status-processing';
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
                    <h3>{job.fileName}</h3>
                    <p className="job-date">{formatDate(job.createdAt)}</p>
                  </div>
                  <div className={`job-status ${getStatusColor(job.status)}`}>
                    <span className="status-icon">{getStatusIcon(job.status)}</span>
                    <span className="status-text">{job.status}</span>
                  </div>
                </div>
                
                {job.status === 'completed' && job.analysis && (
                  <div className="job-score">
                    <div className="score-circle">
                      <span className="score-value">{job.analysis.score}</span>
                      <span className="score-label">Score</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedJob && selectedJob.status === 'completed' && selectedJob.analysis && (
        <div className="card analysis-detail">
          <h2 className="card-title">Detailed Analysis</h2>
          
          <div className="analysis-section">
            <h3>📈 Teaching Strengths</h3>
            <ul className="analysis-list">
              {selectedJob.analysis.strengths.map((strength, index) => (
                <li key={index}>{strength}</li>
              ))}
            </ul>
          </div>

          <div className="analysis-section">
            <h3>💡 Areas for Improvement</h3>
            <ul className="analysis-list">
              {selectedJob.analysis.improvements.map((improvement, index) => (
                <li key={index}>{improvement}</li>
              ))}
            </ul>
          </div>

          <div className="analysis-section">
            <h3>📝 Transcript Preview</h3>
            <div className="transcript-preview">
              {selectedJob.transcript?.substring(0, 500)}...
            </div>
            <button className="btn btn-secondary">Download Full Transcript</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;