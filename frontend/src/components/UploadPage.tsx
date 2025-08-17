import React, { useState, useRef } from 'react';
import axios from 'axios';
import './UploadPage.css';

const UploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // For demo purposes, using hardcoded teacher/school IDs
  // In production, these would come from authentication
  const teacherId = 1;
  const schoolId = 1;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/x-m4a'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please select a valid audio file (MP3, WAV, or M4A)');
        return;
      }
      if (selectedFile.size > 500 * 1024 * 1024) {
        setError('File size must be less than 500MB');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setUploadComplete(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('teacherId', teacherId.toString());
    formData.append('schoolId', schoolId.toString());

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/upload/direct`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setUploadProgress(progress);
          },
        }
      );

      setUploadComplete(true);
      setUploading(false);
      setUploadProgress(100);
      setJobId(response.data.jobId);
      
      // Store job ID for tracking
      if (response.data.jobId) {
        localStorage.setItem('lastJobId', response.data.jobId);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const event = {
        target: { files: [droppedFile] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(event);
    }
  };

  return (
    <div className="upload-page">
      <div className="card">
        <h1 className="card-title">Upload Classroom Recording</h1>
        
        <div 
          className={`upload-area ${file ? 'has-file' : ''}`}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mp3,audio/mpeg,audio/wav,audio/x-m4a"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          {!file ? (
            <>
              <div className="upload-icon">📁</div>
              <p className="upload-text">
                Drag and drop your audio file here, or click to browse
              </p>
              <p className="upload-hint">
                Supported formats: MP3, WAV, M4A (max 500MB)
              </p>
            </>
          ) : (
            <>
              <div className="file-info">
                <div className="file-icon">🎵</div>
                <div className="file-details">
                  <p className="file-name">{file.name}</p>
                  <p className="file-size">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              {!uploading && !uploadComplete && (
                <button className="btn btn-primary" onClick={handleUpload}>
                  Upload and Analyze
                </button>
              )}
            </>
          )}
        </div>

        {uploading && (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="progress-text">{uploadProgress}% uploaded</p>
          </div>
        )}

        {uploadComplete && (
          <div className="success-message">
            <div className="success-icon">✅</div>
            <h3>Upload Successful!</h3>
            <p>Your audio is being processed. This typically takes 5-10 minutes.</p>
            {jobId && (
              <p className="job-id">Job ID: <code>{jobId}</code></p>
            )}
            <p>You can check the results page to track progress.</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">Recording Guidelines</h2>
        <ul className="guidelines">
          <li>Ensure clear audio quality with minimal background noise</li>
          <li>Record entire class sessions for comprehensive analysis</li>
          <li>Position recording device centrally in the classroom</li>
          <li>Test audio levels before starting the full recording</li>
          <li>Typical 45-minute class produces 50-100MB audio file</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadPage;