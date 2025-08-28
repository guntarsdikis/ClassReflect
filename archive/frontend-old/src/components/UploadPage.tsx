import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './UploadPage.css';

const UploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // For demo purposes, using hardcoded teacher/school IDs
  const teacherId = 1;
  const schoolId = 1;

  // Reset file input
  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFile(null);
    setUploadProgress(0);
    setUploadComplete(false);
    setError(null);
    setJobId(null);
  };

  const handleFileSelect = (selectedFile: File) => {
    // Validate file
    const validExtensions = ['.mp3', '.wav', '.m4a', '.mp4', '.aac', '.ogg', '.wma'];
    const fileName = selectedFile.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
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
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };


  const handleUpload = async () => {
    if (!file || uploading) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);
    
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

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="upload-page">
      <div className="upload-container">
        <h1 className="page-title">Upload Classroom Recording</h1>
        
        {/* Upload Card */}
        <div className="upload-card">
          {!uploadComplete ? (
            <>
              {/* File Selection Area */}
              {!file && (
                <div 
                  className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="drop-zone-content">
                    <div className="upload-icon">📁</div>
                    <h3>Drag & Drop your audio file here</h3>
                    <p className="upload-hint">or</p>
                    <label className="browse-button-label">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*,.mp3,.wav,.m4a,.mp4,.aac,.ogg,.wma"
                        onChange={handleFileInputChange}
                        style={{ display: 'none' }}
                      />
                      <span className="browse-button">Browse Files</span>
                    </label>
                    <p className="file-types">
                      Supported: MP3, WAV, M4A, AAC, OGG (max 500MB)
                    </p>
                  </div>
                </div>
              )}

              {/* File Selected Display */}
              {file && !uploading && (
                <div className="file-selected">
                  <div className="file-info-card">
                    <div className="file-icon">🎵</div>
                    <div className="file-details">
                      <h3 className="file-name">{file.name}</h3>
                      <p className="file-size">
                        Size: {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="action-buttons">
                    <button 
                      className="upload-button"
                      onClick={handleUpload}
                    >
                      Upload & Process
                    </button>
                    <button 
                      className="change-button"
                      onClick={resetFileInput}
                    >
                      Change File
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="upload-progress">
                  <div className="progress-info">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="progress-message">
                    Please wait while your file is being uploaded...
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Upload Success */
            <div className="upload-success">
              <div className="success-icon">✅</div>
              <h2>Upload Successful!</h2>
              <p>Your audio file has been uploaded and queued for processing.</p>
              {jobId && (
                <div className="job-info">
                  <p>Job ID: <code>{jobId}</code></p>
                </div>
              )}
              <p className="processing-info">
                Processing typically takes 2-5 minutes depending on file size.
                You can check the Results page to view the transcript once ready.
              </p>
              <div className="success-actions">
                <button 
                  className="new-upload-button"
                  onClick={resetFileInput}
                >
                  Upload Another File
                </button>
                <a href="/results" className="view-results-link">
                  View Results →
                </a>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>


        {/* Guidelines */}
        <div className="guidelines-card">
          <h2>Recording Guidelines</h2>
          <ul className="guidelines-list">
            <li>Ensure clear audio quality with minimal background noise</li>
            <li>Record entire class sessions for comprehensive analysis</li>
            <li>Position recording device centrally in the classroom</li>
            <li>Test audio levels before starting the full recording</li>
            <li>Typical 45-minute class produces 50-100MB audio file</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;