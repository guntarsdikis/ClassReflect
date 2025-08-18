import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <div className="hero-section">
        <h1 className="hero-title">Welcome to ClassReflect</h1>
        <p className="hero-subtitle">
          Transform your teaching with AI-powered classroom audio analysis
        </p>
        <div className="hero-buttons">
          <Link to="/upload" className="btn btn-primary">
            Upload Audio
          </Link>
          <Link to="/results" className="btn btn-secondary">
            View Results
          </Link>
        </div>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">🎙️</div>
          <h3>Audio Recording Analysis</h3>
          <p>Upload classroom recordings for comprehensive analysis of teaching practices</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🤖</div>
          <h3>AI-Powered Insights</h3>
          <p>Leverage advanced AI to identify teaching patterns and improvement areas</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>Detailed Reports</h3>
          <p>Receive actionable feedback with specific recommendations for improvement</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📈</div>
          <h3>Track Progress</h3>
          <p>Monitor your teaching evolution over time with historical comparisons</p>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Upload Recording</h4>
              <p>Upload your classroom audio recording (MP3, WAV, or M4A)</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>AI Processing</h4>
              <p>Our AI transcribes and analyzes your teaching methods</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Get Insights</h4>
              <p>Receive detailed feedback and improvement suggestions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;