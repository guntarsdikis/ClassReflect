import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const user = useAuthStore((state) => state.user);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await authService.login(email, password);
    
    if (result.success) {
      // Redirect based on role
      switch (result.user?.role) {
        case 'super_admin':
          navigate('/admin');
          break;
        case 'school_manager':
          navigate('/upload');
          break;
        case 'teacher':
          navigate('/results');
          break;
        default:
          navigate('/');
      }
    } else {
      setError(result.error || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>ClassReflect</h1>
          <p>Classroom Audio Analysis Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <h2>Sign In</h2>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@school.edu"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="forgot-link">
              Forgot password?
            </Link>
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p className="info-text">
            No registration available. Accounts are created by your school administrator.
          </p>
          <p className="terms-text">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;