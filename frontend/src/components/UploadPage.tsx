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
  const [autoUpload, setAutoUpload] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // For demo purposes, using hardcoded teacher/school IDs
  // In production, these would come from authentication
  const teacherId = 1;
  const schoolId = 1;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Accept common audio formats including those without proper MIME types
      const validExtensions = ['.mp3', '.wav', '.m4a', '.mp4', '.aac', '.ogg', '.wma'];
      const fileName = selectedFile.name.toLowerCase();
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
      
      // Check by MIME type or file extension
      const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/m4a', 'audio/mp4', 'audio/x-wav', 'audio/ogg', 'audio/aac'];
      const hasValidType = validTypes.includes(selectedFile.type) || selectedFile.type === '';
      
      if (!hasValidExtension && !hasValidType) {
        setError('Please select a valid audio file (MP3, WAV, M4A, AAC, OGG)');
        return;
      }
      if (selectedFile.size > 500 * 1024 * 1024) {
        setError('File size must be less than 500MB');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setUploadComplete(false);
      setJobId(null);
      setUploadProgress(0);
      
      // Auto-upload if enabled
      if (autoUpload) {
        setTimeout(() => {
          handleUpload(selectedFile);
        }, 500);
      }
    }
  };

  const handleUpload = async (fileToUpload?: File) => {
    const uploadFile = fileToUpload || file;
    if (!uploadFile) {
      setError('Please select a file first');
      return;
    }
    if (uploading) {
      return; // Prevent double-clicks
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('audio', uploadFile);
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
        
        <div className="upload-settings">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={autoUpload}
              onChange={(e) => setAutoUpload(e.target.checked)}
            />
            <span>Auto-upload when file is selected</span>
          </label>
        </div>
        
        <div 
          className={`upload-area ${file ? 'has-file' : ''} ${uploading ? 'uploading' : ''}`}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={(e) => {
            // Only trigger file selection if clicking the empty area, not buttons
            if (!file && e.target === e.currentTarget) {
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.mp4,.aac,.ogg,.wma"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={uploading}
          />
          
          {!file && !uploading && !uploadComplete ? (
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
                <div className="file-actions">
                  <button 
                    className="btn btn-primary" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpload();
                    }}
                    disabled={uploading}
                  >
                    Upload and Analyze
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setError(null);
                      setUploadProgress(0);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    Change File
                  </button>
                </div>
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
            <button 
              className="btn btn-primary"
              onClick={() => {
                setFile(null);
                setUploadComplete(false);
                setUploadProgress(0);
                setJobId(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              Upload Another File
            </button>
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